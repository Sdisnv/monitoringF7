# SCOPE LOCAL auth - release gate, 2026-10-09

Status: BLOCKED. No merge or deployment is authorized by this finalization step.

## Deterministic corrections

The instance-local attempt counter is removed. Login uses Netlify's native rate limit (5 requests per 180 seconds per IP and domain). Its modern entry point serves only `/auth/login`; the legacy redirect is removed. The installed Netlify bundler extracts both the route and a `rate_limit` traffic rule with the sliding-window algorithm and runtime API version 2. This is a packaging proof, not an observed HTTP 429 on SCOPE. Netlify documents a possible enforcement delay of up to 10 seconds.

Reference: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/

LOCAL access and refresh tokens now identify an opaque session stored in the existing Netlify Blobs service. The store is deploy-specific and uses strong consistency. It contains only the subject and absolute expiration, never passwords or tokens. Every protected LOCAL API reads the session and current account permissions before proceeding. Logout deletes the session, including when the signed access cookie has expired; subsequent access and refresh are rejected across instances. Missing or unavailable session storage fails closed. Legacy LOCAL tokens without a session are rejected. Okta login/callback behavior is unchanged.

## Validation evidence and limits

- `scope-auth-session-security-2-tests.js`: PASS. Modern login response, HttpOnly/Secure/SameSite=Lax cookie, refresh, expiration boundary, disabled account, role downgrade, logout with expired access cookie, cross-instance refresh replay, GET logout, malformed signature, expired session, missing storage, LOCAL disabled, and 15 protected APIs refusing revoked and anonymous credentials. Storage is simulated; these are not production proofs.
- `scope-prod-local-auth-1-tests.js`: PASS, 10 blocks / 31 assertions. Rerun because the tested auth components changed; session storage fixture adapted. Unchanged UI and business suites are not rerun.
- Netlify login packaging: PASS. Native route and traffic rule extracted from the modern entry point.
- Syntax and diff checks: PASS.
- Direct PostgreSQL probe uses the existing local SCOPE runtime configuration, with startup `default_transaction_read_only=on`, `BEGIN READ ONLY`, and only `SELECT 1` plus `current_setting('transaction_read_only')`. Connection times out after approximately 8 seconds before SQL. No query, schema initialization, migration, or business write executes. The unreadable Netlify secret cannot be compared to the local connection string; no assertion of exact equality is made.
- Existing SCOPE validation deploy `6ac89049fc4126cce9162e00` is in `deploy-preview`. Auth variables exist only in production; `/auth/config` reports LOCAL disabled and `/auth/login` refuses with `auth_method_disabled`. It predates these corrections and is not redeployed in this step.
- Production variables, passwords and Okta settings are untouched. Published deploy remains `6ac7c78b934cf1b3ec6d448a` as last verified; it is checked again before final reporting.
- No new secrets are requested. The actual administrator login, Blobs session persistence/revocation, native HTTP 429 enforcement and authorized business API access remain unproven on SCOPE.
- Programme/agenda routes are not used: their existing initialization/seeding code can write SQL. No QUO VADIS source is changed.

## Files in this correction

- `netlify.toml`
- `netlify/functions/auth-login.js` moved into `netlify/lib/_local-login.js`
- `netlify/functions/auth-login.mjs`
- `netlify/functions/auth-logout.js`
- `netlify/functions/auth-me.js`
- `netlify/functions/auth-refresh.js`
- `netlify/lib/_auth-utils.js`
- `netlify/lib/_local-sessions.js`
- `netlify/lib/_data-store.js`
- Auth gates only: `netlify/functions/admin-settings.js`, `admin-users.js`, `audit-log.js`, `data-status.js`, `users.js`, `scope.js`, `scope-personnel-correct-period.js`, `scope-personnel-detail.js`, `scope-personnel-effectif-at-date.js`, `scope-personnel-history.js`, `scope-personnel-import-analyze.js`, `scope-personnel-import-commit.js`, `scope-personnel-inactivate.js`, `scope-personnel-list.js`.
- `scripts/scope-prod-local-auth-1-tests.js`
- `scripts/scope-auth-session-security-2-tests.js`
- This evidence document.

## Remaining release conditions

Validate the existing production auth configuration in a genuinely protected, candidate-limited SCOPE environment without exposing it to all previews or bypassing `auth_method_disabled`. The available Netlify API masks the existing secret values; it cannot supply them to a new deployment-specific context. Resolve the PostgreSQL connection timeout without replacing the existing configuration speculatively, then perform the direct read-only probe. Validate administrator login and session lifecycle, native rate enforcement, and authorized read access without calling initialization/seeding routes. Keep PR #9 draft until these proofs exist; preserve PR #8. Publishing requires a new GO MOA and explicit targeting of SCOPE, since its site is manually deployed and not Git-linked.
