# ReFound — Dependency Pinning

Yesterday's build and today's build must match unless the team changed them on
purpose. That means pinning two layers. Pinning one is not enough:

- a lockfile on a floating base image still drifts (Node, npm and Alpine move underneath it)
- a pinned base image with floating `^` ranges still drifts (`npm install` picks up new releases)

## What is pinned, and where

| Layer | File | Pin |
| --- | --- | --- |
| Base image (API) | [`backend/Dockerfile`](backend/Dockerfile) | `node:20.18.1-alpine3.20@sha256:9b5af1cc895fe7231c351cc1ea653322742091fb5d1ea8f1eb404c11e2b4da56` |
| Base image (web) | [`frontend/Dockerfile`](frontend/Dockerfile) | the same `node:20.18.1-alpine3.20@sha256:9b5af1c…` digest, in both the build and runtime stages — one base image for the whole project to patch |
| Runtime inside the image | (comes with the image) | Node `v20.18.1`, npm `10.8.2`, Alpine `3.20.5` |
| API dependencies | [`backend/package-lock.json`](backend/package-lock.json) | lockfileVersion 3, 100 packages, each with a `sha512` integrity hash |
| API direct dependencies | [`backend/package.json`](backend/package.json) | exact versions, no `^` / `~` |
| Install command in the image | `backend/Dockerfile` | `npm ci --omit=dev` (lockfile only, never resolves) |
| Frontend dependencies | [`frontend/package-lock.json`](frontend/package-lock.json) + `frontend/package.json` | exact versions, 112 packages with integrity hashes |
| Web runtime dependencies | [`frontend/server.mjs`](frontend/server.mjs) | none — `node:http` only, so the web image ships no `node_modules` at all |
| Future installs | `backend/.npmrc`, `frontend/.npmrc` | `save-exact=true` — `npm install x` writes `x: "1.2.3"`, not `^1.2.3` |

Direct API dependencies as locked today:

| Package | Version |
| --- | --- |
| express | 4.22.3 |
| pg | 8.23.1 |
| jsonwebtoken | 9.0.3 |
| bcryptjs | 2.4.3 |
| cors | 2.8.6 |
| dotenv | 16.6.1 |

### Why the tag *and* a digest

`node:20.18.1-alpine3.20` is far better than `latest`, but a tag is still just a
name a publisher can point at different bytes (official images are rebuilt for
OS security patches under the same tag). The `@sha256:…` digest is the content
hash of the image index — if the bytes change, the digest changes, and Docker
refuses to substitute. The tag stays in the line so a human can read what it is.

We do not use `latest` anywhere in the build. `latest` is not a version — it is
whatever was pushed most recently.

## Overnight drift: before and after

**What could change with no commit from us** (before this change, or with `latest`):

- `FROM node:latest` → a new Node major (20 → 22 → 24), a new npm, a new Debian/Alpine
  base. Native modules, `node --test` flags and default behaviours change silently.
- `FROM node:20.18.1-alpine3.20` with no digest → the same tag re-pushed with a
  rebuilt Alpine layer.
- `"express": "^4.21.2"` with `npm install` → any new 4.x minor/patch lands on the
  next install. (This already happened: package.json said `^4.21.2`, the lock
  had moved to 4.22.3.)

**What cannot change now without a commit:**

- the base image bytes (digest), and so the Node, npm and OS versions inside it
- every package version and tarball hash in `package-lock.json`
- the direct versions in `package.json`

If the build breaks tomorrow and `git log` shows no change to these files, the
cause is outside the pinned set (network, registry outage, Docker Hub rate limit,
host). It is not "a dependency moved".

## Installing: always `npm ci`

To install dependencies — fresh clone, after `git pull`, switching branches, in
Docker — run `npm ci` in `backend/` or `frontend/`. It installs exactly what
`package-lock.json` records, never rewrites it, and fails if `package.json` and
the lock disagree.

Do not run a bare `npm install` to "get set up": it can rewrite the lockfile, and
that is drift nobody decided on. `npm install <pkg>@<version>` is used only for
the deliberate upgrade below. If `package-lock.json` shows up as changed and you
did not mean to upgrade, `git checkout package-lock.json && npm ci`.

## How a teammate upgrades on purpose

Pinning is not freezing. An upgrade is a normal, reviewed commit on a branch.

### Upgrade an npm package (example: express)

```bash
git switch -c chore/bump-express
cd backend
npm install express@4.22.4        # .npmrc save-exact writes "4.22.4", not "^4.22.4"
npm test                           # run the tests against the new version
git add package.json package-lock.json
git commit -m "chore(deps): express 4.22.3 -> 4.22.4"
```

Open a PR. The diff shows the version line in `package.json` and the changed
`version` / `resolved` / `integrity` entries in `package-lock.json`, so the
reviewer can see exactly what moved. To see what is available first:
`npm outdated`.

Always commit `package.json` and `package-lock.json` together. If they disagree,
`npm ci` (and so `docker build`) fails on purpose.

### Upgrade the base image

```bash
git switch -c chore/bump-node-image
docker buildx imagetools inspect node:20.19.0-alpine3.20   # copy the top-level "Digest:"
```

Edit the `FROM` line in `backend/Dockerfile` — change the tag **and** the digest
together:

```dockerfile
FROM node:20.19.0-alpine3.20@sha256:<digest printed above>
```

Then rebuild and check before committing:

```bash
docker build -t sprint-service:local backend
docker run --rm sprint-service:local node -v        # expect the new version
git commit -am "build(backend): node 20.18.1 -> 20.19.0 base image"
```

Update the tables in this file in the same commit. If the new image ships a
different npm, regenerate the lockfile with that npm so the two agree:

```bash
docker run --rm -v "$PWD/backend:/app" -w /app node:<new tag>@sha256:<digest> \
  npm install --package-lock-only --ignore-scripts
```

## Verified on this branch

Two `docker build --no-cache` runs of `backend/` on 2026-11-18 produced a
byte-identical `node_modules` tree (same sha256 over every file) with Node
v20.18.1, npm 10.8.2 and Alpine 3.20.5. The two image IDs differ only because
Docker stamps build time into the layer metadata — the contents are the same.

## Checks anyone can run

```bash
# the base image is pinned by digest (no output = no floating tag)
grep -nE '^FROM' backend/Dockerfile | grep -v '@sha256:'

# no ranges left in the direct dependencies (no output = all exact)
grep -nE '"[~^]' backend/package.json frontend/package.json

# lockfile matches package.json (fails if they disagree)
cd backend && npm ci --omit=dev --dry-run
```
