import * as React from "react";
import { render } from "@react-email/render";
import { TEMPLATES } from "./registry";

// Server-only. Sends the Hub's transactional email.
//
// Provider is chosen with EMAIL_PROVIDER:
//   - "resend" (default): Resend's HTTP API (RESEND_API_KEY)
//   - "log": writes the message to the server log instead of sending (local dev)
// Swapping to Azure Communication Services or an SMTP relay means adding one
// function below; callers don't change.
//
// EMAIL_REDIRECT_TO (optional) sends every message to one inbox instead of the
// real recipient, with the intended recipient in the subject. Use it on any
// non-production copy of the Hub.

const SITE_NAME = "Team Huntington Hub";

export type SendTemplateEmailResult = { sent: true } | { sent: false; reason: "recipient_suppressed" };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, unknown>;
  /** Dedupes retries of the same logical send. */
  idempotencyKey?: string;
  replyTo?: string;
  /** Prepended to the rendered subject (e.g. "[TEST] " for sample sends). */
  subjectPrefix?: string;
}

interface OutgoingEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
  tag: string;
}

async function sendWithResend(msg: OutgoingEmail, setting: (n: string) => string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${setting("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": msg.idempotencyKey.slice(0, 256),
    },
    body: JSON.stringify({
      from: msg.from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      tags: [{ name: "template", value: msg.tag.replace(/[^a-zA-Z0-9_-]/g, "_") }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Email send failed (${res.status}): ${detail.slice(0, 200)}`);
  }
}

/** Renders a registered template and sends it. Any failure throws. */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const { setting } = await import("@/server/runtime");

  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`);
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const intended = template.to || to;
  if (!intended) throw new Error("Recipient is required (the template defines no fixed recipient)");

  const templateData = options.templateData ?? {};
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const baseSubject = typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  const redirect = setting("EMAIL_REDIRECT_TO", { optional: true });
  const msg: OutgoingEmail = {
    to: redirect || intended,
    from: setting("EMAIL_FROM", { optional: true }) || `${SITE_NAME} <hub@send.madebyaspire.com>`,
    subject: `${redirect ? `[to ${intended}] ` : ""}${options.subjectPrefix ?? ""}${baseSubject}`,
    html,
    text,
    replyTo: options.replyTo,
    idempotencyKey: options.idempotencyKey || crypto.randomUUID(),
    tag: templateName,
  };

  const provider = setting("EMAIL_PROVIDER", { optional: true }) ?? "resend";
  if (provider === "log") {
    console.log(`[email] ${msg.to} · ${msg.subject}`);
  } else if (provider === "resend") {
    await sendWithResend(msg, (n) => setting(n));
  } else {
    throw new Error(`Unknown EMAIL_PROVIDER "${provider}"`);
  }
  return { sent: true };
}
