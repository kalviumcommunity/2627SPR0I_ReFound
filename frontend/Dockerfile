# ReFound web — the Vite build, served by a tiny Node server.
#
# Build:  docker build -t refound-web:local --build-arg VITE_API_URL=https://refound-api.onrender.com frontend
# Run:    docker run --rm -p 8080:8080 refound-web:local
#
# Two stages: the compiler (Vite, devDependencies, npm cache) never reaches the
# runtime layer, so the image ships the built files and one 90-line server.
#
# Base image is pinned by tag AND digest, the same bytes as backend/Dockerfile, so
# there is a single base image for the project to keep patched. To upgrade, change
# both stages and backend/Dockerfile in one commit — see DEPENDENCIES.md.
FROM node:20.18.1-alpine3.20@sha256:9b5af1cc895fe7231c351cc1ea653322742091fb5d1ea8f1eb404c11e2b4da56 AS build

WORKDIR /app

# Vite compiles VITE_API_URL into the bundle, so it is a BUILD argument. Changing
# it needs a rebuild, not a restart — see the note in frontend/README.md.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Lockfile first: this layer is cached until the dependency files change.
# `npm ci` installs exactly what package-lock.json records and never resolves anything new.
COPY package.json package-lock.json .npmrc ./
RUN npm ci && npm cache clean --force

COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

FROM node:20.18.1-alpine3.20@sha256:9b5af1cc895fe7231c351cc1ea653322742091fb5d1ea8f1eb404c11e2b4da56 AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

# Only the built site and the server. No node_modules: the server has no dependencies.
COPY --from=build /app/dist ./dist
COPY server.mjs ./

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
