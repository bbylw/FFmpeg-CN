// 把代码围栏外的 <https://...> autolink 转成 [url](url)
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const dir = "src/content/docs";
let total = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
  const lines = readFileSync(path.join(dir, f), "utf8").split(/\r?\n/);
  let fence = null;
  let n = 0;
  const out = lines.map((l) => {
    const t = l.trim();
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      return l;
    }
    if (/^(```|~~~)/.test(t)) {
      fence = t.slice(0, 3);
      return l;
    }
    const replaced = l.replace(
      /<((?:https?|ftps?|file):\/\/[^>\s]+)>/g,
      (_m, url) => {
        n++;
        return `[${url}](${url})`;
      }
    );
    return replaced;
  });
  if (n) {
    writeFileSync(path.join(dir, f), out.join("\n"), "utf8");
    console.log(`${f}: ${n} 处`);
    total += n;
  }
}
console.log(`共替换 ${total} 处`);
