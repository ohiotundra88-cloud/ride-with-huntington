import { z } from "zod";

/**
 * Everything on the Register page that a Super User can change: wording,
 * per-field visibility/required flags, choice lists, and outbound links.
 * Stored as one JSON blob in public.register_content (single row, id = 1).
 */

export interface RegisterOption {
  value: string;
  label: string;
  desc?: string;
}

export interface RegisterField {
  label: string;
  visible: boolean;
  required: boolean;
}

export interface RegisterLink {
  label: string;
  url: string;
}

export interface RegisterContent {
  text: Record<string, string>;
  fields: Record<string, RegisterField>;
  lists: Record<string, RegisterOption[]>;
  links: Record<string, RegisterLink>;
}

const optionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  desc: z.string().optional(),
});

export const registerContentSchema = z.object({
  text: z.record(z.string()),
  fields: z.record(z.object({ label: z.string(), visible: z.boolean(), required: z.boolean() })),
  lists: z.record(z.array(optionSchema).min(1)),
  links: z.record(z.object({ label: z.string(), url: z.string() })),
});

const f = (label: string, required = false, visible = true): RegisterField => ({ label, visible, required });

export const DEFAULT_REGISTER_CONTENT: RegisterContent = {
  text: {
    "step.A": "Participation",
    "step.B": "Pelotonia",
    "step.C": "Travel",
    "step.D": "Bike",
    "step.E": "Apparel",
    "step.F": "Review",
    "top.autosave": "Autosaved as you go. You can leave and return anytime.",
    "btn.back": "Back",
    "btn.next": "Next",
    "btn.submit": "Complete Registration",

    "A.title": "How would you like to participate?",

    "B.card1Title": "Team Huntington Peloton",
    "B.instructionsTitle": "Register on Pelotonia:",
    "B.instr1": "Choose Team Huntington as your peloton.",
    "B.instr2": "Select your event type (25/45/55/100/155/200 miles or Volunteer).",
    "B.instr3": "Apply the discount code below at checkout.",
    "B.discountLabel": "Team discount code",
    "B.discountCode": "Huntington",
    "B.card2Title": "After you register",
    "B.hbHelp": "Required for team rostering and expense matching.",
    "B.completedLabel": "I completed registration on Pelotonia.",
    "B.designationsTitle": "Pelotonia designations",
    "B.highRollerTitle": "High Roller",
    "B.highRollerDesc": "I've committed to raise at or above the High Roller fundraising level.",
    "B.survivorTitle": "Survivor",
    "B.survivorDesc": "I'm riding or volunteering as a cancer survivor.",
    "B.colleagueTitle": "Colleague details",
    "B.saveBtn": "Save status",

    "C.title": "Do you need travel or hotel?",
    "C.tripTitle": "Trip details",
    "C.confirmTitle": "Confirmations",
    "C.bookLater": "Book later — remind me",
    "C.saveBtn": "Save travel",

    "D.title": "Rent a bike?",
    "D.specsTitle": "Rider specs",
    "D.rentalConfTitle": "Rental confirmation",
    "D.saveBtn": "Save bike info",

    "E.riderTitle": "Rider apparel",
    "E.volTitle": "Volunteer apparel",
    "E.mailTitle": "Mailing address",
    "E.sizeGuideBtn": "Size guide",
    "E.sizeGuideTitle": "Size guide",
    "E.sizeGuideNote": "Cycling jerseys run one size smaller than everyday shirts. When in doubt, size up.",
    "E.sizeGuideCol1": "Size",
    "E.sizeGuideCol2": "Chest (in)",
    "E.addrConfirm": "I confirm this address is current.",
    "E.saveBtn": "Save apparel & mailing",

    "F.missingTitle": "Missing required items:",
    "F.colleagueTitle": "Colleague",
    "F.participationTitle": "Participation",
    "F.pelotoniaTitle": "Pelotonia",
    "F.travelTitle": "Travel",
    "F.bikeTitle": "Bike",
    "F.apparelTitle": "Apparel & mailing",
  },
  fields: {
    // Step B
    confirmation: f("Pelotonia Public/Rider ID"),
    hbNumber: f("Huntington Bank HB number", true),
    completed: f("Completed on Pelotonia"),
    highRoller: f("High Roller"),
    survivor: f("Survivor"),
    employmentType: f("Are you a Salary or Hourly colleague?", true),
    payGrade74Below: f("Are you a pay grade 74 and below?", true),
    // Step C
    departureCity: f("Departure city"),
    arrivalDate: f("Arrival date"),
    departureDate: f("Departure date"),
    hotelCheckIn: f("Hotel check-in"),
    hotelCheckOut: f("Hotel check-out"),
    travelNotes: f("Accessibility / travel notes"),
    travelConfirmation: f("Travel confirmation #"),
    hotelConfirmation: f("Hotel confirmation #"),
    hotelName: f("Hotel name"),
    arrivalTime: f("Arrival time"),
    departureTime: f("Departure time"),
    bookLater: f("Book later"),
    // Step D
    height: f("Height", true),
    bikeSize: f("Preferred bike size", true),
    bikeType: f("Bike type", true),
    pedals: f("Pedal preference", true),
    helmet: f("Helmet needed"),
    pickupDate: f("Pickup date", true),
    returnDate: f("Return date", true),
    bikeConfirmation: f("Confirmation number"),
    // Step E
    jerseySize: f("Jersey size", true),
    jerseyStyle: f("Jersey style", true),
    shirtSize: f("Shirt size", true),
    cut: f("Cut", true),
    volunteerShirtSize: f("Shirt size", true),
    volunteerCut: f("Cut", true),
    addrName: f("Name", true),
    street: f("Street", true),
    unit: f("Unit / Apt"),
    city: f("City", true),
    state: f("State", true),
    zip: f("ZIP", true),
    country: f("Country"),
    addrType: f("Type"),
  },
  lists: {
    participation: [
      { value: "rider", label: "Rider", desc: "I'll ride in the Team Huntington peloton." },
      { value: "volunteer", label: "Volunteer", desc: "I'll support the event on the ground." },
      { value: "both", label: "Both", desc: "Volunteering and riding at Team Huntington." },
      { value: "unsure", label: "Not sure yet", desc: "Explore first — you can change this later." },
    ],
    employmentTypes: [
      { value: "salary", label: "Salary" },
      { value: "hourly", label: "Hourly" },
    ],
    payGrades: [
      { value: "yes", label: "Yes — pay grade 74 or below" },
      { value: "no", label: "No — pay grade 75 or above" },
    ],
    travelNeeds: [
      { value: "none", label: "None — I'm covered" },
      { value: "hotel", label: "Hotel only" },
      { value: "airrail", label: "Air / Rail only" },
      { value: "both", label: "Travel + Hotel" },
      { value: "unsure", label: "Not sure yet" },
    ],
    bikeNeeds: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No — bringing my own" },
      { value: "unsure", label: "Not sure" },
    ],
    bikeSizes: ["XS", "S", "M", "L", "XL"].map((s) => ({ value: s, label: s })),
    bikeTypes: [
      { value: "road", label: "Road" },
      { value: "hybrid", label: "Hybrid" },
      { value: "ebike", label: "E-Bike" },
    ],
    pedals: [
      { value: "flat", label: "Flat" },
      { value: "clip", label: "Clip-in (SPD)" },
      { value: "clip-road", label: "Clip-in (Road)" },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map((s) => ({ value: s, label: s })),
    jerseyStyles: [
      { value: "short-sleeve", label: "Short sleeve" },
      { value: "sleeveless", label: "Sleeveless" },
    ],
    cuts: [
      { value: "mens", label: "Men's" },
      { value: "womens", label: "Women's" },
      { value: "unisex", label: "Unisex" },
    ],
    addressTypes: [
      { value: "residential", label: "Residential" },
      { value: "business", label: "Business" },
    ],
    sizeGuide: [
      { value: "XS", label: "XS", desc: "32-34" },
      { value: "S", label: "S", desc: "34-36" },
      { value: "M", label: "M", desc: "36-38" },
      { value: "L", label: "L", desc: "38-40" },
      { value: "XL", label: "XL", desc: "40-42" },
      { value: "XXL", label: "XXL", desc: "42-44" },
      { value: "3XL", label: "3XL", desc: "44-46" },
      { value: "4XL", label: "4XL", desc: "46-48" },
    ],
  },
  links: {
    pelotonia: { label: "Open Pelotonia Registration", url: "https://www.pelotonia.org" },
    travel: { label: "Open Concur / ATG", url: "about:blank" },
    bikeRental: { label: "Open Unlimited Biking", url: "about:blank" },
  },
};

/** Fills any gaps in a saved blob from the defaults so the page never blanks. */
export function mergeRegisterContent(raw: unknown): RegisterContent {
  const d = DEFAULT_REGISTER_CONTENT;
  const partial = (raw ?? {}) as Partial<RegisterContent>;
  const fields: RegisterContent["fields"] = { ...d.fields };
  for (const [k, v] of Object.entries(partial.fields ?? {})) {
    if (v && typeof v.label === "string") fields[k] = { label: v.label, visible: !!v.visible, required: !!v.required };
  }
  const lists: RegisterContent["lists"] = { ...d.lists };
  for (const [k, v] of Object.entries(partial.lists ?? {})) {
    if (Array.isArray(v) && v.length) lists[k] = v.filter((o) => o && o.value && o.label);
  }
  const links: RegisterContent["links"] = { ...d.links };
  for (const [k, v] of Object.entries(partial.links ?? {})) {
    if (v && typeof v.url === "string") links[k] = { label: v.label ?? "", url: v.url };
  }
  return {
    text: { ...d.text, ...(partial.text ?? {}) },
    fields,
    lists,
    links,
  };
}
