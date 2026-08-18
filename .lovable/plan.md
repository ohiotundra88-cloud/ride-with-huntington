# 30-Minute CTO Demo Guide

Produce a run-of-show document for a 30-minute live demo of Team Huntington Hub, organized by the three personas: colleague (participant), captain/reviewer, and super user. Delivered as a document you can open, print, or paste into a deck — plus an optional in-app page so you can pull it up on your phone mid-demo.

## What the document contains

**1. Cover / framing (1 min)**
- What the Hub replaces today: scattered emails, SharePoint approval forms, manual rosters.
- One-line value statement and the three personas you'll walk.

**2. Timed run-of-show table**
Minute-by-minute agenda with the exact route to open at each step, so nothing is hunted for live.

```text
0-2    Landing page + brand, 5-step guide, live visit counter
2-4    Sign-in (Huntington email only) + "Welcome back" personalization
4-12   Colleague journey
12-19  Captain / reviewer journey
19-27  Super user journey
27-30  Architecture + security wrap, Q&A
```

**3. Colleague perspective (~8 min)**
- Landing: 5-step visual guide, personalized hero CTAs, announcement banner targeting (riders / volunteers / all).
- Registration wizard (`/register`): Rider / Volunteer / Both, Pelotonia Public-Rider ID + HB number, salary vs hourly and pay grade, travel, bike rental, jersey style (short sleeve / sleeveless), high roller and survivor flags, mailing address; deep links jump straight to the right step.
- My Journey (`/dashboard`): readiness ring, countdown to Aug 7 2027, action items that deep-link into the flow.
- Resources & FAQ (`/resources`): searchable articles, expandable tiles, contact directory, fundraising social assets to download.
- Expense guide (`/expenses`), packing list (`/packing`), family guide (`/family`), team snapshot (`/team`) with live Pelotonia dashboard data.
- Fundraiser approval request (`/fundraiser-request`): submit event + flier, pizza-tracker style status rail, in-app notifications on stage changes.
- Profile (`/profile`): photo upload, segment/market/manager details that persist.

**4. Captain / reviewer perspective (~7 min)**
- Events calendar (`/events`): captains post fundraising events with flier attachments and contact info.
- Approval queue (`/admin/approvals`): only requests waiting on your stage, badge counts, approve / request changes / decline with notes, visible approval trail (Captain -> Legal / Risk / Compliance / Marketing -> Co-chair).
- Calendar publishing rules: in-person events publish after co-chair sign-off; virtual events show earlier as "pending final approval".
- Captains Lounge (`/captains-lounge`): leadership-only updates, author name and avatar, document attachments with inline preview, pinned playbooks.

**5. Super user perspective (~8 min)**
- Admin home (`/admin`): draft queue and audit log.
- People: roles and appointments (`/admin/users`), permanent roster and season reset (`/admin/roster`), full participant CRUD (`/admin/participants`).
- Content: announcements with audience targeting and dropdown CTAs, FAQs, timeline/journey, goals, readiness scoring, packing list, family guide, contacts, concierge intents, fundraising resources.
- Branding (`/admin/branding`): hero background image with focus/darkening and header logo.
- Feature flags and audit (`/admin/flags`), executive analytics (`/analytics`).

**6. Technical and security talking points (for the CTO)**
- React + TypeScript on TanStack Start, server functions for all privileged work, Postgres with row-level security, role table (never role-on-profile) with security-definer role checks.
- VPN / corporate-filter hardening: all backend and file traffic streams same-origin through the hub's own domain; `/health` self-check page; IT allowlist doc.
- Custom domain `ridewithhuntington.com`, no AI-platform hostnames in the request path.
- Recent security hardening: contact info withheld from anonymous traffic, storage RLS, locked-down analytics writes, leaked-password protection, authenticated agent/MCP endpoint.
- Roadmap asks: verified-domain email notifications for approval stages, SSO instead of demo sign-in.

**7. Demo hygiene checklist**
Pre-demo: sign in once, confirm live team data loaded, have a request mid-approval, tabs pre-opened, note the demo sign-in shortcut so it isn't a surprise.

## Technical notes

- Write `docs/CTO-DEMO-SCRIPT.md` (markdown, print-friendly) as the primary deliverable and a copy under the artifacts folder for easy download.
- Optionally add a `/demo-script` route rendering the same content from a shared module so it's viewable on a phone during the demo; not linked from public nav.
