# BizimCircle QA Fix Plan

This document collects the remaining issues found during the latest non-destructive QA pass and converts them into implementation phases that future Codex sessions can run in order.

## QA Context

The local frontend was running at `http://localhost:3000`. The pass used the in-app browser for route snapshots, source review for authenticated and mutating flows, and `npm run build` for verification. The build passed.

The browser session became unauthenticated during testing, so protected profile, circle, messages, settings, and home flows could only be verified by code inspection after that point. Do not treat the mutation-heavy flows as fully tested until a throwaway-account QA phase is explicitly approved.

## Confirmed Remaining Issues

### Phase 1: Feed and Post Interaction Debt

The homepage still exposes non-location feed controls. The user asked to remove all homepage filtering options except location, but the feed still has a `Feed` clear button and a `Saved posts` toggle inside `SmartFilterBar` in `app/home/page.tsx`. Saved posts are also available from the profile menu, so the homepage toggle should either be removed or redesigned as navigation rather than a feed filter.

Poll voting in `components/PostCard.tsx` is frontend-local only. `PollBlock` stores votes through `lib/postInteractions.ts` and `localStorage`, so poll votes do not persist through the API and are not shared across devices or users.

Event and opportunity action buttons are still visual only. `RSVP` and `Apply` in `components/PostCard.tsx` have no handlers, no API calls, and no persisted state.

Post sharing is still visual only. The `Share` action in `components/PostCard.tsx` renders without `onClick`, so it does not copy a link, open a share sheet, create a share object, or persist share counts.

The `Today near you` rail card still contains mock-only buttons. The buttons in `components/SideRail.tsx` are static items with no navigation, no join/add action, and no real API data source.

### Phase 2: Auth, Account Security, and Settings Debt

Forgot password, reset password, and change password flows are still missing from the frontend. `app/signup/page.tsx` only exposes login and signup; `lib/auth.tsx` only wraps login/register/me/logout.

Most settings controls are local-only. `app/settings/page.tsx` toggles privacy, notifications, safety, language, focus hours, session list, and 2FA visually without saving through an API. This includes privacy toggles, notification preferences, safety toggles, language radio buttons, fake sessions, and the 2FA setup button.

The delete account control is misleading. It renders a working-looking `Delete` button in `app/settings/page.tsx`, but the surrounding copy says account deletion is not available and there is no real handler. This should be made clearly unavailable or connected to a confirmed deletion flow.

Settings can show blank account values while authentication is unresolved or unavailable. In unauthenticated browser state, settings rendered account rows with `—` values before redirect behavior settled.

### Phase 3: Profile, Circle, and Mentorship Debt

Public user and circle profile routes redirect to login. This may be intended, but it means external/public profile preview is unavailable. If the product expects logged-out visitors to inspect profiles or circles, `app/user/[handle]/page.tsx` and `app/circle/[handle]/page.tsx` need a public read mode.

Mentorship activation is not implemented. There are mentor-related fields in `lib/users.ts`, `lib/types.ts`, `lib/mappers.ts`, and `components/ProfileAbout.tsx`, but no UI flow to become a mentor, request mentorship, approve mentorship, or persist mentorship status.

Circle channels exist but need deeper permission testing and likely backend alignment. `app/circle/[handle]/page.tsx` supports channels, channel creation, channel visibility, posting roles, and channel messages, but visibility is gated at the page level by membership/admin status. It should be verified against the API rules for `public`, `members`, and `admins` channel visibility.

Circle creation needs a full mutation test. The UI in `app/circles/new/page.tsx` is present and branded, but creating a circle mutates API records and was not executed during this pass.

Circle control identity is present but not fully QA-tested. `lib/identity.tsx` and `components/TopBar.tsx` support switching to controllable circles from the profile menu, and `components/Composer.tsx` posts as the active circle. This needs authenticated testing with an owner/admin circle.

### Phase 4: Messages and Safety Debt

Message preferences are local-only. Chat theme, read receipts preference, and mute preference are stored in localStorage in `app/messages/page.tsx`, not persisted to the backend.

Message safety actions mutate state and were not executed. Block, unblock, report, accept request, reject request, send text, send stickers, upload files, and start new chat are wired to API calls, but they need throwaway-account mutation testing.

New chat search exists but needs authenticated end-to-end QA. The plus button opens `NewChatModal`, searches users, and calls `chatsApi.startThread`, but this was not executed after the session became unauthenticated.

