// 生成分享图与触屏图标。
//
// og.png 直接从站点自身渲染（1200×630 视口截图），保证配色、字体、管线视觉与线上一致；
// apple-touch-icon.png 由 favicon 的几何在实底上重绘 180×180（iOS 会自己套圆角遮罩，
// 所以这里不能再用圆角方框，否则会看到二次圆角）。
//
// 依赖本机 Chrome 与已运行的 dist 服务：
//   node .shots/serve.mjs &   # 127.0.0.1:8199
//   bun run assets
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, "public");
const BASE = process.env.SHOT_BASE || "http://127.0.0.1:8199";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await mkdir(PUBLIC_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--headless=new", "--force-prefers-reduced-motion"],
});

// 1) OG 分享图：暗色（品牌默认）+ 冻结管线动画
{
  const ctx = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    colorScheme: "dark",
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "html::-webkit-scrollbar{display:none} html{scrollbar-width:none}",
  });
  await page.waitForTimeout(200);
  const file = path.join(PUBLIC_DIR, "og.png");
  await page.screenshot({ path: file });
  console.log("og.png 已生成 1200×630");
  await ctx.close();
}

// 2) 触屏图标：实底 + 居中播放三角
{
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="180" height="180">
  <rect width="64" height="64" fill="#121513"/>
  <path d="M25 19 L45 32 L25 45 Z" fill="#5fc968"/>
  <rect x="14" y="19" width="5" height="26" rx="2.5" fill="#5fc968" opacity="0.55"/>
</svg>`;
  const ctx = await browser.newContext({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<body style="margin:0;width:180px;height:180px;overflow:hidden">${svg}</body>`
  );
  await page.screenshot({ path: path.join(PUBLIC_DIR, "apple-touch-icon.png") });
  console.log("apple-touch-icon.png 已生成 180×180");
  await ctx.close();
}

await browser.close();
