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

Validate the existing production auth configuration in a genuinely protected, candidate-limited SCOPE environment without exposing it to all previews or bypassing `auth_method_disabled`. The available Netlify API masks the existing secret values; it cannot supply them to a new deployment-specific context. The required Netlify PostgreSQL probe must receive the authorized existing connection and execute in read-only mode; the local timeout does not demonstrate a production failure. Validate administrator login and session lifecycle and authorized read access without calling initialization/seeding routes. Keep PR #9 draft until these proofs exist; preserve PR #8. Publishing requires a new GO MOA and explicit targeting of SCOPE, since its site is manually deployed and not Git-linked.

## Operational Netlify evidence - finalization

The temporary probe was available only on unpublished SCOPE candidates, protected by an unguessable in-memory bearer credential. Only its SHA-256 digest was packaged; no credential, user password or production secret was logged or committed. Anonymous probe access returned HTTP 404. All temporary candidates were deleted after the checks, and the probe source and gate data were removed. No diagnostic route is shipped by this PR.

Native rate limiting is now observed on SCOPE: candidate `6ac89ec83a23aea4a2d14e7b` returned HTTP 429 after the configured threshold and enforcement delay. No password was sent. The direct legacy login URL returned HTTP 404, so it did not bypass the native rule. This rate rule was not retested after the subsequent packaging-only correction.

Real execution exposed an omitted dependency: the login ZIP could not load `@netlify/blobs`, producing HTTP 502. The failure was reproduced by importing the extracted ZIP outside the repository. The final deterministic correction explicitly includes the Blobs SDK, runtime-utils, OpenTelemetry integration and its dependencies in function artifacts. No package version or authentication logic changes. `scope-auth-packaging-3-tests.js` validates the standalone ZIP and boots the real handler with the disabled-auth guard intact.

Final private candidate `6ac8a28e2044285bd9874d5d` booted the corrected login and returned HTTP 403 `auth_method_disabled`, not HTTP 502. The real Blobs service successfully persisted, reread, deleted and refused a temporary deploy-isolated session using the same LOCAL session helper. This proves storage/revocation plumbing, not an authenticated session for administrator 7647. The probe and candidate were deleted after use.

PostgreSQL remains unverified from Netlify: the private function found no runtime DATABASE_URL or NETLIFY_DATABASE_URL and executed no SQL. A targeted metadata check confirmed that DATABASE_URL is non-empty only in production; its declared dev, branch-deploy and deploy-preview values are empty. The prior presence of context entries was not proof of a configured connection in those contexts. No production PostgreSQL outage is demonstrated by either the local timeout or this absent candidate configuration.

The three authentication variables are also absent from the unpublished candidate context. Production values are untouched and masked by the authorized Netlify API. A protected execution context actually supplied with the existing production configuration is therefore still required to validate PostgreSQL, the real account 7647 and business read access. The currently available CLI draft deployment path creates deploy-preview and cannot obtain those masked values. No secrets are requested, reset, or enabled globally for previews.

This finalization changes only `netlify.toml`, the new artifact boot test `scripts/scope-auth-packaging-3-tests.js`, and this evidence document. Existing successful unit/UI/business suites are not rerun. PR #9 stays draft; PR #8, the 847 sessions, events, assignments, attendance, RLS and the published deployment are not modified by these operations.

## Personal-session validation follow-up

An unpublished production-context candidate on SCOPE, with the existing production deploy locked, confirmed PostgreSQL using `BEGIN READ ONLY`, `SELECT`, and `ROLLBACK`. LOCAL and the active administrator account were present. The personal password was accepted, but `auth-me` rejected the session.

Runtime diagnostics on a separate protected, unpublished candidate confirmed that Lambda receives `event.blobs` without a modern Blobs environment context. `connectLambda` creates a context without `primaryRegion` or `uncachedEdgeURL`; deploy-store construction fails before any session read. The same defect was reproduced with the installed SDK and synthetic context. A real Lambda probe then confirmed persistence and immediate revocation using the SDK's documented explicit site/deploy/token/region parameters. Diagnostic candidates were deleted; no secrets were reported and the published deploy was unchanged.

The correction is limited to `_local-sessions.js`: use those explicit parameters for Lambda, preserving automatic configuration for modern functions, deploy isolation and strong consistency. `scope-auth-lambda-blobs-4-tests.js` covers this bridge with the real SDK and synthetic transport. Personal authentication and session validation on the corrected candidate remain required before release.
