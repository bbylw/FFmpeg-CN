// dist 静态服务器（仅本机验收用，127.0.0.1 直连）
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "dist");
const PORT = Number(process.env.PORT || 8199);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    let p = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!p.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    let s = await stat(p).catch(() => null);
    if (s?.isDirectory()) p = path.join(p, "index.html"), (s = await stat(p));
    if (!s) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": TYPES[path.extname(p)] || "application/octet-stream",
    });
    res.end(await readFile(p));
  } catch {
    res.writeHead(500).end();
  }
}).listen(PORT, "127.0.0.1", () => console.log(`serving dist on 127.0.0.1:${PORT}`));
