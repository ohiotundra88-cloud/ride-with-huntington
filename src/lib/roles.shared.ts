export const MANAGEABLE_ROLES = [
  "superuser",
  "captain",
  "vendor_captain",

  "legal",
  "risk",
  "compliance",
  "marketing",
  "cochair",
] as const;

export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];
