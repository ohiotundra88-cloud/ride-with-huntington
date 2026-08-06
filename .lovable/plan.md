# Make the Hub load on the corporate VPN

The blank/"reset" screen is the VPN's web filter replacing responses it doesn't like. Two things on the page can trigger it: the site domain itself, and the separate backend domain the browser talks to for sign-in and data (`*.supabase.co`, a non-Huntington host that filters commonly block).

We can't change what the VPN allows, but we can shrink the app down to a **single domain** (`ridewithhuntington.com`) so there is only one thing IT has to allow, and make the page still render useful content even when the backend call is blocked.

## What we'll do

### 1. Add a self-check page (`/health`)
A tiny page that reports, in plain language, exactly what is reachable from the machine you're on:
- Is the page HTML itself loading (yes, if you can see the page)?
- Did the styles and app scripts load?
- Can it reach the backend (sign-in/data)?

This gives you and IT a one-screen answer instead of guessing, and it works even if everything else fails.

### 2. Route all backend traffic through our own domain
Today the browser talks directly to the backend host. We'll add a same-origin passthrough at `/api/public/sb/*` on `ridewithhuntington.com` and point the app's browser client at it, so from the VPN's perspective the site only ever talks to itself. Sign-in, registration saving, FAQs, and admin screens all ride over that single domain.

### 3. Make the first screen render without the backend
The landing page, resource center, expense guide, and FAQ content will render from the server/static content so they display even if a data call is blocked — instead of a blank shell. Any blocked backend call shows a small inline "connection blocked on this network" notice with a link to `/health`, not an empty page.

### 4. Remove all other outside origins
Audit and remove/self-host anything loaded from a third-party domain (fonts, badge/analytics scripts, remote images) so nothing else can be intercepted. Also hide the Lovable badge on the published site.

### 5. One-page IT allowlist request
A short doc (and a printable section on `/health`) listing exactly what to allow: `ridewithhuntington.com` and `www.ridewithhuntington.com`, category Business/Productivity, no SSL inspection bypass needed.

## Technical notes

- New server route `src/routes/api/public/sb/$.ts`: forwards method, path, query, body, `Authorization` and `apikey` headers to `VITE_SUPABASE_URL`, returns the upstream response unchanged; strips hop-by-hop headers; no credentials added server-side (the user's own bearer token still governs access, so RLS is unchanged).
- New `src/integrations/supabase/proxy-client.ts` creating a browser client with `supabaseUrl = ${window.location.origin}/api/public/sb` and the existing publishable key; `src/lib/store.tsx`, `signin.tsx`, and other browser callers switch to it. Auto-generated `client.ts` is left untouched (server code keeps using it).
- Server functions already run same-origin, so `participants.functions.ts`, `roles.functions.ts`, `admins.functions.ts`, and `faqs.functions.ts` need no change.
- `/health` is a public route with no auth and no data dependency; checks run client-side with short timeouts.
- Nothing about auth rules, roles, or RLS changes — only the network path.

## Caveat

If the VPN is blocking `ridewithhuntington.com` itself (by category, or because it's a newly registered domain), no code change can fix it — step 1 will tell us that definitively, and step 5 is what unblocks it.
