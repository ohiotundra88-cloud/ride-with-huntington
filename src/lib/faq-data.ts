export type FAQCategory =
  | "Registration"
  | "Travel"
  | "Bike Rental"
  | "Apparel"
  | "Fundraising"
  | "Ride Weekend"
  | "Volunteers"
  | "Expense Reports";

// FAQ articles live in the `faqs` table (see src/lib/faqs.functions.ts and the
// admin FAQ manager). This module only defines the fixed categories.

export const faqCategories: FAQCategory[] = [
  "Registration",
  "Travel",
  "Bike Rental",
  "Apparel",
  "Fundraising",
  "Ride Weekend",
  "Volunteers",
  "Expense Reports",
];
