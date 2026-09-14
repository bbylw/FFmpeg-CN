import type { APIRoute } from "astro";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createSlugger } from "../lib/md-slug";

export const prerender = true;

type Hit = { t: string; s: string; h: string; u: string; x: string };

const DOCS_DIR = path.resolve(process.cwd(), "src/content/docs");

function parseFrontmatter(src: string): { meta: Record<string, string>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  const meta: Record<string, string> = {};
  if (!m) return { meta, body: src };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

// 按 h2/h3 切节；跳过代码围栏；压缩空白；每节正文截断以控制体积
function sections(body: string, title: string, url: string): Hit[] {
  const slug = createSlugger();
  const out: Hit[] = [];
  let cur = { s: "概述", h: "", text: "" as string };
  let inFence = false;
  const push = () => {
    // 截断长度直接决定索引体积（首次搜索才下载），180 字足够展示一行上下文
    const x = cur.text.replace(/\s+/g, " ").replace(/`/g, "").trim().slice(0, 180);
    out.push({ t: title, s: cur.s, h: cur.h, u: url + (cur.h ? `#${cur.h}` : ""), x });
  };
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      if (cur.text.trim()) push();
      const text = heading[2].replace(/[*_`]/g, "").trim();
      cur = { s: text, h: slug(text), text: "" };
      continue;
    }
    cur.text += " " + line.replace(/^#{1,6}\s+/, "").replace(/[*_]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  }
  if (cur.text.trim()) push();
  return out;
}

export const GET: APIRoute = async () => {
  const files = (await readdir(DOCS_DIR)).filter((f) => f.endsWith(".mdx"));
  const hits: Hit[] = [];
  for (const file of files) {
    const src = await readFile(path.join(DOCS_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(src);
    const title = meta.title || file.replace(/\.mdx$/, "");
    const url = `/docs/${file.replace(/\.mdx$/, "")}/`;
    hits.push(...sections(body, title, url));
  }
  return new Response(JSON.stringify(hits), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
