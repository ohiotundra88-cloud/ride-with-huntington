import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MESSAGE_CATEGORIES,
  MESSAGE_PRIORITIES,
  normalizeAudience,
  validateMessageDraft,
  type AudienceOptions,
  type AudiencePerson,
  type InboxMessage,
  type MessageRecipientRow,
  type MessageSummary,
  type MessagingAccess,
} from "@/lib/messages.shared";
import {
  accessFromRoles,
  assertAudienceAllowed,
  audienceOptionsFrom,
  buildAudienceRoster,
  deliverMessage,
  loadRoles,
  mapMessageRow,
  requireSender,
  resolveAudience,
} from "@/lib/messages.server";

/** Whether the signed-in user may compose and send team messages. */
export const getMessagingAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessagingAccess> =>
    accessFromRoles(await loadRoles(context.supabase, context.userId)),
  );

/** Distinct roles, tags, sub-pelotons and routes available for targeting. */
export const getAudienceOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AudienceOptions> => {
    await requireSender(context.supabase, context.userId);
    return audienceOptionsFrom(await buildAudienceRoster());
  });

/** Live recipient count and preview list for a set of audience rules. */
export const previewAudience = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audience: unknown }) => ({
    audience: normalizeAudience(input?.audience),
  }))
  .handler(async ({ data, context }): Promise<{ count: number; people: AudiencePerson[] }> => {
    const access = await requireSender(context.supabase, context.userId);
    assertAudienceAllowed(access, data.audience.roles);
    const people = resolveAudience(await buildAudienceRoster(), data.audience);
    return { count: people.length, people };
  });

/** Everyone on the roster, for the individual include/exclude picker. */
export const listRosterPeople = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AudiencePerson[]> => {
    await requireSender(context.supabase, context.userId);
    return (await buildAudienceRoster()).sort((a, b) => a.name.localeCompare(b.name));
  });

/** Drafts, scheduled and sent messages with read counts, newest first. */
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessageSummary[]> => {
    await requireSender(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: reads } = await context.supabase
      .from("message_recipients")
      .select("message_id, read_at");
    const readCounts = new Map<string, number>();
    for (const r of (reads ?? []) as { message_id: string; read_at: string | null }[]) {
      if (r.read_at) readCounts.set(r.message_id, (readCounts.get(r.message_id) ?? 0) + 1);
    }

    return (data ?? []).map((row) =>
      mapMessageRow(row as Record<string, unknown>, readCounts.get(String(row.id)) ?? 0),
    );
  });

/** Creates or updates a draft/scheduled message. Sent messages are immutable. */
export const saveMessage = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string | null;
      title: string;
      body: string;
      ctaLabel?: string;
      ctaHref?: string;
      priority: string;
      category: string;
      scheduledAt?: string | null;
      audience: unknown;
      emailNotify?: boolean;
      emailExcludeUserIds?: unknown;
    }) => {
      const draft = {
        title: String(input?.title ?? "").trim(),
        body: String(input?.body ?? "").trim(),
        ctaLabel: String(input?.ctaLabel ?? "").trim(),
        ctaHref: String(input?.ctaHref ?? "").trim(),
      };
      const problem = validateMessageDraft(draft);
      if (problem) throw new Error(problem);

      const priority = MESSAGE_PRIORITIES.includes(input?.priority as never)
        ? String(input.priority)
        : "info";
      const category = MESSAGE_CATEGORIES.includes(input?.category as never)
        ? String(input.category)
        : "general";
      const scheduledAt = input?.scheduledAt ? new Date(input.scheduledAt) : null;
      if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
        throw new Error("The schedule date is not valid.");
      }

      return {
        id: input?.id ? String(input.id) : null,
        ...draft,
        priority,
        category,
        scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        audience: normalizeAudience(input?.audience),
        emailNotify: input?.emailNotify === true,
        emailExcludeUserIds: Array.isArray(input?.emailExcludeUserIds)
          ? input.emailExcludeUserIds.map((x) => String(x)).filter(Boolean)
          : [],
      };
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const access = await requireSender(context.supabase, context.userId);
    assertAudienceAllowed(access, data.audience.roles);

    const email = String((context.claims as { email?: string } | null)?.email ?? "");
    const payload = {
      title: data.title,
      body: data.body,
      cta_label: data.ctaLabel,
      cta_href: data.ctaHref,
      priority: data.priority,
      category: data.category,
      status: data.scheduledAt ? "scheduled" : "draft",
      scheduled_at: data.scheduledAt,
      audience: data.audience as never,
      email_notify: data.emailNotify,
      email_exclude_user_ids: data.emailExcludeUserIds as never,
    };

    if (data.id) {
      const { data: existing } = await context.supabase
        .from("messages")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      if (existing?.status === "sent") throw new Error("A sent message can't be edited.");

      const { error } = await context.supabase.from("messages").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      await context.supabase
        .from("message_audit")
        .insert({ message_id: data.id, action: "updated", actor_email: email, details: {} });
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("messages")
      .insert({ ...payload, created_by: context.userId, created_by_email: email })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("message_audit")
      .insert({ message_id: created.id, action: "created", actor_email: email, details: {} });
    return { id: String(created.id) };
  });

