// 找出移动端页面上超出视口右侧的元素
import { createRequire } from "node:module";
const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");

const url = process.argv[2] || "http://127.0.0.1:8199/";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--headless=new"],
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: "load" });
const bad = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 && r.width > 0) {
      const cls =
        el.className && el.className.baseVal !== undefined
          ? String(el.className.baseVal)
          : String(el.className);
      out.push(
        `${el.tagName}.${cls.slice(0, 60)} right=${Math.round(r.right)} w=${Math.round(r.width)} parent=${el.parentElement?.tagName}.${String(el.parentElement?.className).slice(0, 40)}`
      );
      if (out.length > 12) break;
    }
  }
  return out;
});
console.log(bad.join("\n") || "无溢出元素");
await browser.close();
