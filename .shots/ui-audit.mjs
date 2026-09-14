// UI 打磨用的取证脚本：按选择器截取单个区块（原始比例，不缩放全页），
// 并顺带量一批「细节正确性」的事实（锚点偏移、焦点环、数字对齐、滚动条等）。
//
//   node .shots/ui-audit.mjs            # 只出测量结果
//   node .shots/ui-audit.mjs --shots    # 顺便把区块截图写到 .shots/png/
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");

const BASE = process.env.AUDIT_BASE || "http://127.0.0.1:8199";
const OUT = ".shots/png";
const SHOTS = process.argv.includes("--shots");
if (SHOTS) mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--headless=new", "--force-prefers-reduced-motion"],
});

// 1) 锚点跳转是否被吸顶头部遮住（TOC / 面包屑 / 搜索结果都走这条路）
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/docs/syntax/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const firstHref = await page.locator("#toc a").first().getAttribute("href");
  await page.locator("#toc a").first().click();
  await page.waitForTimeout(700);
  const r = await page.evaluate((h) => {
    const el = document.querySelector(h);
    const header = document.querySelector("header");
    const eb = el.getBoundingClientRect();
    const hb = header.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      heading: Math.round(eb.top),
      headerBottom: Math.round(hb.bottom),
      covered: Math.round(hb.bottom - eb.top),
      scrollMarginTop: cs.scrollMarginTop,
    };
  }, firstHref);
  console.log(`锚点: 标题 top=${r.heading} 头部底=${r.headerBottom} 被遮挡=${r.covered}px scroll-margin-top=${r.scrollMarginTop}`);
  await page.close();
}

// 2) 焦点环现状：键盘 Tab 到第一个链接，看有没有自定义 outline
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/docs/syntax/", { waitUntil: "load" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const r = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.textContent || "").trim().slice(0, 18),
      outline: cs.outlineStyle + " " + cs.outlineWidth + " " + cs.outlineColor,
      boxShadow: cs.boxShadow,
      hasFocusVisible: el.matches(":focus-visible"),
    };
  });
  console.log(`焦点环: ${r.tag}「${r.text}」:focus-visible=${r.hasFocusVisible} outline=${r.outline}`);
  await page.close();
}

// 3) 数字与滚动条细节
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/docs/formats/", { waitUntil: "load" });
  const r = await page.evaluate(() => {
    const td = document.querySelector(".prose-doc tbody td");
    const h2 = document.querySelector(".prose-doc h2");
    const sidebar = document.querySelector("aside nav");
    const pre = document.querySelector(".prose-doc pre");
    const cs = (e) => (e ? getComputedStyle(e) : null);
    return {
      tdNumeric: cs(td)?.fontVariantNumeric,
      h2Wrap: cs(h2)?.textWrap,
      h1Wrap: cs(document.querySelector(".prose-doc h1"))?.textWrap,
      sidebarScrollbar: cs(sidebar)?.scrollbarWidth,
      preScrollbar: cs(pre)?.scrollbarWidth,
    };
  });
  console.log("数字/换行/滚动条:", JSON.stringify(r));
  await page.close();
}

// 4)「最新发行」左右两栏的首个版本号是否在同一水平线上
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + "/", { waitUntil: "load" });
  const r = await page.evaluate(() => {
    const sec = document.querySelector("main > section:has(a[href='/docs/releases/'])");
    const card = sec.querySelector(".rounded-tile");
    const cardTitle = card.querySelector("p.font-mono");
    const rowVer = sec.querySelector("ol li span.font-mono");
    const mid = (e) => {
      const b = e.getBoundingClientRect();
      return Math.round(b.top + b.height / 2);
    };
    return { cardTitleMid: mid(cardTitle), rowVerMid: mid(rowVer) };
  });
  console.log(
    `发行区首行: 卡片版本中线=${r.cardTitleMid} 时间线版本中线=${r.rowVerMid} 相差=${r.rowVerMid - r.cardTitleMid}px`
  );
  await page.close();
}

// 5) 区块原比例截图
if (SHOTS) {
  const SHOTS_LIST = [
    { name: "polish-hero-dark", url: "/", sel: "main > section:first-of-type", w: 1440, theme: "dark" },
    { name: "polish-hero-light", url: "/", sel: "main > section:first-of-type", w: 1440, theme: "light" },
    { name: "polish-libs-dark", url: "/", sel: "main > section:nth-of-type(2)", w: 1440, theme: "dark" },
    { name: "polish-release-dark", url: "/", sel: "main > section:has(a[href='/docs/releases/'])", w: 1440, theme: "dark" },
    { name: "polish-release-light", url: "/", sel: "main > section:has(a[href='/docs/releases/'])", w: 1440, theme: "light" },
    { name: "polish-docs-light", url: "/docs/syntax/", sel: ".prose-doc", w: 1440, theme: "light" },
    { name: "polish-docs-dark", url: "/docs/formats/", sel: ".prose-doc", w: 1440, theme: "dark" },
  ];
  for (const s of SHOTS_LIST) {
    const ctx = await browser.newContext({
      viewport: { width: s.w, height: 900 },
      colorScheme: s.theme,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(BASE + s.url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const el = page.locator(s.sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await el.boundingBox();
    await page.screenshot({
      path: `${OUT}/${s.name}.png`,
      clip: { x: 0, y: Math.round(box.y), width: s.w, height: Math.min(Math.round(box.height), 1200) },
    });
    console.log(`shot ${s.name} h=${Math.round(box.height)}`);
    await ctx.close();
  }
}

await browser.close();
