// Static file server for the built SPA.
//
// No dependencies on purpose: node:http only. The runtime image is then the same
// pinned Node base as the API, so the project has one base image to keep patched
// instead of a second, unpinned web-server image. It does three things the SPA
// needs: serve the build, fall back to index.html for client-side routes, and
// cache hashed assets forever while never caching index.html.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 8080);
const ROOT = resolve(process.env.STATIC_ROOT ?? fileURLToPath(new URL("./dist", import.meta.url)));
const INDEX = resolve(ROOT, "index.html");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const cacheFor = (pathname) =>
  pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function send(res, req, file, pathname, status = 200) {
  res.writeHead(status, {
    "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": cacheFor(pathname),
    "x-content-type-options": "nosniff",
  });
  if (req.method === "HEAD") return res.end();
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" });
    return res.end("Method Not Allowed");
  }

  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    return res.end("ok");
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  // Resolve inside ROOT only. A path that climbs out of it is refused, not served.
  const target = resolve(ROOT, `.${decoded}`);
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  if (target !== INDEX && (await isFile(target))) return send(res, req, target, decoded);

  // A missing file with an extension is a real 404 (a stale bundle, say), never HTML.
  if (extname(decoded)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    return res.end("Not Found");
  }

  // Everything else is a client-side route: hand it index.html and let the router decide.
  return send(res, req, INDEX, "/index.html");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ReFound web serving ${ROOT} on port ${PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