/** Resolves the audience and writes recipient rows immediately. */
export const sendMessageNow = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("A message is required.");
    return { id };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{
    recipientCount: number;
    emailsSent: number;
    emailsSkipped: number;
  }> => {
    await requireSender(context.supabase, context.userId);
    const email = String((context.claims as { email?: string } | null)?.email ?? "");
    return deliverMessage(context.supabase, data.id, email);
  });

/** Colleagues permanently excluded from announcement emails. */
export const listEmailOptOuts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ userId: string; name: string; email: string }[]> => {
    await requireSender(context.supabase, context.userId);
    const roster = await buildAudienceRoster();
    return roster
      .filter((p) => p.emailOptOut)
      .map((p) => ({ userId: p.userId, name: p.name, email: p.email }));
  });

/** Adds or removes someone from the permanent no-email list (leadership only). */
export const setEmailOptOut = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; optOut: boolean }) => {
    const userId = String(input?.userId ?? "").trim();
    if (!userId) throw new Error("A person is required.");
    return { userId, optOut: input?.optOut === true };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const access = await requireSender(context.supabase, context.userId);
    if (!access.canTargetLeadership) {
      throw new Error("Only co-chairs and super users can change the no-email list.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ email_opt_out: data.optOut })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Sends any scheduled message whose time has arrived. */
export const processDueMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sent: number }> => {
    const access = accessFromRoles(await loadRoles(context.supabase, context.userId));
    if (!access.allowed) return { sent: 0 };

    const { data } = await context.supabase
      .from("messages")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    let sent = 0;
    for (const row of (data ?? []) as { id: string }[]) {
      try {
        await deliverMessage(context.supabase, row.id, "scheduler");
        sent += 1;
      } catch {
        // A single bad audience must not block the rest of the queue.
      }
    }
    return { sent };
  });

/** Super-user-only removal of a message and its recipient rows. */
export const deleteMessage = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("A message is required.");
    return { id };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const access = await requireSender(context.supabase, context.userId);
    if (!access.canDelete) throw new Error("Only super users can delete a message.");
    const { error } = await context.supabase.from("messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Who received a message and whether they've read it. */
export const listMessageRecipients = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("A message is required.");
    return { id };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<MessageRecipientRow[]> => {
    await requireSender(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("message_recipients")
      .select("user_id, name, email, read_at")
      .eq("message_id", data.id)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      userId: String(r.user_id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      readAt: (r.read_at as string | null) ?? null,
    }));
  });

/** The signed-in user's own message inbox. */
export const listMyMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InboxMessage[]> => {
    const { data, error } = await context.supabase
      .from("message_recipients")
      .select(
        "read_at, dismissed_at, messages!inner(id, title, body, cta_label, cta_href, priority, category, status, sent_at, created_by_email)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row) => {
        const m = (row as { messages: Record<string, unknown> }).messages;
        return {
          id: String(m["id"]),
          title: String(m["title"] ?? ""),
          body: String(m["body"] ?? ""),
          ctaLabel: String(m["cta_label"] ?? ""),
          ctaHref: String(m["cta_href"] ?? ""),
          priority: String(m["priority"] ?? "info") as InboxMessage["priority"],
          category: String(m["category"] ?? "general") as InboxMessage["category"],
          sentAt: (m["sent_at"] as string | null) ?? null,
          readAt: ((row as { read_at: string | null }).read_at) ?? null,
          dismissedAt: ((row as { dismissed_at: string | null }).dismissed_at) ?? null,
          fromEmail: String(m["created_by_email"] ?? ""),
          status: String(m["status"] ?? "sent"),
        };
      })
      .filter((m) => m.status === "sent")
      .map(({ status: _status, ...m }) => m);
  });

/** Marks or dismisses the caller's own copy of a message. */
export const updateMyMessageState = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; read?: boolean; dismissed?: boolean }) => {
    const id = String(input?.id ?? "").trim();
    if (!id) throw new Error("A message is required.");
    return { id, read: input?.read === true, dismissed: input?.dismissed === true };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const now = new Date().toISOString();
    if (!data.read && !data.dismissed) return { ok: true };
    const patch = {
      ...(data.read ? { read_at: now } : {}),
      ...(data.dismissed ? { dismissed_at: now } : {}),
    };

    const { error } = await context.supabase
      .from("message_recipients")
      .update(patch)
      .eq("message_id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
