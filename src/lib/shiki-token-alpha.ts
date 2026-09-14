// 去掉代码高亮 token 颜色里的 alpha。
//
// vitesse 这套主题给标点（字符串引号一类）写的是带 alpha 的色值，例如 `#C98A7D77`
// （47% 不透明度）。多数项目看不出来，但本站手册大篇幅在讲 shell 引用与转义，
// 引号本身就是语义的一部分，被压到 47% 之后在暗色底上只剩 2.36:1，几乎读不出来。
//
// Shiki 会把色值内联成 `--shiki-light` / `--shiki-dark` 两个 CSS 变量，样式表无法
// 反向提高变量里的 alpha（内联样式优先级最高），所以只能在生成 HAST 这一步改写。

type HastNode = {
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

// 8 位 hex 去掉末尾 alpha 对；顺带兜住主题里可能出现的 rgba() 写法
const ALPHA_HEX = /(--shiki-(?:light|dark)\s*:\s*)(#[0-9a-f]{6})[0-9a-f]{2}\b/gi;
const ALPHA_RGBA =
  /(--shiki-(?:light|dark)\s*:\s*)rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/gi;

function stripAlpha(style: string): string {
  return style
    .replace(ALPHA_HEX, "$1$2")
    .replace(ALPHA_RGBA, "$1rgb($2, $3, $4)");
}

function stripOn(node: HastNode): void {
  const style = node.properties?.style;
  if (typeof style !== "string") return;
  const next = stripAlpha(style);
  if (next !== style) node.properties!.style = next;
}

export function stripTokenAlpha() {
  return {
    name: "strip-token-alpha",
    // 注意：Shiki 4 里逐个 token 的钩子叫 span（旧的 token 钩子已移除，写错不会报错、只会静默失效）
    pre(node: HastNode) {
      stripOn(node);
    },
    span(node: HastNode) {
      stripOn(node);
      return node;
    },
  };
}
