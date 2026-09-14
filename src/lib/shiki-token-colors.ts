// 代码高亮 token 颜色的归一化。
//
// 主题（vitesse）交出来的颜色有两类问题，在文档站都会被放大：
//
// 1. 标点（字符串引号一类）写成带 alpha 的色值，例如 `#C98A7D77`（47% 不透明度）。
//    本站手册大篇幅讲 shell 引用，引号本身就是语义的一部分，压到 47% 之后
//    在暗色底上只剩 2.36:1。
// 2. 个别 token 的颜色本身就不足 WCAG AA，例如 vitesse-light 的字符串色 `#B56959`
//    在白底上只有 4.09:1。
//
// 这里在生成 HAST 阶段统一处理：先去掉 alpha，再对每个 token 做对比度钳制
// （朝远离背景的方向混色，二分出「刚好达标」的比例，尽量不改动观感）。
//
// 为什么必须在构建期做：Shiki 把色值内联成 `--shiki-light` / `--shiki-dark` 两个
// CSS 变量，内联样式优先级最高，样式表既无法提高变量里的 alpha，也无法重算对比度。
//
// 注意：Shiki 4 的逐 token 钩子叫 `span`，旧的 `token` 钩子已移除；而这里选择在
// `pre` 钩子里遍历整棵子树，因为只有 pre 上带着 `--shiki-*-bg`，钳制需要知道背景。
// 钩子键名写错不会报错，只会静默失效，改完务必复测对比度。

type HastNode = {
  properties?: Record<string, unknown>;
  children?: HastNode[];
  type?: string;
};

/** WCAG AA 正文门槛。取 4.51 而不是 4.5：钳制算的是浮点混色，落盘时要四舍五入到
 *  hex，这一舍会吃掉约 0.01；留 0.01 余量，保证实测值也在线上。 */
const MIN_CONTRAST = 4.51;

/** 浅色代码块的真实背景（global.css 里 .astro-code 钉的纸面 tint）。
 *  Shiki 内联的 --shiki-light-bg 还是纯白，不能直接拿来当钳制基准——
 *  按纯白算到刚好 4.5 的临界色（如绿色 #568238）在 tint 上只剩约 4.1。
 *  改了 global.css 的底色必须同步改这里，两处注释里互相指了路。 */
const LIGHT_BG_OVERRIDE = "#f1f3ea";

type RGB = [number, number, number];

function parseColor(input: string): { rgb: RGB; alpha: number } | null {
  const v = input.trim();
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    return {
      rgb: [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ],
      alpha: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(v);
  if (!fn) return null;
  const a = fn[4];
  return {
    rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])],
    alpha: a ? (a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a)) : 1,
  };
}

const toHex = (rgb: RGB): string =>
  "#" +
  rgb
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
    .join("");

/** 浮点混色结果落盘为 hex。`Math.round` 舍入最多吃掉约 0.02 对比度，
 *  所以落盘后再验一次：不够就往远离背景的方向小步推，直到达标
 *  （单调收敛，8 步内必到；本来就达标的颜色原样返回，不产生 diff 噪音）。 */
function finalize(fg: RGB, bg: RGB, min = MIN_CONTRAST): string {
  const away: RGB = luminance(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  let cur = fg;
  let hex = toHex(cur);
  for (let i = 0; i < 8; i++) {
    const back = parseColor(hex);
    if (!back || contrast(back.rgb, bg) >= min) break;
    cur = mix(cur, away, 0.05);
    hex = toHex(cur);
  }
  return hex;
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: RGB, bg: RGB): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** 达标就原样返回；不达标则朝远离背景的一端混色，二分出刚好达标的最小改动 */
function clampContrast(fg: RGB, bg: RGB, min = MIN_CONTRAST): RGB {
  if (contrast(fg, bg) >= min) return fg;
  const away: RGB = luminance(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (contrast(mix(fg, away, mid), bg) >= min) hi = mid;
    else lo = mid;
  }
  return mix(fg, away, hi);
}

type Backgrounds = { light?: RGB; dark?: RGB };

function readVar(style: string, name: string): string | null {
  const m = new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(style);
  return m ? m[1].trim() : null;
}

/** 注意别把 `--shiki-light-bg` 也改掉：正则要求 light/dark 后紧跟冒号 */
function normalizeStyle(style: string, bgs: Backgrounds): string {
  return style.replace(
    /(--shiki-(light|dark)\s*:\s*)([^;]+)/g,
    (whole: string, prefix: string, which: string, value: string) => {
      const parsed = parseColor(value);
      if (!parsed) return whole;
      const bg = which === "light" ? bgs.light : bgs.dark;
      // 先丢掉 alpha（与背景无关，纯粹把被压暗的颜色还原回主题设定的浓度）
      const fixed = bg ? clampContrast(parsed.rgb, bg) : parsed.rgb;
      return prefix + (bg ? finalize(fixed, bg) : toHex(fixed));
    }
  );
}

function walk(node: HastNode, bgs: Backgrounds): void {
  for (const child of node.children ?? []) {
    const style = child.properties?.style;
    if (typeof style === "string" && style.includes("--shiki-")) {
      child.properties!.style = normalizeStyle(style, bgs);
    }
    walk(child, bgs);
  }
}

export function normalizeTokenColors() {
  return {
    name: "normalize-token-colors",
    pre(node: HastNode) {
      const style = typeof node.properties?.style === "string" ? node.properties.style : "";
      const bgs: Backgrounds = {
        light: parseColor(LIGHT_BG_OVERRIDE)?.rgb,
        dark: parseColor(readVar(style, "--shiki-dark-bg") ?? "")?.rgb,
      };
      if (style) node.properties!.style = normalizeStyle(style, bgs);
      walk(node, bgs);
    },
  };
}
