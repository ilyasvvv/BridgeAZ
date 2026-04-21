# Bizim Circle — Master Document

## 1. Brand

**Name:** Bizim Circle
**Tagline direction:** "Azerbaijanis abroad, united in one circle"
**Identity:** Youthful, energetic, tech-startup feel. Not a diaspora or government page. Global in scope.
**Tone:** Friendly, modern, buttery-smooth user experience.

## 2. Purpose

Bizim Circle is a social platform for connecting Azerbaijanis living abroad — anywhere in the world. It replaces the older BridgeAZ concept, which was narrowly focused on students and professionals.

Bizim Circle is for **everyone abroad**:
- Students
- Professionals
- Newcomers
- People considering moving abroad
- Student organizations and clubs
- Non-profits
- Community groups of any size or purpose

The core idea is the **Circle** — a community unit that can be anything from broad (e.g. "Azerbaijanis in Germany") to hyper-specific (e.g. "Tea and Domino Lovers of Fairfax").

## 3. User Types

There are two account types:

### Personal Accounts
Represent one individual. Used by any person — student, professional, newcomer, etc.

### Circle Accounts
Represent a community, group, or organization. Can be:
- Geographic (country, state, city, neighborhood)
- Interest-based (hobbies, sports, food, culture)
- Affiliation-based (universities, alumni, workplaces)
- Purpose-based (non-profits, student unions, support groups)

A single person can manage multiple Circles. A Circle has members, admins, and its own feed.

## 4. Core Functionalities

### 4.1 Search (Primary Feature)
Search is the most important function of the platform. It must be fast, advanced, and global across:
- User profiles (personal and circle)
- Posts and post content (full text)
- Text inside profile bios and descriptions
- Tags and hashtags
- Post categories
- Locations
- Circle names and descriptions

Filters should be layered: keyword + location + category + post type + date range.

### 4.2 Location System
- Every user gets a **default location** set at signup.
- The location filter is applied everywhere by default (feed, search, discovery).
- Location is **always changeable** — user can switch to browse any region at any time.
- Posts and Circles are tagged with locations.

### 4.3 Posts
Posting should be extremely easy, with rich templates (inspired by LinkedIn but simpler and more advanced).

**Post categories:**
- **Note** — regular text/media post
- **Announcement** — official or formal news
- **Event** — with date, time, location, RSVP
- **Opportunity** — jobs, internships, scholarships, gigs
- **Searching For** — looking for a roommate, friend, tutor, ride, advice, etc.
- (Extensible: more categories can be added later)

**Post features:**
- Text, images, video, links
- Tags and hashtags
- Location tagging
- Circle targeting (post to a specific Circle or your own feed)
- Smart templates for each category (e.g. Event auto-prompts for date/venue)

### 4.4 Feed
- Shows posts from followed users, joined Circles, and location-relevant content.
- Filterable by post category.
- Default location-scoped; user can widen scope.

### 4.5 Circles (functionality)
- Anyone can create a Circle.
- Circles have a feed, member list, admin roles, about section, location, and category.
- Users can join, leave, follow, and post to Circles (subject to Circle rules).
- Circles can be public, private, or invite-only.

### 4.6 Profiles

**Personal profile contains:**
- Name, photo, bio
- Location (current and origin)
- Counts: posts, followers, following, circles
- Optional: role/title, workplace/school, join date, external link
- Tabs: Posts, Circles, Opportunities

**Circle profile contains:**
- Name, logo, description
- Location, category
- Member count, admin list
- Tabs: Posts, Members, Events, Opportunities

### 4.7 Chat / Messaging
- 1-to-1 direct messages between users.
- Group chats within Circles.
- Real-time messaging.
- Message search.
- Media and link sharing.
- Read receipts, typing indicators.
- **Users are never obligated to reply.** No penalty, no "last seen" pressure, no forced read receipts — receipts should be optional.
- Message requests from strangers land in a separate inbox.

### 4.8 Notifications
- New followers, messages, likes, comments, mentions.
- Circle invites and activity.
- Events near the user's location.
- User-controllable granularity.

