// 用真正的 MDX 引擎逐文件编译，报出全部解析错误位置
import { compile } from "@mdx-js/mdx";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const dir = "src/content/docs";
let bad = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".mdx"))) {
  const src = readFileSync(path.join(dir, f), "utf8");
  try {
    await compile(src, { format: "mdx" });
  } catch (err) {
    bad++;
    const loc = err.line ? `:${err.line}:${err.column}` : "";
    console.log(`FAIL ${f}${loc}  ${String(err.message).split("\n")[0]}`);
    if (err.line) {
      const lines = src.split(/\r?\n/);
      for (let i = Math.max(0, err.line - 2); i < Math.min(lines.length, err.line + 1); i++) {
        console.log(`   ${i + 1}| ${lines[i].slice(0, 120)}`);
      }
    }
  }
}
console.log(bad ? `${bad} 个文件失败` : "全部 MDX 解析通过");
