/** Shared UI/server validation. Supabase also enforces this in the database. */
export function isHuntingtonEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^@\s]+@huntington\.com$/i.test(email.trim());
}

export function requireConfirmedHuntingtonUser(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
} | null | undefined): string {
  if (!isHuntingtonEmail(user?.email)) {
    throw new Error("Only @huntington.com addresses are accepted.");
  }
  if (!user?.email_confirmed_at) {
    throw new Error("Verify the code emailed to your Huntington address before continuing.");
  }
  return user.email.trim().toLowerCase();
}
