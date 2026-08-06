# Team Huntington Hub — IT / Network allowlist request

**Request:** allow the following site for Huntington colleagues on the corporate network and VPN.

| Item | Value |
| --- | --- |
| Domains | `ridewithhuntington.com`, `www.ridewithhuntington.com` |
| Protocol / port | HTTPS / 443 |
| Suggested category | Business / Productivity (internal Huntington Pelotonia team site) |
| API paths | `/api/public/sb/*` on the same domain (sign-in and data) |
| Other external hosts required | None |
| SSL inspection | Bypass/decrypt exception required in iBoss for both domains |
| Transport | Allow HTTPS over TCP 443 and HTTP/2 |

## Why the request is limited to one domain

All application traffic — page loads, sign-in, and data reads/writes — is served from
`ridewithhuntington.com`. The browser does not contact any third-party host: there are no
external fonts, analytics, CDNs, or remote images, and backend calls are proxied through the
site's own domain at `/api/public/sb/*`.

## How to confirm the block

Open **https://ridewithhuntington.com/health** on the affected machine while connected to the
VPN. That page reports, in plain language, whether the HTML, styles, scripts, and sign-in/data
services are reachable, and includes the details above for a ticket.

Symptom seen when the filter intercepts the site: a blank white page (sometimes showing only the
word "reset") instead of the Hub.

## iBoss / WireGuard-specific action

The site and its same-origin API return valid HTTPS responses outside the tunnel. If iBoss returns
only `reset`, add both FQDNs to the tenant's SSL decryption bypass and web allowlist policies:

- `ridewithhuntington.com`
- `www.ridewithhuntington.com`
- URL scope: `https://ridewithhuntington.com/*` and `https://www.ridewithhuntington.com/*`
- Permit HTTPS over TCP 443 and HTTP/2 in the applicable user/location policy
- Do not use fixed destination IPs; the public CDN addresses can change

After policy propagation, disconnect and reconnect the WireGuard tunnel, clear the browser's DNS
cache, and open `https://ridewithhuntington.com/health` in a private window. The "Page delivered",
"Styles loaded", "App scripts running", and "Sign-in & data" checks should all pass.
