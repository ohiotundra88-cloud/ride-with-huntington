# Vendored: @aspire/portal-auth

Client for Aspire Identity (OAuth 2.1 + PKCE sign-in, ID token verification,
org membership, signed session cookie). Copied from aspire-digital
`services/aspire-identity/packages/portal-auth/dist` at commit 620897f8.
Zero dependencies (WebCrypto only).

Only `src/server/session.server.ts` imports it. Moving to Microsoft Entra ID
means replacing that one file with an Entra (OpenID Connect) client; nothing
else in the app knows which provider signs people in.