The messages page still contains conversation filters (`All`, `Unread`, `People`, `Circles`). This was not part of the homepage filtering request, but it should be reviewed for consistency if the product wants a simpler search-first experience.

Stickers are inline SVGs, not generated asset files. The current `Çay vaxtıdır` sticker uses an armudu stəkan-like shape and `Salam` is clearer than before, but the user specifically requested AI-generated brand-friendly sticker designs. A future design pass should decide whether SVG is sufficient or replace them with generated raster/vector assets in `public/brand` or another asset folder.

### Phase 5: Public/Internal Route Hygiene

The following public routes still exist and return 200: `/design`, `/specialdesign`, `/accents`, `/logo-preview`, and `/mockHomePage`. Prior QA flagged these as duplicate, off-brand, or internal design surfaces. They should be hidden, moved behind development-only guards, or intentionally incorporated into the product.

`/specialdesign` references a local `rickroll.mp4`, which is not appropriate for a public production route unless intentionally part of the product.

## Phase Order

Run the phases in this order:

1. Feed and post interactions.
2. Auth, account security, and settings persistence.
3. Profile, circle, and mentorship functionality.
4. Messages persistence, safety, and asset polish.
5. Public route cleanup and final regression QA.

Phase 5 should run after Phases 1-4 because route cleanup and final QA should verify the finished product rather than pre-existing partial states.

## Prompt 1: Feed and Post Interactions

```text
You are working in /Users/i.v/BizimCircle.

Use docs/qa-fix-plan.md as the source of truth for this phase. Implement Phase 1 only: homepage feed and post interaction debt.

Tasks:
- Remove homepage feed controls that are not location filtering. In app/home/page.tsx, remove or redesign the Feed clear button and Saved posts toggle so the homepage only offers location filtering. Saved posts should remain reachable from the profile menu/profile page.
- Replace local-only poll voting with real persisted poll voting. Inspect the API first. If the backend has no poll-vote endpoint/model, add the frontend contract cleanly and document the backend gap instead of pretending localStorage is real persistence.
- Make Event RSVP real. Persist RSVP/going state if an API exists; otherwise create the frontend API wrapper and clear UI states needed for backend implementation.
- Make Opportunity Apply real. At minimum, if an apply link exists, open it safely; otherwise show a clear unavailable state. Do not leave a no-op button.
- Make Share real. Implement copy-link/share-sheet behavior and update share count only if the backend confirms or if the product has an accepted local-only share pattern.
- Replace Today near you mock buttons with real data/actions or remove the card until real data exists.

Constraints:
- Do not edit messages, auth, settings, circles, or profile unless required by shared types.
- Do not stage, commit, or push.
- Respect the existing dirty worktree.

Verification:
- Run npm run build.
- Start or reuse the dev server and browser-test /home while authenticated if credentials/test account access is available.
- Report files changed, commands run, and any backend gaps.
```

## Prompt 2: Auth, Account Security, and Settings

```text
You are working in /Users/i.v/BizimCircle.

Use docs/qa-fix-plan.md as the source of truth for this phase. Implement Phase 2 only: auth, account security, and settings persistence.

Tasks:
- Add forgot password and reset password frontend flows. Inspect the backend/API routes first and wire to real endpoints if available.
- Add change password UI from settings/profile. Do not perform final password-change submissions during QA without explicit user confirmation.
- Persist settings controls through the real API where possible: privacy, notifications, safety, language, focus hours, sessions, and 2FA.
- Replace fake session rows with real session data if the API supports it. Otherwise label the section as unavailable and remove fake devices.
- Make 2FA setup either real or clearly unavailable.
- Fix the delete-account area so it is not a misleading active button. If implementing account deletion, require action-time confirmation before testing the destructive final step.
- Ensure protected settings does not show blank account values as if loaded when auth is absent or still resolving.

Constraints:
- Do not edit feed post interactions, circle channels, or messages except shared API/auth types if needed.
- Do not stage, commit, or push.
- Respect existing dirty worktree changes.

Verification:
- Run npm run build.
- Browser-test login, forgot/reset pages, settings tabs, and non-destructive settings changes.
- Any destructive or sensitive flows must stop before final submission unless explicitly confirmed.
```

## Prompt 3: Profiles, Circles, and Mentorship

