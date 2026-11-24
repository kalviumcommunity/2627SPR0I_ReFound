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
3. Create your local config and replace both placeholders (`POSTGRES_PASSWORD`, `JWT_SECRET`)
   with your own values. `.env` is git-ignored; never commit it.

   ```
   cp .env.example .env
   ```

4. Start the API and its PostgreSQL database with one command:

   ```
   docker compose up --build
   ```

   [compose.yaml](compose.yaml) runs two services: `api` (built from `backend/`) and `db`
   (`postgres:16`). Database files live on the named volume `refound-db`, so they survive
   `docker compose down` and restarts. The API reaches the database by its service name `db`,
   not `localhost`, and applies the schema on start. No PostgreSQL install is needed on your laptop.

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

   Stop with `Ctrl+C` or `docker compose down`. `docker compose down -v` also deletes the database volume.

## Configuration (one image, two environments)

Settings live in the environment, never in the image. The `backend/Dockerfile` has no
port, database URL or secret in it, so the **same image** runs locally and on the demo host.
Switching environment means switching the config file, not rebuilding.

| Variable | Used by | Required | What it is |
|---|---|---|---|
| `PORT` | API | no (default `3000`) | Port the API listens on |
| `DATABASE_URL` | API | **yes** | PostgreSQL connection URL (secret: has the password) |
| `JWT_SECRET` | API | **yes** | Signs login tokens, 32+ characters (secret) |
| `JWT_EXPIRES_IN` | API | no (default `12h`) | How long a login lasts |
| `BCRYPT_ROUNDS` | API | no (default `10`) | Password hashing cost |
| `POSTGRES_USER` | Compose `db` | no (default `refound`) | Local database user |
| `POSTGRES_PASSWORD` | Compose `db` | **yes** (local) | Local database password (secret) |
| `POSTGRES_DB` | Compose `db` | no (default `refound`) | Local database name |
| `STAFF_NAME`, `STAFF_EMAIL`, `STAFF_PASSWORD`, `STAFF_ROLE` | `npm run seed:staff` only | when seeding | First staff account (password is secret) |
| `VITE_API_URL` | frontend build | no | Where the UI calls the API |

Only names and placeholders are committed. Real values exist only on the machine that runs:

| Environment | Config file (git-ignored) | Template (committed) |
|---|---|---|
| Local | `.env` | [.env.example](.env.example) |
| Demo host | `.env.demo` locally, or the host's dashboard | [.env.demo.example](.env.demo.example) |

Same image, two configs:

```
docker compose build api                     # builds refound-api:local once
docker compose up                            # local config (.env): api + db
docker run --rm --env-file .env.demo -p 127.0.0.1:10000:10000 refound-api:local   # demo config
docker image inspect refound-api:local --format "{{.Id}}"   # same ID both times
```

A new campus would be another config file (its own database URL and secret), not another image.

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

## Team Details

- **Team Number:** 04

### Team Members

1. Danushri Prakash
2. Jeevan_HD