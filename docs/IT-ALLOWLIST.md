# Team Huntington Hub: IT and network allowlist request

**Request:** allow the Team Huntington Hub site for Huntington colleagues on the corporate network and VPN.

| Item                 | Value                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Domains              | The Hub's hostname. Planned: `ridewithhuntington.com` and `www.ridewithhuntington.com`                             |
| Protocol / port      | HTTPS / 443, HTTP/2                                                                                                |
| Suggested category   | Business / Productivity (internal Huntington Pelotonia team site)                                                  |
| API paths            | `/api/public/*` and `/auth/*` on the same domain (data, files and sign-in)                                         |
| Sign-in              | The sign-in provider's host. With Microsoft Entra ID that is `login.microsoftonline.com`, normally already allowed |
| Other external hosts | None for the site to work                                                                                          |
| SSL inspection       | Bypass or decryption exception may be needed in iBoss for the Hub's domains (see below)                            |

## Why the request is limited to one domain

Page loads, data reads and writes, and uploaded files are all served from the Hub's own domain. The browser does not load anything from a third-party host: there are no external fonts, analytics, CDNs or remote images, and database calls are proxied through the site itself at `/api/public/sb/*`. Signing in briefly redirects the browser to the identity provider and back.

A few links open other sites when a colleague clicks them (for example pelotonia.org or "add to Outlook calendar"). They are ordinary links, not something the Hub needs in order to load.

## How to confirm a block

Open `https://<hub domain>/health` on the affected machine while connected to the VPN. The page reports, in plain language, whether the HTML, styles, scripts, and sign-in and data services are reachable, and includes the details above for a ticket.

While the Hub runs as a private preview (`HUB_REQUIRE_SIGN_IN=true`), `/health` also requires sign-in. If sign-in itself is blocked, test with `curl -I https://<hub domain>/auth/login`: a `302` response means the site is reachable.

Symptom seen when the filter intercepts the site: a blank white page (sometimes showing only the word "reset") instead of the Hub.

## iBoss / WireGuard-specific action

If iBoss returns only `reset` while the site works outside the tunnel, add the Hub's domains to the tenant's SSL decryption bypass and web allowlist policies:

- `ridewithhuntington.com` and `www.ridewithhuntington.com` (or the final hostname)
- URL scope: `https://<hub domain>/*`
- Permit HTTPS over TCP 443 and HTTP/2 in the applicable user and location policy
- Do not use fixed destination IPs; hosting addresses can change

After policy propagation, disconnect and reconnect the WireGuard tunnel, clear the browser's DNS cache, and open `https://<hub domain>/health` in a private window. The "Page delivered", "Styles loaded", "App scripts running" and "Sign-in & data" checks should all pass.
