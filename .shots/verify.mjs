// ffmpeg-cn 无头验收：明暗 × 桌面/移动 × 关键页；量化断言 + 全页截图
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const require = createRequire("C:\\Users\\bbylw\\.pwl\\");
const { chromium } = require("playwright-core");

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:8199";
const OUT = ".shots/png";
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: "home", path: "/" },
  { name: "docs-index", path: "/docs/" },
  { name: "docs-ffmpeg", path: "/docs/ffmpeg/" },
  { name: "docs-syntax", path: "/docs/syntax/" },
  { name: "docs-filters", path: "/docs/filters/" },
  { name: "docs-download", path: "/docs/download/" },
  { name: "docs-faq", path: "/docs/faq/" },
  { name: "notfound", path: "/404.html" },
];
const MODES = [
  { theme: "dark", w: 1440, h: 900, vp: "desk" },
  { theme: "light", w: 1440, h: 900, vp: "desk" },
  { theme: "dark", w: 390, h: 844, vp: "mob" },
  { theme: "light", w: 390, h: 844, vp: "mob" },
];

const fails = [];
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--headless=new", "--force-prefers-reduced-motion"],
});

for (const mode of MODES) {
  const ctx = await browser.newContext({
    viewport: { width: mode.w, height: mode.h },
    colorScheme: mode.theme === "dark" ? "dark" : "light",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  for (const pg of PAGES) {
    const url = BASE + pg.path;
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);

    const audit = await page.evaluate(() => {
      const de = document.documentElement;
      const out = {
        overflow: de.scrollWidth - de.clientWidth,
        theme: de.dataset.theme,
        dashes: (document.body.innerText.match(/[\u2014\u2013]/g) || []).length,
        eyebrows: 0,
        h1Lines: null,
        ctaInView: null,
        navWraps: null,
        dupIds: 0,
      };
      // 明暗必须与预期一致
      // eyebrow 计数：uppercase + tracking>=0.15em 的小标签
      for (const el of document.querySelectorAll("p,span,div")) {
        const cs = getComputedStyle(el);
        if (
          cs.textTransform === "uppercase" &&
          parseFloat(cs.letterSpacing) >= 2 &&
          el.innerText &&
          el.innerText.length < 40
        )
          out.eyebrows++;
      }
      const h1 = document.querySelector("h1");
      if (h1) {
        const r = h1.getClientRects();
        const tops = new Set([...r].map((x) => Math.round(x.top)));
        out.h1Lines = tops.size;
      }
      const nav = document.querySelector("header nav[aria-label='主导航']");
      if (nav) {
        const tops = new Set(
          [...nav.querySelectorAll("a")].map((a) =>
            Math.round(a.getBoundingClientRect().top)
          )
        );
        out.navWraps = tops.size;
      }
      const cta = document.querySelector('a[href="/docs/download/"]');
      if (cta) out.ctaInView = cta.getBoundingClientRect().bottom < innerHeight;
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      out.dupIds = ids.length - new Set(ids).size;
      return out;
    });

    const tag = `${pg.name}-${mode.theme}-${mode.vp}`;
    if (audit.theme !== mode.theme)
      fails.push(`${tag}: data-theme=${audit.theme} 与预期 ${mode.theme} 不符`);
    if (audit.overflow > 0)
      fails.push(`${tag}: 横向溢出 ${audit.overflow}px`);
    if (audit.dashes > 0)
      fails.push(`${tag}: 可见 em/en dash ${audit.dashes} 处`);
    if (audit.dupIds > 0) fails.push(`${tag}: 重复 id ${audit.dupIds} 个`);
    if (mode.vp === "desk" && pg.name === "home") {
      if (audit.h1Lines > 2) fails.push(`${tag}: 首屏 h1 ${audit.h1Lines} 行`);
      if (audit.ctaInView === false) fails.push(`${tag}: CTA 不在首屏`);
    }
    if (mode.vp === "desk" && audit.navWraps && audit.navWraps > 1)
      fails.push(`${tag}: 导航折行`);
    if (errors.length) fails.push(`${tag}: JS 错误 ${errors.slice(0, 2)}`);

    await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: true });
    console.log(
      `ok ${tag} overflow=${audit.overflow} dashes=${audit.dashes} eyebrows=${audit.eyebrows}`
    );
  }
  await ctx.close();
}

