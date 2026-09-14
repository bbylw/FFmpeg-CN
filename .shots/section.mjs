// 单区截图：高频操作胶囊行（亮色桌面 + 暗色移动）
import { createRequire } from "node:module";
const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--headless=new", "--force-prefers-reduced-motion"],
});
const shots = [
  { theme: "light", w: 1440, h: 900, name: "recipes-light-desk" },
  { theme: "dark", w: 390, h: 844, name: "recipes-dark-mob" },
];
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    colorScheme: s.theme,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  await page.goto("https://ffmpeg-cn.localhost/", { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const el = page.locator("#recipe-scroll");
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await page.locator("section:has(#recipe-scroll)").boundingBox();
  await page.screenshot({
    path: `.shots/png/${s.name}.png`,
    clip: { x: 0, y: box.y, width: s.w, height: Math.min(box.height, 700) },
  });
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return de.scrollWidth - de.clientWidth;
  });
  console.log(s.name, "page overflow:", overflow);
  await ctx.close();
}
await browser.close();
