## Goal

Get Team Huntington Hub onto a vanity domain so Huntington's network filters don't block it as an AI-platform URL, in time for the executive demo.

## Step 1 — Security check, then publish

Run a security scan first (publishing is blocked if there are unresolved critical findings). If clean, publish the project. This creates the `.lovable.app` production URL, which is a prerequisite for attaching any custom domain.

I'll also confirm publish visibility is **public** — if it's set to private, the site shows a login wall to anyone outside the workspace, which would sink the demo.

## Step 2 — Buy the domain (you do this part)

Domain purchase requires your payment details, so it happens in the UI, not from chat:

1. Project Settings → **Project** → **Domains**
2. Click **Buy new domain**
3. Search for the name you want and select it
4. Fill in contact + payment info and complete the purchase

Suggested names to search (pick whatever's available and reads well to executives):
- `teamhuntingtonhub.com`
- `huntingtonpelotonia.com`
- `ridewithhuntington.com`

Domains bought through Lovable auto-connect to the project and get SSL provisioned automatically — no DNS work needed on your end.

## Step 3 — Verify

Once the purchase completes, the domain moves through `Verifying` → `Setting up` → `Active`. I'll check the domain status and load the live site through the new hostname to confirm it serves the app correctly over HTTPS.

## Timing risk for tomorrow's demo

Two things to be aware of:

- **SSL provisioning** on a Lovable-purchased domain is usually minutes, but can take longer.
- **Newly registered domains** are sometimes blocked by enterprise proxies precisely *because* they're new — some corporate filters quarantine domains under ~30 days old. This is the one thing buying a fresh domain can't guarantee around.

If the demo is business-critical, the safest fallback is a subdomain on a domain Huntington already owns (e.g. `pelotonia.huntington.com`) — IT can allowlist it instantly and it carries no new-domain reputation risk. I can produce the exact DNS records for that path if you want it as a backup.

## Backup for the morning

Regardless of domain status, I'll confirm the `.lovable.app` published URL is live and working so you have a guaranteed-functional link in hand.

## Technical notes

- Custom domains apply to the **published** site only; the preview URL stays on `lovable.app`.
- Publishing frontend changes requires clicking Update in the publish dialog; backend changes deploy immediately.
- No application code changes are involved in this plan — it's publish + domain configuration only.
