# Updates — Login & JWT Token Generation

## Overview

Implemented the full authorization code → JWT token exchange flow for both JWT and session cookie login methods. Fixed several pre-existing bugs in the auth middleware that were blocking session-based authentication from ever succeeding.

---

## Files Changed

### `src/controllers/raesumUser.js`

Rewrote all three stub methods with full implementations.

**`getJWT(req, res, next)`**
- Validates `code` query param is present
- Checks JWT login is enabled in config
- Rejects requests from users already logged in via session cookie
- Exchanges the authorization code for Cognito tokens via `raesumCognito.exchangeCodeForTokens`
- Accepts optional `redirect_uri` query param; defaults to server's `/api/v1/auth/loggedIn` if not supplied
- Decodes the returned `id_token` to extract the Cognito `sub` (user ID)
- Looks up the user in Raesum by `external_id`; returns `notLoggedIn` if not found
- Returns `notLoggedIn` if user's `active_status` is false
- Sets `req.session.loggedIn`, `cognitoUserID`, and `loginType` for conflict detection
- Returns the `id_token` in the JSON response body under the `token` field

**`loggedIn(req, res, next)`**
- Validates `code` query param is present; redirects to `/api/v1/auth/login` if missing
- Checks session cookie login is enabled in config
- Rejects requests from users already logged in via JWT
- Exchanges the authorization code for Cognito tokens (only if session is not already established)
- Uses the server's own `/api/v1/auth/loggedIn` URL as the `redirect_uri` for the token exchange
- Decodes the `id_token` and looks up the user in Raesum; redirects to login if not found or inactive
- Sets `req.session.loggedIn`, `cognitoUserID`, `loginType`, and `jwt` on success
- Retains all existing `post_login_uri` validation and redirect logic

**`logout(req, res, next)`**
- Retrieves the token from the `Authorization` header (JWT mode) or `req.session.jwt` (session cookie mode)
- Returns `missingHeader` error if JWT mode is enabled but no header is present
- Decodes the token with `jwt.decode` to read the `exp` claim and calculate remaining TTL
- Writes the token to the revoked-token cache with the remaining TTL so it expires automatically
- Cache key format: `"revokedToken" + token` stored in `objectType = "auth"`
- Destroys the session via `req.session.destroy`
- Returns a `loggedOut` success response

**Imports added:** `jsonwebtoken`, `raesumCache`, `raesumUser`  
**Import removed:** `CognitoExpress` (was imported but unused in the controller)

---

### `src/modules/raesumCognito.js`

**Added `exchangeCodeForTokens(code, redirectUri)`**
- POSTs to Cognito's `/oauth2/token` OAuth2 endpoint
- Builds the token endpoint URL from `buildBaseLoginURL()` — consistent with how the login URL is constructed
- Reads `cognitoClientId` and optional `cognitoClientSecret` from config
- If a client secret is configured, adds a `Basic` Authorization header with base64-encoded credentials
- Parses and returns the full token response: `{ id_token, access_token, refresh_token, expires_in, token_type }`
- Throws a descriptive error if Cognito returns a non-OK response

**Import added:** `node-fetch`

---

### `src/middleware/cognitoAuthentication.js`

Fixed four pre-existing bugs that prevented session-based authentication from working.

**Bug 1 — Missing `raesumCache` import**
- `raesumCache` was referenced in the revoked token check but never imported
- Added: `import raesumCache from "../modules/raesumCache.js"`

**Bug 2 — Invalid revoked token cache key (caused runtime error)**
- Old key: `"revokedJWT:" + accessTokenFromClient` — contained a colon which the cache `#keymaker` explicitly rejects, throwing an error on every JWT validation attempt
- New key: `"revokedToken" + accessTokenFromClient` stored under `objectType = "auth"`
- Now consistent with how `logout` writes revoked tokens to cache

**Bug 3 — `loggedIn` flag never set for session auth (all session requests returned 401)**
- The `loggedIn` local variable was initialized to `false` and never updated in the session cookie branch
- The final `if (!loggedIn)` check always fired, returning a `notLoggedIn` response even for valid sessions
- Added `loggedIn = true` immediately after confirming `userProfile.active_status` is true

**Bug 4 — `error` variable referenced instead of `e` in catch blocks**
- Both catch blocks in `cognitoAuth` and `raesumCognitoJWTAuth` logged `error` (undefined) instead of `e`
- Fixed in both locations

**Also cleaned up:** The catch block in the session auth branch referenced `userProfile` which was out of scope; replaced the unreachable stub code with a clean warning log.

---

### `src/server.js`

**Added auth callback routes to the authentication exclusion list**
- `/api/v1/auth/loggedIn` — must be accessible before login to receive the Cognito callback
- `/api/v1/auth/getJWT` — must be accessible before login to exchange the code for a token

Previously only `/api/v1/health` and `/api/v1/auth/login` were excluded, meaning `loggedIn` and `getJWT` were blocked by the auth middleware before a user could complete login.

---

### `controlledData/responses.json`

**Added `loggedOut` response (keycode 13)**
```json
{
  "title": "Logged Out",
  "message": "You have been logged out.",
  "description": "User has been successfully logged out.",
  "code": 200,
  "keycode": 13
}
```

---

### `config/default.json`

**Added `aws.cognito.cognitoClientSecret: null`**
- Optional field used when the Cognito app client has a secret configured
- When non-null, `exchangeCodeForTokens` includes it as a `Basic` auth header in the token exchange request
- Defaults to `null` (no secret) which is correct for public app clients

---

## Login Flow Summary

### JWT Flow
1. Client calls `GET /api/v1/auth/login?redirect_uri=<callback>`
2. Server redirects to Cognito hosted login UI
3. Cognito redirects to `<callback>?code=<code>`
4. Client calls `GET /api/v1/auth/getJWT?code=<code>&redirect_uri=<callback>`
5. Server exchanges code for tokens, validates user, returns `{ token: "<id_token>", ... }`
6. Client includes the token in `Authorization: <token>` on all subsequent requests

### Session Cookie Flow
1. Client calls `GET /api/v1/auth/login?redirect_uri=<server>/api/v1/auth/loggedIn&post_login_uri=<destination>`
2. Server redirects to Cognito hosted login UI
3. Cognito redirects to `/api/v1/auth/loggedIn?code=<code>`
4. Server exchanges code for tokens, validates user, sets session cookie
5. Client is redirected to `post_login_uri`
6. Subsequent requests use the session cookie automatically

### Logout
- JWT mode: `GET /api/v1/auth/logout` with `Authorization: <token>` header
- Session mode: `GET /api/v1/auth/logout` (token read from session)
- Token is revoked in cache; session is destroyed