```text
You are working in /Users/i.v/BizimCircle.

Use docs/qa-fix-plan.md as the source of truth for this phase. Implement Phase 3 only: profiles, circles, circle control, and mentorship.

Tasks:
- Decide from existing product patterns whether /user/[handle] and /circle/[handle] should be public or authenticated-only. If public, implement a logged-out read mode. If authenticated-only, make redirects intentional and avoid transient “profile not found” states.
- Implement mentorship activation and request flows using the existing mentor fields in lib/users.ts and lib/types.ts. Persist mentor status and relationship changes through the API if supported.
- Fully QA and harden circle creation in app/circles/new/page.tsx. Created circles must persist, assign creator/admin ownership, and appear in the user’s circles section.
- Verify and harden circle join/leave from side rails, circle profile, and hover previews. Already-joined circles should not be suggested.
- Verify and harden circle control switching through the TopBar profile menu. A circle owner/admin must be able to switch identity, post as the circle, and switch back.
- Verify and harden circle channels: channel creation, visibility, posting roles, loading messages, sending messages, and empty/error states.

Constraints:
- Do not perform mutation QA against real user data unless the user explicitly authorizes throwaway test records.
- Do not edit messages except circle-channel chat code in app/circle/[handle]/page.tsx.
- Do not stage, commit, or push.

Verification:
- Run npm run build.
- With approval/test accounts, test create circle, join/leave, identity switching, circle posting, channel creation, channel visibility, and channel messaging.
- Report any backend route or permission gaps.
```

## Prompt 4: Messages and Sticker Polish

```text
You are working in /Users/i.v/BizimCircle.

Use docs/qa-fix-plan.md as the source of truth for this phase. Implement Phase 4 only: messages persistence, safety, and sticker polish.

Tasks:
- Persist message preferences through the API where possible: chat theme, read receipts, and mute. If no API exists, isolate the local preference layer and document the backend contract needed.
- Authenticated QA/fix the new-chat flow from plus button to search to real conversation creation.
- Authenticated QA/fix send text, long text, multiple attachments, stickers, and layout after sending.
- Authenticated QA/fix block, unblock, report, accept request, and reject request flows. These mutate API records, so use throwaway users or explicit user approval.
- Review stickers. If AI-generated assets are required, generate brand-friendly stickers and store them in the repo’s asset convention. Ensure Çay vaxtıdır uses an armudu stəkan and Salam is visually meaningful.
- Keep the existing “i love bizim circle” easter egg style and duration unless a regression is found.

Constraints:
- Do not edit homepage/profile/circle systems except shared utilities if needed.
- Do not stage, commit, or push.
- Respect existing dirty worktree changes.

Verification:
- Run npm run build.
- Browser-test /messages on desktop and mobile widths with real test conversations.
- Report files changed, commands run, generated assets, and any backend gaps.
```

## Prompt 5: Route Cleanup and Final Regression QA

```text
You are working in /Users/i.v/BizimCircle.

Use docs/qa-fix-plan.md as the source of truth for this phase. Run this only after Phases 1-4 have been implemented or consciously deferred.

Tasks:
- Clean up public/internal routes: /design, /specialdesign, /accents, /logo-preview, and /mockHomePage. Move them behind development-only guards, remove them, or intentionally integrate them into the product.
- Remove any inappropriate public assets or references, including the /specialdesign rickroll surface if it is not intentionally product-facing.
- Perform a full regression pass:
  - Homepage/feed search, location filtering, composer, post interactions, profile previews, side rails, saved posts.
  - Auth/account flows, settings, password flows, and non-destructive security settings.
  - Profiles, circles, joining/leaving, circle creation, circle control, mentorship.
  - Messages, new chat, attachments, stickers, easter eggs, safety actions.
  - Static pages: about, terms, privacy.
  - Desktop and mobile viewports.
- Confirm that no visible core feature is mock-only unless explicitly labeled unavailable.

Constraints:
- Do not stage, commit, or push.
- Do not perform destructive account deletion or final password-change submission.
- Use throwaway records for mutation testing only with explicit user approval.

Verification:
- Run npm run build.
- Use browser screenshots/snapshots across desktop and mobile.
- Produce a concise final QA report with pass/fail by area and any remaining product decisions.
```

## Commands Already Run

```bash
npm run build
```

Result: passed.
