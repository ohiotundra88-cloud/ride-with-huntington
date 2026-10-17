/**
 * Escapes LIKE/ILIKE wildcards so `.ilike("email", exactEmail(x))` matches the
 * address exactly (case-insensitive). Without this, "_" in an address acts as
 * a one-character wildcard and can match a different colleague.
 */
export function exactEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Escapes user search text for a contains-style ILIKE pattern. */
export function containsPattern(text: string): string {
  return `%${exactEmail(text)}%`;
}
