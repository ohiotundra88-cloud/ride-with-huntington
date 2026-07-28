export type FAQCategory =
  | "Registration" | "Travel" | "Bike Rental" | "Apparel"
  | "Fundraising" | "Ride Weekend" | "Volunteers" | "Expense Reports";

export interface FAQArticle {
  id: string;
  title: string;
  category: FAQCategory;
  keywords: string[];
  body: string;
}

export const faqs: FAQArticle[] = [
  { id: "reg-1", title: "How do I register for Team Huntington?", category: "Registration",
    keywords: ["register", "sign up", "team"], body: "Use the Team Huntington Hub to be guided through registration. You'll select participation type, apply the team discount code, and confirm on Pelotonia's site." },
  { id: "reg-2", title: "What is the Team Huntington discount code?", category: "Registration",
    keywords: ["discount", "code", "promo"], body: "Your unique team code appears on the registration step. Copy it and paste it into the Pelotonia registration page." },
  { id: "reg-3", title: "Can I change from Volunteer to Rider later?", category: "Registration",
    keywords: ["change", "switch", "role"], body: "Yes. Return to the Hub and edit your registration. Some downstream steps (bike rental, jersey) will appear once you switch to Rider." },
  { id: "reg-4", title: "Is there a registration deadline?", category: "Registration",
    keywords: ["deadline", "date"], body: "Team Huntington registration closes 30 days before Ride Weekend. Travel and apparel deadlines are earlier — see your dashboard." },
  { id: "reg-5", title: "Where can I see my confirmation number?", category: "Registration",
    keywords: ["confirmation", "number", "receipt"], body: "After completing Pelotonia registration, enter the confirmation number in the Hub. You can also view it on your dashboard and confirmation email." },

  { id: "trv-1", title: "How do I book travel through Concur / ATG?", category: "Travel",
    keywords: ["concur", "atg", "book", "flight"], body: "Use the Travel step in the Hub. Click 'Open Concur / ATG' to launch the corporate travel tool. Return to the Hub and enter your confirmation number." },
  { id: "trv-2", title: "Is Huntington paying for my hotel?", category: "Travel",
    keywords: ["hotel", "pay", "reimburse"], body: "Approved lodging for Ride Weekend is reimbursable per Team Huntington policy. See the Expense Guide for details." },
  { id: "trv-3", title: "What if I need to arrive early?", category: "Travel",
    keywords: ["early", "extra night"], body: "Add a note in the Travel step. Additional nights may require manager approval." },
  { id: "trv-4", title: "Can I book my own flight?", category: "Travel",
    keywords: ["own", "flight", "reimburse"], body: "Corporate policy requires Concur / ATG for reimbursement. Contact Support if you have an exception." },
  { id: "trv-5", title: "What is the arrival window for Ride Weekend?", category: "Travel",
    keywords: ["arrival", "window", "check-in"], body: "Riders should arrive by Friday afternoon for packet pickup. Volunteers per role assignment." },

  { id: "bk-1", title: "How do I rent a bike?", category: "Bike Rental",
    keywords: ["bike", "rent", "unlimited"], body: "In the Bike step, choose Yes, enter your specs, and open Unlimited Biking. Return to the Hub with your confirmation." },
  { id: "bk-2", title: "What size bike should I choose?", category: "Bike Rental",
    keywords: ["size", "fit", "height"], body: "Enter your height and use Unlimited Biking's sizing guide. When in doubt, choose one size up for comfort." },
  { id: "bk-3", title: "Are helmets provided?", category: "Bike Rental",
    keywords: ["helmet", "safety"], body: "Helmets are strongly recommended and can be added to your rental." },
  { id: "bk-4", title: "Can I bring my own bike?", category: "Bike Rental",
    keywords: ["own", "bring"], body: "Yes. Select 'No' on the Bike Rental step. Follow Pelotonia's bike shipping / drop-off guidance." },

  { id: "ap-1", title: "How do jersey sizes run?", category: "Apparel",
    keywords: ["jersey", "size", "fit"], body: "Cycling jerseys run one size smaller than everyday shirts. Consider sizing up if between sizes." },
  { id: "ap-2", title: "When will I receive my apparel?", category: "Apparel",
    keywords: ["ship", "receive", "delivery"], body: "Apparel ships 2–3 weeks before Ride Weekend to the address you confirm in the Hub." },
  { id: "ap-3", title: "Can I change my size after submitting?", category: "Apparel",
    keywords: ["change", "size"], body: "You can edit your registration until the apparel deadline shown on your dashboard." },

  { id: "fr-1", title: "What is the Team Huntington fundraising minimum?", category: "Fundraising",
    keywords: ["fundraise", "minimum", "goal"], body: "Minimums vary by route. See your Pelotonia rider profile for your goal. Huntington matches up to a set amount — see policy." },
  { id: "fr-2", title: "Does Huntington match my fundraising?", category: "Fundraising",
    keywords: ["match", "corporate"], body: "Yes, per current match policy. Submit your match request through the internal giving portal." },

  { id: "rw-1", title: "What should I bring to Ride Weekend?", category: "Ride Weekend",
    keywords: ["checklist", "pack"], body: "See the Ride Weekend Checklist: jersey, helmet, ID, hydration, sunscreen, and Team Huntington gear." },
  { id: "rw-2", title: "Where is packet pickup?", category: "Ride Weekend",
    keywords: ["packet", "pickup", "expo"], body: "Packet pickup is at the Pelotonia Expo. Times are shared closer to the event." },
  { id: "rw-3", title: "Is there a Team Huntington gathering?", category: "Ride Weekend",
    keywords: ["gathering", "meet", "team"], body: "Yes — a team breakfast is hosted Saturday morning. Location shared via confirmation email." },

  { id: "vol-1", title: "What do volunteers do at Ride Weekend?", category: "Volunteers",
    keywords: ["volunteer", "role", "shift"], body: "Volunteers staff rest stops, cheer stations, packet pickup, and finish line hospitality." },
  { id: "vol-2", title: "Do volunteers get shirts?", category: "Volunteers",
    keywords: ["shirt", "apparel", "volunteer"], body: "Yes — enter your volunteer shirt size in the Apparel step." },

  { id: "ex-1", title: "How do I submit Pelotonia expenses?", category: "Expense Reports",
    keywords: ["expense", "concur", "submit"], body: "Follow the Expense Guide in the Hub. Use the 'Team Huntington Pelotonia' cost center and attach receipts over $25." },
  { id: "ex-2", title: "What expenses are reimbursable?", category: "Expense Reports",
    keywords: ["reimburse", "eligible"], body: "Approved travel, lodging, and meals within per-diem. Personal fundraising donations are not reimbursable." },
  { id: "ex-3", title: "What if I lost a receipt?", category: "Expense Reports",
    keywords: ["missing", "receipt", "lost"], body: "Attach a Missing Receipt Affidavit in Concur. Include vendor, date, and business purpose." },
  { id: "ex-4", title: "How long does approval take?", category: "Expense Reports",
    keywords: ["approval", "time", "status"], body: "Most reports are approved within 5–7 business days. Track status in Concur Expense." },
];

export const faqCategories: FAQCategory[] = [
  "Registration", "Travel", "Bike Rental", "Apparel",
  "Fundraising", "Ride Weekend", "Volunteers", "Expense Reports",
];
