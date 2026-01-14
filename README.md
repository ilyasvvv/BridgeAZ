# BridgeAZ

BridgeAZ is a warm, community-driven professional and alumni network for Azerbaijani students and professionals across Azerbaijan, Turkey, and the United States. It is designed as a mentorship-first diaspora platform, blending alumni connection, project sharing, and regional discovery without the coldness of a generic corporate network.

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
```

## Features

Implemented now:
- JWT auth with role-aware registration
- Profiles with region awareness and mentor flags
- Posts feed with region visibility
- Student + mentor verification requests (manual admin review)
- Admin panel for verification approvals
- Region filtering in the feed and explore pages
- Seed data for demo readiness

Planned later:
- Real-time messaging
- Advanced mentorship scheduling and matching
- LinkedIn/edu email integrations
- OCR and document automation
- Mobile app

## Notes

- File uploads are stored locally under `server/uploads`.
- TODO in code: migrate uploads to a cloud storage provider (S3 or similar).
- Admin seed login (local demo): `admin@bridgeaz.com` / `Admin123!`.
- Security note: change the admin password and JWT secret for production.
- TODOs for production hardening: add rate limiting, audit logs, and pagination on admin endpoints.
