# SITE.md · ffmpeg-cn 项目与部署说明

FFmpeg 中文站：营销首页 + 完整中文文档站。仓库根 `README.md` 保持 FFmpeg 官方中文 README 原样，项目自身说明写在本文件。

## 技术栈

- [Astro 7](https://astro.build/)（静态输出）+ TypeScript
- Tailwind CSS v4（`@tailwindcss/vite` 插件，无 postcss 配置）
- MDX 内容集合（`@astrojs/mdx` + `@astrojs/markdown-remark` 的 `unified()` 处理器管线）
- Bun 作为包管理与脚本运行器
- 字体自托管：`@fontsource/space-grotesk`（拉丁显示/正文）+ `@fontsource/ibm-plex-mono`（代码），中文走系统字体栈。
  声明写在 `src/styles/fonts.css`，**只引 woff2**——@fontsource 现成的 `latin-500.css` 会把 woff/ttf 一起写进 `src` 列表，产物里白多几百 KB。
- 图标：`@phosphor-icons/web` 的 `ph ph-*` 类名（避免 react 版缺失导出问题），但**不整包引入它的 CSS**。
  `scripts/build-icons.mjs` 扫描 `src/` 里实际用到的图标，只生成这些字形到 `src/styles/icons.css`，
  字体裁到单一 woff2（`public/fonts/phosphor-regular.woff2`）。
  全量 CSS 是 78KB/每页、字体资源 4MB；本站只用十几个图标，子集后是 1.8KB + 144KB。
  **新增图标后必须跑 `bun run icons`**；该脚本同时是拼写守卫，类名不存在会直接报错
  （历史上 `ph-magnifier-lg`、`ph-heart-bold` 就是拼错后静默不显示）。`bun run check` 会校验子集是否过期。

## 设计语言

终端暗色为默认（品牌即 ffmpeg.org 自身的 #171717 + 信号绿），亮色为「纸面 + 深绿信号」翻转。核心 tokens 在 `src/styles/global.css`：`--color-accent` 与 `--color-accent-ink` 随 `html[data-theme]` 成对翻转，全站 `bg-accent text-accent-ink` 组合两种模式自动保持对比。圆角规则：卡片/瓦片 12px（`--radius-tile`），代码块 10px（`--radius-code`），交互按钮全胶囊。

首屏核心视觉是纯 SVG + CSS 变量的「媒体管线」组件（`src/components/PipelineVisual.astro`）：解流 → 解码 → 滤镜 → 编码 → 混流，含字幕 `-c:s copy` 虚线通道与沿线流动的 packet；小屏自动切换竖排简化版；`prefers-reduced-motion` 下静态。

## 目录结构

```
src/
  content.config.ts      # docs 集合（glob loader）
  content/docs/*.mdx     # 20 篇中文文档（frontmatter: title/description/group/order/source）
  lib/md-slug.ts         # 标题锚点 slug：rehype 插件、搜索索引、本页目录共用
  lib/site.ts            # 分组、导航、官方链接常量
  layouts/Base.astro     # 外壳：字体、主题 boot 脚本、SEO/OG/结构化数据
  layouts/DocsLayout.astro # 文档壳：侧栏 + 正文 + 本页目录 + 前后篇 + 小屏折叠目录
  components/            # 头部/尾部/搜索/标记/管线视觉
  styles/global.css      # 设计令牌 + 文档排版
  styles/fonts.css       # 文本/代码字体的 woff2-only @font-face
  styles/icons.css       # 生成的图标子集（勿手改）
  pages/                 # / 首页，/docs/ 目录页，/docs/[slug] 文档，/404，/search-index.json
scripts/
  build-icons.mjs        # 生成图标子集 + 拼写守卫（bun run icons / --check）
  build-assets.mjs       # 生成 OG 分享图与触屏图标（bun run assets）
public/
  fonts/phosphor-regular.woff2  # 图标子集字体（由 build-icons 产出，入库）
  og.png                 # 1200×630 分享图（由 build-assets 从站点自身渲染）
.sources/                # 抓取存档（官方英文 HTML + 子代理翻译规范 CONVENTIONS.md）
.shots/                  # 无头验收脚本与截图（png 不入库）
```

## 本地开发

```bash
bun install
bun run dev        # astro dev
bun run build      # 产出 dist/，23 页 + sitemap + search-index.json
bun run check      # astro check（含图标子集过期校验）
bun run icons      # 改动图标类名后重新生成 src/styles/icons.css
bun run assets     # 重新生成 public/og.png 与 apple-touch-icon.png（需先起 .shots/serve.mjs）
```

> `astro check` 需要 TypeScript 6.x：TS 7 还没提供它依赖的编译 API，装 7 会直接报错。版本已在 package.json 里锁定。

验收脚本（依赖本机 `~/.pwl` 的 playwright-core 与系统 Chrome）：

```bash
node .shots/serve.mjs &        # 127.0.0.1:8199 直连 dist
node .shots/verify.mjs         # 明暗×桌面/移动截图 + 溢出/破折号/重复id/对比度断言
node .shots/interact.mjs       # 主题切换、Ctrl+K 搜索（含方向键/焦点归还）、TOC、移动菜单、图标字形
node .shots/overflow.mjs       # 列出某页超出视口右侧的元素（默认 390px 宽）
node .shots/check-mdx.mjs      # 用 mdx-js 引擎预检所有 MDX（<url> autolink 等坑）
```

给人看的预览一律走 portless：`portless ffmpeg-cn bun run preview`（真实 URL 从 `portless list` 读）。重建后必须重启 preview，避免旧 dist 缓存。

## 发布前检查清单（需用户点头后才执行）

1. `astro.config.mjs` 与 `public/robots.txt` 中的占位域名 `https://ffmpeg.localhost.placeholder` 换成最终域名。
2. 创建 GitHub 仓库并推送（master 分支），启用 Pages（workflow 已备好在 `.github/workflows/deploy.yml`）。
3. 自定义域名用 `gh api` 设置 `cname` 字段（不要往 public/ 放 CNAME 文件），DNS 生效后 HTTPS 由 GitHub 自动签发。
4. 线上抽查：明暗主题、搜索、移动端、`/404.html`、`/sitemap-index.xml`。

## 内容来源与授权

全部译自 ffmpeg.org 官方手册（存档见 `.sources/`，各页 frontmatter `source` 字段标注原始 URL）与 FFmpeg 源码仓库 `doc/` 目录；命令、选项、名称逐字保留，页脚声明以官方英文手册为准。当前内容基线：FFmpeg 8.1 "Hoare"（2026-03-16）。
