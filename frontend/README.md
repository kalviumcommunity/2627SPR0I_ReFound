# Refound — Frontend

React (Vite) frontend for Refound, the campus lost-and-found register.
Every screen in the PRD flow is built. Sign-in, the staff desk and the logbook
talk to the Express API in [`../backend`](../backend); the student listing, item
detail and claim form still read the bundled sample data.

## Run locally

Start PostgreSQL and the backend first (see [`../backend/README.md`](../backend/README.md)), then:

```
cd frontend
npm ci                        # installs exactly what package-lock.json records
npm run dev
```

Open http://localhost:5173

To start the database, the API and this UI together, run `npm run dev` from the
repository root instead.

## Container

```
docker build -t refound-web:local --build-arg VITE_API_URL=https://refound-api.onrender.com .
docker run --rm -p 8080:8080 refound-web:local
```

Then open http://localhost:8080.

`VITE_API_URL` is compiled into the bundle by Vite, so it is a **build** argument:
changing it needs a rebuild, not a restart. Leaving it out bakes in
`http://localhost:3000`, which is right for running the image next to a local API.

The image has two stages. The first runs `npm ci` and `npm run build`; the second
copies only `dist/` and [`server.mjs`](server.mjs). That server is ~90 lines of
`node:http` with no dependencies, so there is no second base image to patch and
no `node_modules` in the final layer. It serves the build, falls back to
`index.html` for client-side routes (so `/browse` and `/staff/items` work on a
refresh), caches `/assets/*` as immutable, never caches `index.html`, and answers
`/healthz` for the container healthcheck.

### Demo accounts (any password)

| Role | How |
| --- | --- |
| Student | Sign up at `/signup`, then log in |
| Staff / Supervisor | Created on the server with `npm run seed:staff` (email, role and password come from `backend/.env`); log in on the **Staff / Volunteer** tab |

## Pages

| Route | Who | Page |
| --- | --- | --- |
| `/` | Everyone | Landing page |
| `/items` | Everyone | The register: search, category and location filters |
| `/items/:ref` | Everyone | Item details — public-safe fields only |
| `/help` | Everyone | How to get an item back, FAQ |
| `/privacy` | Everyone | Who can see what (draft notice) |
| `/signup`, `/login` | Everyone | Student sign up; student / staff log in |
| `/welcome` | Student | Home: ID card, claims ready for pickup, newest items |
| `/items/:ref/claim` | Student | Private ownership claim |
| `/claims` | Student | All my claims, plus "What's new" (unread outcomes; badge in the navbar) |
| `/claims/:id` | Student | One claim: timeline, rejection reason, withdraw while pending, what to bring |
| `/staff` | Staff | Desk: counters, claims waiting, recently logged |
| `/staff/items` | Staff | Inventory of every record, incl. returned; unclaimed 14+ days |
| `/staff/items/new` | Staff | Log a found item with a staff-only ownership note |
| `/staff/items/:ref` | Staff | One record: private note and every claim on it |
| `/staff/claims` | Staff | Review claims against the record, approve/reject, handover |
| `/staff/logbook` | Supervisor | Audit history with filters and CSV export |
| anything else | Everyone | 404 page |

A crash on any page shows a recovery screen instead of a blank page, and the
navigation turns into a menu on phone-sized screens.

## What still uses sample data

Sign-in, the staff desk (`/staff/*`) and the logbook are live: they call the API
through [`src/api/client.js`](src/api/client.js), which attaches the JWT and reads
`VITE_API_URL`. The student side is not wired yet.

| File | Endpoints |
| --- | --- |
| [`src/services/itemsService.js`](src/services/itemsService.js) | Public items and student claims (`GET /api/items`, `POST /api/items/:ref/claims`, `GET /api/claims/mine`, withdraw a pending claim, unread claim updates) — not built in the backend yet |
| [`src/data/items.js`](src/data/items.js) | The records `GET /api/items` will return; the same 24 are seeded into the database by [`backend/scripts/seed-items.js`](../backend/scripts/seed-items.js), so the desk and the student list agree |
| [`src/services/mockDb.js`](src/services/mockDb.js) | The browser store the student mocks read and write |

Mocks never store passwords. Role checks in the UI only hide screens — the server
enforces them, which is why a student account cannot sign in through the staff tab.

## Pointing the UI at the API

Copy `.env.example` to `.env.local` and set `VITE_API_URL` (defaults to
`http://localhost:3000`):

```
VITE_API_URL=http://localhost:3000
```

If `localhost` reaches a different program on your machine (for example a Docker
or WSL relay holding port 3000 on IPv6), use `http://127.0.0.1:3000` instead.
Without a running backend, the screens report that they cannot reach the API.
