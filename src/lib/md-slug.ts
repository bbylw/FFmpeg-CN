// 标题锚点 slug：内容渲染（rehype）、本页目录、搜索索引共用同一算法，
// 保证三者一致。保留 CJK 与字母数字，空白转连字符。

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{Letter}\p{Number}_-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** 与浏览器/文档内实际 id 对应：同页重名标题追加 -n */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    let base = slugify(text);
    if (!base) base = "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    if (n === 0) return base;
    return `${base}-${n}`;
  };
}

// rehype 插件：为 h1-h4 补 id（已存在则跳过）
export function rehypeHeadingIds() {
  return (tree: any) => {
    const slug = createSlugger();
    visitHeading(tree, (node: any) => {
      const props = (node.properties ??= {});
      if (props.id) return;
      const text = textOf(node);
      const id = slug(text);
      if (id) props.id = id;
    });
  };
}

function visitHeading(node: any, cb: (n: any) => void) {
  if (
    node.type === "element" &&
    ["h1", "h2", "h3", "h4"].includes(node.tagName)
  ) {
    cb(node);
  }
  (node.children ?? []).forEach((c: any) => visitHeading(c, cb));
}

function textOf(node: any): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}
