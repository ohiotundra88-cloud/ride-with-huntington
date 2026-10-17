/**
 * Short, stable fingerprint of selected fields of a content item: a 32-bit
 * FNV-1a hash of their JSON, as 8 hex characters. Used to recognise stored
 * copies of known default content without keeping that content in the code.
 */
export function contentFingerprint(
  item: Record<string, unknown>,
  fields: readonly string[],
): string {
  const text = JSON.stringify(fields.map((f) => item[f] ?? null));
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