### 4.9 Security, Safety & Privacy

This is a first-class concern, not an afterthought.

- **Reporting** — any user, post, comment, or Circle can be reported. Multiple reason categories.
- **Blocking** — full block (no messages, no profile view, no posts in feed).
- **Muting** — softer option, user stays blocked-invisible.
- **Privacy controls** — who can message you, who can see your profile, who can tag you.
- **Message filtering** — stranger messages go to a separate request inbox.
- **No obligation to respond** — explicit UX and policy: ignoring a message is normal.
- **Two-factor authentication** — available for all users.
- **Rate limits** — anti-spam, anti-scraping.
- **Account recovery** — email + phone verification.
- **Moderation** — admin tooling for reviewing reports, suspending abusive accounts.
- **Minors** — age-appropriate defaults (stricter privacy, limited DM reach).

### 4.10 Onboarding
- Sign up with email / phone / OAuth (Google, Apple).
- Location prompt (auto-detect + manual override).
- Interest selection → suggests Circles and people to follow.
- Optional profile completion walkthrough.

### 4.11 Discovery
- "Circles For You" — suggested Circles based on location and interests.
- "People For You" — suggested users.
- Trending posts, events, and opportunities scoped to location.

## 5. Technical Overview

### 5.1 Stack (suggested baseline)
- **Frontend:** Next.js (React) + TypeScript
- **Styling:** Tailwind CSS (or similar utility-first)
- **Backend:** Node.js API (Next.js API routes or a separate service)
- **Database:** PostgreSQL (relational data — users, circles, posts, memberships)
- **Search:** Dedicated search engine — Meilisearch, Typesense, or Elasticsearch — indexing profiles, posts, tags, bios
- **Realtime (chat, notifications):** WebSockets (Socket.IO) or a managed service (Pusher, Ably, Supabase Realtime)
- **Media storage:** Object storage (S3 / Cloudflare R2 / Supabase Storage) for images and video
- **CDN:** Cloudflare or similar for global delivery
- **Auth:** OAuth (Google, Apple) + email/password with hashed credentials; JWT or session-based tokens
- **Hosting:** Vercel (frontend) + managed Postgres provider (Supabase, Neon, or RDS)

### 5.2 Data Storage
- **Relational DB (Postgres):** users, circles, memberships, posts, comments, likes, follows, messages, reports, blocks.
- **Search index:** denormalized copy of searchable content, updated on write.
- **Object storage:** all uploaded media (images, video, attachments).
- **Cache layer:** Redis for sessions, rate limiting, and feed caching.

### 5.3 Keys & Secrets
All API keys, database credentials, storage credentials, and third-party tokens are stored in environment variables — never committed to source.
See `BIZIM_CIRCLE_SECRETS.md` for the template of required keys.

### 5.4 Environments
- **Local** — developer machines, local Postgres + local storage.
- **Staging** — mirror of production for testing.
- **Production** — live environment.

Each environment has its own isolated set of secrets.

### 5.5 Third-party services (expected)
- Auth provider (Google, Apple, optionally Clerk/Auth0)
- Email (Resend, Postmark, or SendGrid)
- SMS (Twilio) — for phone verification
- Analytics (PostHog or Plausible)
- Error tracking (Sentry)
- Search (Meilisearch Cloud / Typesense Cloud / Algolia)
- Media storage (Cloudflare R2 / AWS S3)
- Push notifications (FCM / APNs)

## 6. Guiding Principles

1. **Search first.** If a user can't find it in two seconds, the feature fails.
2. **Location-aware by default, global by choice.**
3. **No obligation culture.** Users are never pressured to engage.
4. **Safety is default-on.** Privacy and anti-harassment tools are visible and easy.
5. **Everyone is welcome.** Not just students or professionals — every Azerbaijani abroad.
6. **Circles can be anything.** No gatekeeping on what counts as a community.
7. **Posting is effortless.** Templates and smart defaults do the work.
