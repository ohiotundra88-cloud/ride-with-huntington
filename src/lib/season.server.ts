/** Same deterministic demo password the sign-in screen derives from the email. */
export const demoPassword = (email: string) => `Hub!${email.trim().toLowerCase()}#2027`;

export async function assertSuper(context: { supabase: unknown; userId: string }) {
  const { assertSuperUser } = await import("@/lib/roles-admin.server");
  await assertSuperUser(context as never);
}
