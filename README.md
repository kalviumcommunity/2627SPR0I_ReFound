# Refound — Campus Lost and Found

### Lost something on campus? Find it here.

## Start Here

New to this repo? Three things, in this order, then pick up an issue.

1. **Where it lives.** https://github.com/kalviumcommunity/2627SPR0I_ReFound — public, so the course can open it without being added as a collaborator.
2. **What we are fixing.** [Issue #8 — Assigned incident: found items are not searchable and private ownership details are exposed](https://github.com/kalviumcommunity/2627SPR0I_ReFound/issues/8).
3. **How to run it locally.** [SETUP.md](SETUP.md) pins the four tool versions. Then `docker compose up --build` starts the API and PostgreSQL together — see [Getting Started](#getting-started-run-locally).

Work reaches `main` only through a reviewed pull request. There are no direct pushes to `main`; see [Team Workflow](#team-workflow).

## Repository Access

This repository is public: https://github.com/kalviumcommunity/2627SPR0I_ReFound
Anyone on the course can open it without being added as a collaborator.

## Getting Started (Run Locally)

1. Clone the repository:

   ```
   git clone https://github.com/kalviumcommunity/2627SPR0I_ReFound.git
   cd 2627SPR0I_ReFound
   ```

2. Match the local tool versions in [SETUP.md](SETUP.md) (Docker, Docker Compose, Git, psql).
   The API's base image and npm packages are pinned — see [DEPENDENCIES.md](DEPENDENCIES.md)
   for what is pinned and how to upgrade on purpose.
3. Create your local config and replace the three placeholders (`POSTGRES_PASSWORD`,
   `JWT_SECRET`, `STAFF_PASSWORD`) with your own values. `.env` is git-ignored; never commit it.

   ```
   cp .env.example .env
   ```

4. Start the web UI, the API and its PostgreSQL database with one command:

   ```
   docker compose up --build
   ```

   [compose.yaml](compose.yaml) runs three services: `web` (built from `frontend/`),
   `api` (built from `backend/`) and `db` (`postgres:16`). Database files live on the named
   volume `refound-local-db`, so they survive `docker compose down` and restarts. The API reaches
   the database by its service name `db`, not `localhost`, and applies the schema on start.
   No PostgreSQL install is needed on your laptop.

   `web` waits for `api` to report **healthy**, not merely started, so the first page load
   cannot land on an API that is still applying the schema. On start the API also seeds the
   staff account from `STAFF_EMAIL` / `STAFF_PASSWORD` in `.env` (idempotent), because staff
   accounts are never created through the API — without it the desk screens have nobody to
   sign in as.

   **No worker process.** That one command starts every process ReFound has. Incident #8
   (search doesn't work, private details are exposed) has no stuck job and no background step.
   Every action, including registering an item, reviewing a claim and recording a handover,
   finishes inside its API request. The staff "review queue" is a database query, not a job
   queue. So there is no worker service and no queue product. If a background step is added
   later, it should be a second service in `compose.yaml` that uses the same image with a
   different `command`, so a rollback moves both to the same release.

5. Check it is up:

   ```
   curl http://127.0.0.1:3000/api/health      # {"ok":true}
   curl http://127.0.0.1:3000/api/items       # {"items":[]}
   ```

   Open http://localhost:8080 for the web UI, and sign in on the **Staff / Volunteer** tab
   with `STAFF_EMAIL` / `STAFF_PASSWORD` from `.env`.

   Stop with `Ctrl+C` or `docker compose down`. To wipe local data, see [Data stores](#data-stores-local-vs-demo).

## CI/CD

- **CI:** [.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every pull request and every push to `main`:
  backend tests against a throwaway PostgreSQL 16, the frontend build, and the API image build.
  A red check means the PR doesn't merge.
- **CD:** [render.yaml](render.yaml) sets `autoDeployTrigger: checksPass`, so Render deploys `main`
  only after those checks are green. Deploys use the same image recipe with the host's own config
  (see [Configuration](#configuration-one-image-two-environments) once merged).

## Data stores: local vs demo

Two separate stores for the same app. A reset of one never touches the other.

| | Local store | Demo store |
|---|---|---|
| What | Docker **named volume** `refound-local-db` (Compose service `db`) | Render PostgreSQL `refound-demo-db` on the faculty free host ([render.yaml](render.yaml)) |
| Holds | Your experiments and test rows | The showcase rows the mentor sees |
| `DATABASE_URL` | `postgres://…@db:5432/refound` (host `db`, inside Compose only) | The host's internal URL, set by Render. Never in Git, never in `.env` |
| Reset | Yes, any time | **Never** from a laptop |

Status: the demo store is defined in `render.yaml` but **not deployed yet**. Until it is,
there is no demo data, and nothing local is shared with any other URL.

**Local reset** (deletes only your practice data):

```
docker compose down -v        # stops the stack and deletes the volumes in compose.yaml
docker compose up --build     # fresh, empty local database
```

The same, step by step: `docker compose down`, then `docker volume rm refound-local-db`.

**Why it cannot reach the demo store:** `compose.yaml` builds `DATABASE_URL` from the host
name `db`, its own Postgres container. No `.env` value can point it at another server.
`down -v` only deletes volumes declared in that file, and the only one is `refound-local-db`,
a volume on your machine. The demo database lives on Render's servers, is not a Docker volume,
and its URL is not in this repo, so no local command has it.

A named volume is not a folder in the repo (not a bind mount). It lives in Docker's own volume
store, so resetting it can't delete project files, and its data never ends up in a commit.

Rebuilding or replacing the `api` container does **not** reset data. The rows are in the volume.

## Assigned Incident

**Found items on campus cannot be searched, and private ownership details are exposed.**
Students have no way to check whether a lost item was handed in, and staff keep
records on paper or in spreadsheets that are hard to search and show private details.

Tracked as [issue #8 — Assigned incident: found items are not searchable and private ownership details are exposed](https://github.com/kalviumcommunity/2627SPR0I_ReFound/issues/8), assigned to Danushri Prakash.

Issue #8 is the pointer, not the build. The PRD, the mock and the service code are
separate pieces of work.

## Team Workflow

- All work happens on a feature branch (`feature/<short-name>`).
- Changes reach `main` only through a pull request.
- At least one teammate reviews every pull request before it is merged.
- No direct pushes to `main`. A direct push skips review, hides who changed what
  and why, and makes "it is on main" easy to confuse with "it is live".
- Code being on `main` does not mean it is deployed. Deployment is a separate step.
- A pull request is merged only after a teammate's review is visible on it.

## Problem Statement

Students often lose their belongings on campus and do not know whether someone has found them. They usually have to visit the help desk or ask other students in group chats.

There is no simple way to check which items have been found. Paper registers and spreadsheets can also be difficult to manage and search.

## Solution

Campus Lost and Found is a web application that helps students find their lost belongings.

Desk volunteers can add details of found items to the application. Students can browse and search for items using keywords, categories, and locations.

Students can submit a claim if they find an item that belongs to them. Desk volunteers will verify the ownership and student identity before handing over the item.

Private details will only be visible to authorized staff and will never be displayed publicly.

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL
- **DevOps:** Docker and GitHub Actions
- **Deployment:** Render
- **Version Control:** Git and GitHub

## What We Are Going to Build

We are going to build a simple website with two main sections:

### 1. Student Section
- View the list of found items.
- Search for items using keywords.
- Filter items by category and location.
- View item descriptions.
- Submit a claim to collect an item.

### 2. Staff Section
- Add newly found items.
- Generate a unique reference number for each item.
- View and manage student claims.
- Approve or reject claims.
- Verify student identity before handing over an item.
- Mark items as handed over.

### 3. Data Storage and Security
- Store item and claim details in PostgreSQL.
- Keep private ownership details confidential.
- Allow only authorized staff to manage claims and handovers.
- Maintain records even after application restarts or updates.

## Application Workflow

1. Staff adds a found item.
2. The item appears in the public listing.
3. Student searches for the item.
4. Student submits a claim.
5. Staff verifies the student's ownership and identity.
6. Staff hands over the item and updates its status.

## Backups

Free Render Postgres keeps no backups of its own and expires 30 days after
creation, so the database is ours to protect:

```
bash scripts/db-backup.sh
```

Writes a timestamped, gzipped `pg_dump` to `backups/` (git-ignored) and keeps the
newest 14. Restore, scheduling and the restore drill are in
[Docs/backups.md](Docs/backups.md).

## Team Details

- **Team Number:** 04

### Team Members

1. Danushri Prakash
2. Jeevan_HD