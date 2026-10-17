/**
 * Unguessable placeholder password for accounts created on a colleague's
 * behalf. Nobody knows it: the colleague activates with an emailed passcode
 * and chooses their own password on first sign-in.
 */
export function placeholderPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `Rnd!${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function assertSuper(context: { supabase: unknown; userId: string }) {
  const { assertSuperUser } = await import("@/lib/roles-admin.server");
  await assertSuperUser(context as never);
}
