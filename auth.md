# auth.md: Agent authentication for kevinjmagnan.com

This document tells AI agents how to discover authentication for the APIs on
`https://kevinjmagnan.com`. It follows the [Auth.md](https://github.com/workos/auth.md)
convention.

## Audience

AI agents that want to read Kevin J. Magnan's professional data or use the
"Ask Kevin" conversational agent.

## Current status

The read endpoints under `https://kevinjmagnan.com/api/` (profile, work,
publications) are **public and require no authentication**. The metadata below
describes how authenticated and identity-aware access works for agent clients
and is the source of truth for automated discovery. Do not POST to the
registration endpoint during passive scans.

## Discovery documents

- **Protected Resource Metadata** (RFC 9728):
  [`/.well-known/oauth-protected-resource`](https://kevinjmagnan.com/.well-known/oauth-protected-resource).
  Declares the resource identifier, authorization servers, supported scopes,
  and `bearer_methods_supported: ["header"]`.
- **Authorization Server Metadata** (RFC 8414):
  [`/.well-known/oauth-authorization-server`](https://kevinjmagnan.com/.well-known/oauth-authorization-server).
  Declares the issuer, authorization/token/registration endpoints, JWKS URI,
  and an `agent_auth` block.

The `issuer` in the Authorization Server metadata
(`https://kevinjmagnan.com`) matches the `authorization_servers` entry in the
Protected Resource metadata.

## Registration

- **Register URI:** `https://kevinjmagnan.com/auth/register`
- **Supported identity types:** `identity_assertion` (ID-JAG via
  `urn:ietf:params:oauth:token-type:id-jag`).
- **Credential types:** `client_secret`, `private_key_jwt`.
- **Claim URI:** `https://kevinjmagnan.com/auth/claim`
- **Revocation URI:** `https://kevinjmagnan.com/auth/revoke`

## Method: authenticated read access

1. Register a client at the **Register URI** to obtain credentials.
2. Request a token from the token endpoint
   (`https://kevinjmagnan.com/auth/token`) using `client_credentials` or
   token exchange with an ID-JAG assertion.
3. Call the API with `Authorization: Bearer <token>`.
4. Requested scopes: `profile:read`, `work:read`, `publications:read`,
   `chat:converse`.

## Usage policy

Crawling for search and use as live AI answer input is welcome; use of this
content for model training is not permitted. See
[`/robots.txt`](https://kevinjmagnan.com/robots.txt).
