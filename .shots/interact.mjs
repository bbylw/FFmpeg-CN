// 交互回归：主题切换、搜索、移动菜单、TOC、锚点、复制不了的东西不测
import { createRequire } from "node:module";
const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");
const BASE = "http://127.0.0.1:8199";
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--headless=new", "--force-prefers-reduced-motion"],
});

// 桌面：主题切换 + 搜索 + TOC
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(BASE + "/docs/syntax/", { waitUntil: "load" });
await page.waitForTimeout(300);

// TOC 生成
const tocLinks = await page.locator("#toc a").count();
ok(tocLinks >= 5, `TOC 条目过少: ${tocLinks}`);
const firstHref = await page.locator("#toc a").first().getAttribute("href");
const targetExists = await page.evaluate((h) => !!document.querySelector(h), firstHref);
ok(targetExists, `TOC 锚点失效: ${firstHref}`);

// 主题切换持久
await page.click("#theme-toggle");
const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
ok(t1 === "light", `切换后 theme=${t1}`);
await page.reload({ waitUntil: "load" });
const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
ok(t2 === "light", `刷新后 theme=${t2}（localStorage 未生效）`);
await page.evaluate(() => localStorage.removeItem("theme"));

// 搜索：Ctrl+K 打开、输入命中、回车可跳转
await page.keyboard.press("Control+k");
await page.waitForTimeout(150);
ok(await page.locator("#search-root").isVisible(), "Ctrl+K 未打开搜索");
await page.fill("#search-input", "声道");
await page.waitForTimeout(600);
const hits = await page.locator("#search-results a").count();
ok(hits > 0, "搜索「声道」无结果");
const href0 = await page.locator("#search-results a").first().getAttribute("href");
await page.screenshot({ path: ".shots/png/search.png" });
await page.keyboard.press("Escape");
ok(!(await page.locator("#search-root").isVisible()), "Esc 未关闭搜索");
await page.goto(BASE + href0, { waitUntil: "load" });
ok(await page.evaluate(() => location.hash.length > 1), "结果链接不含锚点");

// 搜索可访问性：listbox/option 语义、方向键高亮、关闭后焦点归还触发按钮
await page.goto(BASE + "/", { waitUntil: "load" });
await page.click("#search-open");
await page.waitForTimeout(400);
await page.fill("#search-input", "声道");
await page.waitForTimeout(500);
const optCount = await page.locator('#search-results [role="option"]').count();
ok(optCount > 0, "搜索结果缺少 role=option");
const ad0 = await page.getAttribute("#search-input", "aria-activedescendant");
ok(ad0 === "search-option-0", `初始高亮不是第一项：${ad0}`);
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(80);
const ad1 = await page.getAttribute("#search-input", "aria-activedescendant");
ok(ad1 === "search-option-1", `方向键未更新 aria-activedescendant：${ad1}`);
await page.keyboard.press("Escape");
const restored = await page.evaluate(() => document.activeElement && document.activeElement.id);
ok(restored === "search-open", `关闭搜索后焦点未归还按钮：${restored}`);

// 图标：每个 .ph 元素都必须取到字形（类名拼错或子集漏字都会在这里炸）
const blankIcons = await page.evaluate(() => {
  const bad = [];
  for (const el of document.querySelectorAll("i.ph")) {
    const c = getComputedStyle(el, "::before").content;
    if (!c || c === "none" || c === '""') bad.push(el.className);
  }
  return bad;
});
ok(blankIcons.length === 0, `${blankIcons.length} 个图标无字形：${blankIcons.slice(0, 3).join(" | ")}`);

// 首页 hero 截图（明暗各一）
for (const theme of ["dark", "light"]) {
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p2 = await ctx.newPage();
  await p2.goto(BASE + "/", { waitUntil: "load" });
  await p2.evaluate(() => document.fonts.ready);
  await p2.screenshot({ path: `.shots/png/hero-${theme}.png` });
  await p2.close();
}
await ctx.close();

// 移动端：菜单开合
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mctx.newPage();
await mp.goto(BASE + "/", { waitUntil: "load" });
ok(!(await mp.locator("#mobile-nav").isVisible()), "移动菜单初始可见");
await mp.click("#menu-toggle");
ok(await mp.locator("#mobile-nav").isVisible(), "点击后菜单未展开");
await mp.screenshot({ path: ".shots/png/mobile-menu.png" });

// 移动端：Esc 收起菜单并把焦点还给按钮
await mp.keyboard.press("Escape");
ok(!(await mp.locator("#mobile-nav").isVisible()), "Esc 未收起移动菜单");
const mfocus = await mp.evaluate(() => document.activeElement && document.activeElement.id);
ok(mfocus === "menu-toggle", `菜单收起后焦点未归还：${mfocus}`);

// 移动端搜索入口必须存在（此前小屏完全没有搜索按钮）
ok(await mp.locator("#search-open").isVisible(), "移动端没有搜索入口");

// 文档页小屏要有折叠目录
await mp.goto(BASE + "/docs/syntax/", { waitUntil: "load" });
await mp.locator("article details summary").click();
ok(await mp.locator("article details nav a").first().isVisible(), "移动端折叠目录展开后没有条目");
await mp.screenshot({ path: ".shots/png/docs-mobile-nav.png" });
await mctx.close();

await browser.close();
if (fails.length) {
  console.log("== 交互失败 ==");
  fails.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("交互回归全部通过");
