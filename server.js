// ============================================================
// Tiny static SPA server for production (Railway, Render, etc).
// Uses only Node built-ins so there are no extra deps to install
// in production. Serves the Vite-built `dist/` folder and falls
// back to index.html for any unmatched route (client-side routing).
// ============================================================

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const distDir = join(__dirname, "dist");
const port = parseInt(process.env.PORT || "3000", 10);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

async function tryServe(filePath) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error("not a file");
  const body = await readFile(filePath);
  return { body, ext: extname(filePath).toLowerCase() };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://x");
    // Normalize and prevent path traversal
    const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(distDir, safePath === "/" ? "index.html" : safePath);

    let result;
    try {
      result = await tryServe(filePath);
    } catch {
      // SPA fallback — serve index.html for unmatched routes
      filePath = join(distDir, "index.html");
      result = await tryServe(filePath);
    }

    // Hash-named JS/CSS assets are immutable; long cache them
    const isHashedAsset = /\/assets\/[^/]+\.[a-f0-9]{8,}\./i.test(safePath);
    res.setHeader(
      "Cache-Control",
      isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache"
    );
    res.setHeader("Content-Type", MIME[result.ext] || "application/octet-stream");
    res.statusCode = 200;
    res.end(result.body);
  } catch (err) {
    res.statusCode = 500;
    res.end("Internal server error");
    console.error("server error:", err);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${port}`);
});
