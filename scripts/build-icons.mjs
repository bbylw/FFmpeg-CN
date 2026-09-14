// 图标子集生成器。
//
// 背景：@phosphor-icons/web 的 regular/style.css 包含 900+ 个字形的 content 规则
// （78KB，每页都要下载）并把 woff2/woff/ttf/svg 四个字体源一起丢进产物（4MB）。
// 本站只用十几个图标，因此这里扫描源码里实际出现的 ph-* 类名，只生成本站需要的
// 字形规则，并把字体裁到单一 woff2 源。
//
// 顺带当成拼写守卫：源码里出现任何既不是已知图标、也不是字重修饰符的 ph-* 记号，
// 直接报错退出（历史上 `ph-magnifier-lg`、`ph-heart-bold` 就是拼错后静默不可见的）。
//
// 用法：bun run icons
import { readdir, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PKG_DIR = path.join(ROOT, "node_modules/@phosphor-icons/web/src/regular");
const SRC_DIR = path.join(ROOT, "src");
const OUT_CSS = path.join(ROOT, "src/styles/icons.css");
const OUT_FONT = path.join(ROOT, "public/fonts/phosphor-regular.woff2");
const FONT_URL = "/fonts/phosphor-regular.woff2";

// 字重修饰符不是独立图标，它们切换字体族；本站只带 regular，用到即报错。
const WEIGHT_CLASSES = new Set([
  "ph-bold",
  "ph-fill",
  "ph-duotone",
  "ph-light",
  "ph-thin",
  "ph-face-mask",
]);

const SCAN_EXT = new Set([".astro", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".html"]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (SCAN_EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const pkgCss = await readFile(path.join(PKG_DIR, "style.css"), "utf8");
const glyphOf = new Map();
for (const m of pkgCss.matchAll(/\.ph\.ph-([a-z0-9-]+):before\s*\{\s*content:\s*"([^"]+)"/g)) {
  glyphOf.set(m[1], m[2]);
}

// 扫描源码：收集所有 ph-* 记号
const tokens = new Map(); // token -> Set<相对文件>
for (const file of await walk(SRC_DIR)) {
  const text = await readFile(file, "utf8");
  for (const m of text.matchAll(/\bph-[a-z0-9-]+\b/g)) {
    const rel = path.relative(ROOT, file);
    if (!tokens.has(m[0])) tokens.set(m[0], new Set());
    tokens.get(m[0]).add(rel);
  }
}

const used = [];
const problems = [];
for (const [token, files] of tokens) {
  if (WEIGHT_CLASSES.has(token)) {
    problems.push(`${token} 是字重修饰符，但本站只打包 regular 字族（${[...files].join(", ")}）`);
    continue;
  }
  const name = token.slice(3);
  const glyph = glyphOf.get(name);
  if (!glyph) {
    problems.push(`"${token}" 不是 Phosphor 图标名（${[...files].join(", ")}）`);
    continue;
  }
  used.push({ token, name, glyph });
}

if (problems.length) {
  console.error("图标检查未通过：");
  for (const p of problems) console.error("  - " + p);
  console.error("\n可用图标名见 node_modules/@phosphor-icons/web/src/regular/style.css");
  process.exit(1);
}

used.sort((a, b) => a.name.localeCompare(b.name));

// 前缀（@font-face + .ph 基础规则）原样取自包，只把字体源换成单一 woff2
const prefixEnd = pkgCss.search(/\.ph\.ph-[a-z0-9-]+:before/);
if (prefixEnd < 0) throw new Error("无法定位 Phosphor 基础规则段");
let prefix = pkgCss.slice(0, prefixEnd);
prefix = prefix.replace(
  /src:\s*[\s\S]*?;\n/,
  `src: url("${FONT_URL}") format("woff2");\n`
);
if (!prefix.includes(FONT_URL)) throw new Error("字体源替换失败");

const banner = `/* 由 scripts/build-icons.mjs 生成，请勿手改。
   仅包含 src/ 中实际使用的 ${used.length} 个字形；新增图标后跑一次 bun run icons。
   图标来源：@phosphor-icons/web（MIT）。 */
`;

const glyphs = used
  .map(({ name, glyph }) => `.ph.ph-${name}:before {\n  content: "${glyph}";\n}\n`)
  .join("\n");

const content = banner + prefix.trimEnd() + "\n\n" + glyphs;

if (process.argv.includes("--check")) {
  // 只校验不写入：CI / bun run check 用，防止改了图标类名却忘了重新生成
  const current = await readFile(OUT_CSS, "utf8").catch(() => null);
  if (current !== content) {
    console.error("src/styles/icons.css 与源码不一致：请运行 bun run icons 后提交生成结果。");
    process.exit(1);
  }
  console.log(`icons.css 已是最新（${used.length} 个字形）`);
} else {
  await mkdir(path.dirname(OUT_FONT), { recursive: true });
  await copyFile(path.join(PKG_DIR, "Phosphor.woff2"), OUT_FONT);
  await writeFile(OUT_CSS, content, "utf8");
  console.log(`icons.css 已生成：${used.length} 个字形`);
  console.log("  " + used.map((u) => u.token).join(" "));
}
