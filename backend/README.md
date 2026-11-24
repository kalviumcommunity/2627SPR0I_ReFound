# ReFound backend

Node.js + Express + PostgreSQL API for the campus lost-and-found register.

This slice covers the staff side: **authentication, item registration, claim
review and handover**, plus the database schema. Public listing/search and
student claim submission are the other half of the API.

## Run it

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm ci                        # installs exactly what package-lock.json records
npm run db:init               # apply db/schema.sql (safe to re-run)
npm run seed:staff            # creates the staff account from .env
npm run seed:items            # optional: the 24 sample records the UI ships with
npm start                     # http://localhost:3000
```

## Run it with Docker

The [Dockerfile](Dockerfile) builds a lean runtime image. From the repo root:

```bash
docker build -t sprint-service:local backend
docker image ls sprint-service:local

# needs a reachable PostgreSQL; values come from your shell, never from the image
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://refound:refound@host.docker.internal:5432/refound \
  -e JWT_SECRET=<at-least-32-random-characters> \
  sprint-service:local sh -c "npm run db:init && node src/server.js"
```

Then `curl http://localhost:3000/api/health` should return `{"ok":true,"db":"up"}`.

| | Size |
| --- | --- |
| `sprint-service:local` (what a classmate pulls) | **48.7 MB** content, 198 MB on disk |
| `node:20.18.1` full base alone, for comparison | 414 MB content, 1.59 GB on disk |

What is left out, and why it was a risk:

- **Heavy base.** `node:20.18.1-alpine3.20` instead of the full Debian `node:20.18.1`. The full
  tag ships compilers, `python3` and `make` for native modules; we have none (`bcryptjs` is pure JS).
- **Build tools and caches.** `npm ci --omit=dev` installs only runtime dependencies from the pinned
  `package-lock.json`, then `npm cache clean --force` drops the download cache.
- **Unused files.** [.dockerignore](.dockerignore) keeps `test/`, `README.md`, local `node_modules/`
  and `.env` out of the build context, so no secret or test fixture can be copied in.

Kept on purpose: `package.json` + `package-lock.json` (pinned deps), `db/schema.sql` (needed by
`npm run db:init`), `scripts/` (staff seeding). A classmate pull on campus Wi-Fi was **not measured**.

`npm test` runs the unit tests, and the integration tests too when
`DATABASE_URL` is set — without it they are skipped rather than silently passing.

## Endpoints in this slice

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | anyone | Create a **student** account (role cannot be requested) |
| POST | `/api/auth/login` | anyone | Returns a JWT and the role stored in the database |
| GET | `/api/auth/me` | signed in | Check a stored session |
| POST | `/api/items` | staff | Register a found item, allocate its reference code |
| GET | `/api/items/:ref/claims` | staff | Read claims **with** the private answers |
| PATCH | `/api/claims/:id` | staff | Approve or reject a pending claim |
| POST | `/api/claims/:id/handover` | staff | Record a handover after an identity check |
| GET | `/api/staff/items` | staff | Every record, returned ones included, with claim counts and the private note |
| GET | `/api/staff/claims?status=` | staff | The review queue, with the private answers and item detail |
| GET | `/api/audit?action=&q=&limit=` | supervisor | Read the audit history, newest first |
| GET | `/api/items?q=&category=&location=` | anyone | Public register search (every keyword must match; returned items hidden) |
| GET | `/api/items/locations` | anyone | Places items were found, for the search filter |
| GET | `/api/items/:ref` | anyone | One public record (never the private note) |
| POST | `/api/items/:ref/claims` | student | File a claim; a withdrawn claim can be re-filed |
| GET | `/api/claims/mine` | student | My claims with my answers and the outcome |
| GET | `/api/claims/mine/:id` | student | One of my claims (someone else's is a 404) |
| POST | `/api/claims/mine/:id/withdraw` | student | Withdraw while still pending |
| GET | `/api/claims/mine/updates` | student | Outcomes I haven't opened yet (navbar badge) |
| POST | `/api/claims/mine/seen` | student | Mark updates read (`{ ids }`, or all) |
| GET | `/api/health` | anyone | Readiness: runs `SELECT 1` and answers `200 {db:"up"}`, or `503 {db:"down"}` when the database is unreachable |

## Rules the code enforces

- **The client never decides its own role.** Signup always writes `student`, and
  every request re-reads the role from the database. Sending `role: "staff"` in a
  body changes nothing.
- **Private fields never leave through a public shape.** `toPublicItem()` in
  `src/lib/items.js` is the only place an item is shaped for a response, and
  `private_note` is not in it. Claim answers are returned only on the staff route.
- **A handover needs an approved claim and a recorded identity check.** Both are
  refused with a 409/400 rather than a warning.
- **A rejection must carry a reason.** The student reads it, so a blank reason is a
  400, not a silent rejection.
- **Approving one claim closes the others on that item.** They are marked
  `auto_closed` with a reason the student can read, and the item cannot be approved
  twice — an already-reserved item is a 409.
- **Reference codes are unique and sequential** (`RF-0149`), allocated from a
  PostgreSQL sequence inside the same transaction as the insert.
- **Every staff action is audited** into `audit_log`, with the item title and
  claimant name in `detail` so the logbook can describe an event without a join.
- **The audit history is supervisor-only.** A desk volunteer can act on records
  but cannot read the history of who did what.

## Sample data

The frontend has no built-in data: every page reads this API. For a demo rack,
`npm run seed:items` (optional) loads 24 sample records from
`db/sample-items.json`. It is idempotent (existing refs are skipped) and it
advances `item_ref_seq` past any ref already used, so a newly registered item can
never collide with a seeded one.