// 对比度单独查：用计算样式采样关键组合
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
for (const theme of ["dark", "light"]) {
  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  const res = await page.evaluate(() => {
    const srgb = (c) => {
      const [r, g, b] = c.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => {
      const m = s.match(/[\d.]+/g);
      return m ? [m[0] * 1, m[1] * 1, m[2] * 1] : null;
    };
    const on = (bgStack, fg) => {
      let bg = [255, 255, 255];
      for (const c of bgStack) if (c && c[3] > 0.9) { bg = c; break; }
      const L1 = srgb(fg), L2 = srgb(bg);
      const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
      return (a + 0.05) / (b + 0.05);
    };
    const cs = getComputedStyle(document.documentElement);
    const vars = (n) => {
      const v = cs.getPropertyValue(n).trim();
      const m = v.match(/^#([\da-f]{6})$/i);
      if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
      const p = parse(v);
      return p ? [...p, 1] : null;
    };
    const bg = vars("--color-bg");
    const r = (x, y) => {
      const L1 = srgb(x), L2 = srgb(y);
      const [a, b] = L1 > L2 ? [L1, L2] : [L2, L1];
      return +((a + 0.05) / (b + 0.05)).toFixed(2);
    };
    return {
      ink_on_bg: r(vars("--color-ink"), bg),
      ink2_on_bg: r(vars("--color-ink-2"), bg),
      ink3_on_bg: r(vars("--color-ink-3"), bg),
      accent_on_bg: r(vars("--color-accent"), bg),
      accentink_on_accent: r(vars("--color-accent-ink"), vars("--color-accent")),
    };
  });
  console.log(`contrast[${theme}]`, JSON.stringify(res));
  for (const [k, v] of Object.entries(res)) {
    const limit = k.startsWith("ink3") || k.startsWith("accent_on") ? 3 : 4.5;
    if (v < limit) fails.push(`${theme} 对比度 ${k}=${v} < ${limit}`);
  }
}
// 代码块对比度：Shiki 双主题靠 CSS 变量接线，只接一半会整页代码不可读
for (const theme of ["dark", "light"]) {
  await page.goto(BASE + "/docs/ffmpeg/", { waitUntil: "load" });
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  const codeRes = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => {
      const m = s.match(/[\d.]+/g);
      if (!m) return null;
      return [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]];
    };
    const ratioOf = (fgRaw, bg) => {
      const fg = [0, 1, 2].map((i) => fgRaw[i] * fgRaw[3] + bg[i] * (1 - fgRaw[3]));
      const a = lum(fg);
      const b = lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const blocks = [...document.querySelectorAll("pre.astro-code")];
    if (!blocks.length) return { blocks: 0, worst: null, base: null, bg: null, sample: null };
    let worst = Infinity;
    let sample = null;
    let base = Infinity;
    for (const pre of blocks) {
      const bg = parse(getComputedStyle(pre).backgroundColor);
      if (!bg) continue;
      for (const span of pre.querySelectorAll("span")) {
        if (!span.textContent.trim()) continue;
        const raw = parse(getComputedStyle(span).color);
        if (!raw) continue;
        const ratio = ratioOf(raw, bg);
        // .line 上挂的是主题的默认前景色，也就是「代码块里的正文」
        if (span.classList.contains("line")) base = Math.min(base, ratio);
        if (ratio < worst) {
          worst = ratio;
          sample = span.textContent.trim().slice(0, 20);
        }
      }
    }
    return {
      blocks: blocks.length,
      worst: Number.isFinite(worst) ? +worst.toFixed(2) : null,
      base: Number.isFinite(base) ? +base.toFixed(2) : null,
      bg: getComputedStyle(blocks[0]).backgroundColor,
      sample,
    };
  });
  console.log(`code[${theme}]`, JSON.stringify(codeRes));
  // 正文与单个 token 统一按 WCAG AA 4.5：归一化 transformer 会保证这个下限，
  // 一旦它失效（比如钩子名写错静默不生效）这里必须炸
  if (codeRes.base !== null && codeRes.base < 4.5)
    fails.push(`${theme} 代码块正文对比度 ${codeRes.base} < 4.5（背景 ${codeRes.bg}）`);
  if (codeRes.worst !== null && codeRes.worst < 4.5)
    fails.push(
      `${theme} 有代码 token 对比度 ${codeRes.worst} < 4.5（背景 ${codeRes.bg}，样本「${codeRes.sample}」）`
    );
}

await browser.close();

if (fails.length) {
  console.log("\n== FAILURES ==");
  fails.forEach((f) => console.log(" -", f));
  process.exit(1);
}
console.log("\n全部断言通过");
