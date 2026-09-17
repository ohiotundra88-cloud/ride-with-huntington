# Team Huntington Hub

Build a polished, mobile-first full-stack prototype called “Team Huntington Hub” for Huntington colleagues participating in Pelotonia. Use React, TypeScript, Tailwind and shadcn/ui. Brand colors: Huntington bright green #7ECF1C, dark green #002D2A, white, charcoal, and light gray. The tone should feel premium, executive, optimistic, and simple. Do not use copyrighted logos; use clean text branding and abstract geometric placeholders that can later be replaced with approved Huntington and Pelotonia assets.

PRIMARY GOAL
Create one guided digital front door that helps colleagues register as a Rider or Volunteer, complete related travel, hotel, bike rental, apparel and mailing steps, access expense-report instructions, search FAQs, receive confirmation, and return later to update information.

BUILD THESE PAGES AND FLOWS

1. LANDING PAGE
- Hero title: “Your Team Huntington Pelotonia Journey Starts Here”
- Supporting copy explaining the portal guides colleagues through registration, travel, bike rental, apparel and support resources.
- Primary CTA: “Let’s Go”
- Secondary CTA: “View My Registration”
- Show a simple 5-step visual: Register, Travel, Bike, Apparel, Complete.
- Include a Resources & Support section with links to FAQ, Expense Guide, Ride Weekend Checklist and Contact Support.

2. SIGN-IN / PROFILE
- Prototype login using work email and a “Continue with Huntington SSO” simulated button.
- After sign-in, prefill a profile form with name, work email, mobile number, business segment, market/location and manager.
- Allow editable mobile number, segment, market and manager.
- Add privacy notice and consent checkbox.

3. MULTI-STEP REGISTRATION WIZARD
Use a persistent progress bar, autosave behavior and ability to go back.

Step A: Participation
- Choose Rider, Volunteer, Both, or Not Sure Yet.
- Conditionally change downstream steps.

Step B: Pelotonia Registration
- Display configurable instructions for correct Team Huntington peloton, event type and discount code.
- Show discount code in a copyable field.
- CTA: “Open Pelotonia Registration” that opens a placeholder external URL in a new tab.
- On return, allow user to enter a confirmation number or check “I completed registration.”
- Show status badge: Not Started, Pending Verification, Complete.

Step C: Travel & Hotel
- Ask if travel or hotel is needed.
- Options: None, Hotel Only, Air/Rail Only, Travel + Hotel, Not Sure Yet.
- Fields: departure city, arrival date, departure date, hotel check-in, hotel check-out, accessibility/travel notes.
- CTA: “Open Concur / ATG” with placeholder external link.
- On return, capture travel confirmation number, hotel confirmation number, hotel name, arrival time and departure time.
- Allow “Book Later.”

Step D: Bike Rental
- Only show for Riders or Both.
- Ask Yes, No, Not Sure.
- Fields: height, preferred bike size, bike type, pedal preference, helmet needed, pickup date, return date.
- CTA: “Open Unlimited Biking” with placeholder external link.
- Capture rental confirmation number and completion status.

Step E: Apparel & Mailing
- Riders: jersey size, shirt size, cut preference.
- Volunteers: volunteer shirt size and cut preference.
- Both: show all applicable fields.
- Sizes: XS through 4XL.
- Include size-guide modal.
- Mailing address fields with basic validation: name, street, unit, city, state, ZIP, country, residential/business.
- Checkbox confirming address is current.

Step F: Review & Submit
- Show a complete summary of all entered information.
- Flag missing required fields.
- Allow edit links for each section.
- Final button: “Complete My Team Huntington Registration.”
- On submit, generate a mock registration ID and show a success page.

4. PARTICIPANT DASHBOARD
- Welcome card with completion percentage.
- Status cards for Pelotonia, Travel, Bike Rental, Apparel and Mailing.
- Show deadlines and outstanding actions.
- Button to resume first incomplete step.
- Button to edit registration.
- Recent activity timeline.
- Confirmation summary card.

5. ADMIN DASHBOARD
Create a separate admin route with demo data and role toggle.
- KPI cards: Total Registrations, Riders, Volunteers, Complete, Incomplete, Travel Needed, Hotel Rooms, Bike Rentals.
- Registration table with search, filters and status chips.
- Columns: name, role, market, Pelotonia status, travel status, bike status, apparel status, overall completion.
- Detail drawer for a selected colleague.
- Apparel summary by item and size.
- Travel summary including hotel nights and arrival dates.
- Export buttons for CSV placeholders.
- Ability to resend confirmation, send reminder, reopen a locked step and add internal notes.

6. SEARCHABLE RESOURCE CENTER
- Global search bar: “Search Team Huntington…”
- Categories: Registration, Travel, Bike Rental, Apparel, Fundraising, Ride Weekend, Volunteers, Expense Reports.
- Seed at least 25 realistic FAQ articles.
- Search should filter by title, keywords and article body.
- Article detail pages with related articles and contact support link.

7. EXPENSE REPORT GUIDE
Create a step-by-step “How to Submit Pelotonia Expenses” page.
- Sections: Before You Start, Open Concur Expense, Create Report, Select Expense Type, Enter Cost Center, Attach Receipts, Add Business Purpose, Submit for Approval, Track Status.
- Include callout boxes for common mistakes, receipt requirements and deadlines.
- Add a printable checklist button and “Open Concur Expense” placeholder link.
- Include a short FAQ section specific to mileage, hotel, airfare, meals and missing receipts.

8. EMAIL / CONFIRMATION PREVIEWS
- Create a page or modal showing mock confirmation and reminder emails.
- Confirmation includes registration ID, participation type, status summary, outstanding actions, deadlines and secure return button.
- Update confirmation email after modifications.

DATA & STATE
- Use Supabase-ready architecture, but first build with realistic seeded local data and clear interfaces so Supabase can be connected later.
- Persist participant progress in localStorage for the prototype.
- Model entities for User, Registration, Travel, BikeRental, Apparel, MailingAddress, FAQArticle, AuditEvent and AdminNote.
- Include an audit trail timeline.

DESIGN REQUIREMENTS
- Mobile-first, fully responsive.
- Use large touch targets, clear typography and accessible contrast.
- Use cards, progress indicators, badges and stepper components.
- Avoid clutter. Keep the interface warm, professional and easy for nontechnical colleagues.
- Add subtle motion and polished empty/loading states.
- Include a dark-green top navigation and bright-green primary actions.
- Create a tasteful abstract arrow motif as a background accent.

PROTOTYPE BEHAVIOR
- All external links should be placeholders and clearly labeled as demo links.
- Include a demo user and demo admin mode switch in the top-right menu.
- Make all major flows clickable and functional.
- Seed realistic demo data for at least 20 participants.
- Include validation, error states, success toasts and confirmation dialogs.

FINAL DELIVERABLE
Produce a complete, navigable prototype with polished UI, realistic data and working local interactions. Include a README section in the app or code comments listing future enterprise integrations: Microsoft Entra ID, Pelotonia API/deep link, Concur/ATG, Unlimited Biking, Microsoft email service, approved Huntington database and Power BI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ride-with-huntington.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7a28345-07d8-44a0-8b84-8ffdb66ff0de).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
