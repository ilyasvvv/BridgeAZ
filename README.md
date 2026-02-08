# BridgeAZ

BridgeAZ is a warm, community-driven global community network for Azerbaijanis (students and professionals). It blends alumni connection, project sharing, and discovery without the coldness of a generic corporate network.

The goal of BridgeAZ is to help students find trusted mentors, help professionals give back to the next generation, and build long-term relationships across borders. Verification is built into the experience to keep the community high-trust while still feeling youthful and accessible.

## Project structure

```
bridgeaz/
  server/   # Express + MongoDB API
  client/   # React + Tailwind UI
```

## How to run

Backend:

```
cd server
npm install
npm run seed
npm start
```

MongoDB (local):

```
mongod --dbpath /path/to/your/mongodb-data
```

Frontend:

```
cd client
npm install
npm run dev
```

### Environment variables (server/.env)

```
MONGO_URI=mongodb://localhost:27017/bridgeaz
JWT_SECRET=replace-with-a-secure-secret
PORT=5001
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret
R2_BUCKET=your-r2-bucket
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://<public-bucket-or-domain>
R2_REGION=auto
```

## File Uploads (Verification) — Cloudflare R2 Presigned URLs

Verification uploads are handled via direct-to-R2 presigned URLs. The backend never receives file bytes and never writes to disk. The client uploads directly to Cloudflare R2 using a presigned PUT URL.

Allowed file types: PDF/PNG/JPEG. Max size: 5MB (validated by the backend).

Flow and endpoints:
- POST `/api/uploads/presign` (auth required) with `{ originalName, mimeType, sizeBytes, purpose }`
  returns `{ uploadUrl, objectKey, documentUrl, headers: { "Content-Type": "..." } }`
- Client performs `PUT` to `uploadUrl` with the raw file body (no multipart). Use the returned `Content-Type` header.
- POST `/api/verification/student` with JSON `{ documentUrl, objectKey }`
- POST `/api/verification/mentor` with JSON `{ documentUrl, objectKey }`

Legacy disk upload endpoint:
- `POST /api/upload` returns `501 Not implemented` until migrated.

### CORS (R2)

Your R2 bucket CORS must allow browser origins (e.g., Vercel + localhost) for `PUT/GET/HEAD`. Ensure `AllowedHeaders` includes `Content-Type` (or `*`) so presigned uploads don't fail preflight.

## Features

Implemented now:
- JWT auth with role-aware registration
- Profiles with location fields and mentor flags
- Posts feed with flexible visibility tokens
- Student + mentor verification requests (manual admin review)
- Admin panel for verification approvals
- Location filtering in the feed and explore pages
- Seed data for demo readiness

Planned later:
- Real-time messaging
- Advanced mentorship scheduling and matching
- LinkedIn/edu email integrations
- OCR and document automation
- Mobile app

## Notes

- Verification uploads use Cloudflare R2 presigned URLs (no server-side disk storage).
- Security reminder: keep R2 keys private and rotate if leaked.
- Admin seed login (local demo): `admin@bridgeaz.com` / `Admin123!`.
- Security note: change the admin password and JWT secret for production.
- TODOs for production hardening: add rate limiting, audit logs, and pagination on admin endpoints.
