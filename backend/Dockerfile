# ReFound API — runtime image.
# Slim base + production dependencies only + a tight build context (.dockerignore).
# Build:  docker build -t sprint-service:local backend
#
# Base image is pinned twice: the tag says what it is (Node 20.18.1 on Alpine 3.20),
# the digest says exactly which bytes. A tag can be re-pushed upstream; a digest cannot.
# The digest is the multi-arch index, so amd64 and arm64 machines both resolve to it.
# To upgrade on purpose, change BOTH in one commit — see DEPENDENCIES.md.
FROM node:20.18.1-alpine3.20@sha256:9b5af1cc895fe7231c351cc1ea653322742091fb5d1ea8f1eb404c11e2b4da56

WORKDIR /app
ENV NODE_ENV=production

# Pinned dependency file first, so this layer is cached until the lockfile changes.
# `npm ci` installs exactly what package-lock.json records (version + integrity hash)
# and fails if package.json and the lockfile disagree — it never resolves anything new.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Only what the server needs at run time: code, the schema (npm run db:init), and the
# staff seed script. Tests, docs and .env stay out — see .dockerignore.
COPY src ./src
COPY db ./db
COPY scripts ./scripts

USER node
EXPOSE 3000

# So Docker and Compose can tell "started" from "serving". /api/health is the same
# path render.yaml uses, and it answers 503 when the database is unreachable.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
