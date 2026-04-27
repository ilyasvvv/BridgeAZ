# BizimCircle Security Handoff

Last updated: 2026-04-25

Use this file as the continuity point when a future prompt mentions "security updates",
"hardening", "safety", "features", or similar security-related work.

## Current State

Frontend repo: `/Users/i.v/BizimCircle`
Backend repo: `/Users/i.v/AzeSA Web/bridgeaz/server`
Production API: `https://bridgeaz.onrender.com/api`

Recent hardening already implemented:
- Backend uses `helmet` security headers in `server/index.js`.
- Backend uses `app.set("trust proxy", 1)` for Render-aware rate limiting.
- Backend sanitizes request body/query/params against Mongo operator and prototype-pollution keys through `server/middleware/security.js`.
- Auth has stricter login throttling through `loginLimiter`.
- Password reset has its own abuse throttle through `passwordResetLimiter`.
- Login responses are generic to reduce account/provider enumeration.
- Missing-user login does a dummy bcrypt compare to reduce timing differences.
- New and reset passwords require at least 10 characters, with at least one letter and one number.
- Follow/relationship routes validate malformed user ids.
- Frontend signup password UI matches the backend password rule.
- Frontend warms the Render API on login/signup and gives auth requests a longer timeout for free-tier cold starts.

Verified:
- Backend syntax and middleware load checks passed.
- Backend runtime smoke test passed locally on port `5002`.
- `/api/health` returned Helmet headers.
- NoSQL-style login payload returned clean `401 Invalid credentials`.
- Backend `npm audit --omit=dev` reported `0 vulnerabilities`.
- Frontend `npm run build` passed.

## Next Security Phase

Pick up here first:

1. Move auth tokens out of `localStorage`.
   - Replace bearer-token storage with secure, HttpOnly, SameSite cookies.
   - Update backend login/register/google/reset-password responses to set cookies.
   - Update `/auth/me` and protected routes to read auth from cookies as well as `Authorization` during migration.
   - Update frontend `lib/auth.tsx` and `lib/api.ts` to use `credentials: "include"`.

2. Add CSRF protection after cookie auth is introduced.
   - Use a double-submit CSRF token or server-issued CSRF endpoint.
   - Require CSRF on unsafe methods: `POST`, `PUT`, `PATCH`, `DELETE`.

3. Add email verification.
   - Require verification for sensitive actions where appropriate.
   - Add resend verification with throttling.
   - Avoid revealing whether an email is registered.

4. Add session/token lifecycle controls.
   - Short-lived access session plus refresh/session rotation, or server-side session records.
   - Add logout invalidation.
   - Consider token versioning on the `User` model for password-reset/logout-all behavior.

5. Add audit logging and abuse signals.
   - Log auth failures, password resets, admin actions, bans, role changes, report decisions.
   - Keep logs structured and avoid storing secrets or raw tokens.

6. Tighten CORS and environment configuration.
   - Ensure production `SERVER_ALLOWED_ORIGINS` includes only real frontend domains.
   - Avoid broad regexes in production.
   - Verify Vercel `NEXT_PUBLIC_API_URL` points to the intended API.

7. Review user-generated content and upload security.
   - Enforce upload MIME/type/size allowlists server-side.
   - Consider image transformation or malware scanning when budget allows.
   - Keep rendering user text as text, not HTML.

8. Add automated security tests.
   - Auth throttling behavior.
   - NoSQL operator stripping.
   - Cookie flags and CSRF enforcement after cookie migration.
   - Private profile visibility and access-control regressions.

## Notes For Future Codex Work

- The backend is not inside the frontend repo; do not miss `/Users/i.v/AzeSA Web/bridgeaz/server`.
- There are unrelated dirty files in both worktrees. Do not reset or revert user changes.
- Free-stage limitations remain: Render free services sleep, so keep the warmup mitigation unless the backend moves to paid always-on hosting.
