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

细节约定（改 UI 时沿用，`.shots/interact.mjs` 有对应断言，`.shots/ui-audit.mjs` 可复量）：

- `--header-h: 60px` 是吸顶头部高度的唯一来源：`SiteHeader` 用它定高，`--anchor-gap = --header-h + 1rem` 用于正文标题的 `scroll-margin-top` 与两个侧栏的 `sticky top`。锚点落点被头部盖住过一次，不要再写死数字。
- 焦点环统一 `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`。浏览器默认在暗色底上是 1px 近黑描边，等于没有。
- 细滚动条统一用 `.thin-scroll`（`.prose-doc pre` / `table` 已内置），不要再单独写 `::-webkit-scrollbar`。
- 标题 `text-wrap: balance`，正文段落 `text-pretty`；首页导语的测量宽度是实测调出来的（40ch 会折出只剩 4 字的末行）。
- 强调色只留给「当前项 + 主动作 + 卡片外框」，同一屏里不要出现七处绿。
- 文档表格启用 `tabular-nums`，参数表同列数值才对齐。
- `@media print` 强制切亮色纸面并隐藏导航、侧栏、页脚：手册常被整页打印存档。

代码高亮（最容易静默失效的一处，改动前先读这段）：

- Shiki 跑双主题（`shikiConfig.defaultColor: false`），只输出 `--shiki-light*` / `--shiki-dark*` 两组变量，
  由 CSS 决定用哪组。**背景和前景必须各自接线**：只把背景钉在浅色档，暗色模式就会变成「浅字白底」，
  实测对比度 1.44:1，整页代码块不可读。`global.css` 里默认取浅色档，`html[data-theme="dark"]` 再覆盖，
  另有一段 `prefers-color-scheme` 兜底（主题脚本未执行时）。
- `src/lib/shiki-token-alpha.ts` 在生成 HAST 阶段去掉 token 色值里的 alpha：vitesse 给标点（字符串引号）
  写的是 `#C98A7D77`（47% 不透明度），一般项目无所谓，但本站手册大篇幅讲 shell 引用，引号被压到
  2.36:1 就糊了。**注意 Shiki 4 的逐 token 钩子叫 `span`**，旧的 `token` 钩子已移除——键名写错不报错、
  只是静默不生效（这个坑踩过一次）。
- 深色底上中文标点显示偏暗时，先量对比度再改色，别凭肉眼判断缩放后的截图。

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
node .shots/ui-audit.mjs       # UI 细节取证：锚点偏移/焦点环/数字对齐/滚动条/区块原比例截图（加 --shots）
node .shots/check-mdx.mjs      # 用 mdx-js 引擎预检所有 MDX（<url> autolink 等坑）
```

给人看的预览一律走 portless：`portless ffmpeg-cn bun run preview`（真实 URL 从 `portless list` 读）。重建后必须重启 preview，避免旧 dist 缓存。

## 发布流程（首次发布于 2026-09-14 已完成）

1. `astro.config.mjs` 与 `public/robots.txt` 中的占位域名换成最终域名（canonical / og / sitemap 都由 `site` 派生，改这两处即可）。
2. 推到 `master` 触发 `.github/workflows/deploy.yml`（bun install → build → upload → deploy）。
3. 自定义域用 `gh api` 设 `cname`，**不要往 public/ 放 CNAME 文件**：

   ```bash
   gh api -X POST repos/bbylw/FFmpeg-CN/pages -f build_type=workflow   # 启用 Pages，构建源选 Actions
   gh api -X PUT  repos/bbylw/FFmpeg-CN/pages -f cname=ffmpeg.ndjp.net
   ```

4. **坑：`github-pages` 环境的部署分支策略。** 环境默认可能只允许 `main`（本仓库最初就是），推 `master` 时 build 会成功、deploy 会报
   `Branch "master" is not allowed to deploy to github-pages due to environment protection rules`。补一条分支策略再重跑 `--failed` 即可：

   ```bash
   gh api -X POST repos/bbylw/FFmpeg-CN/environments/github-pages/deployment-branch-policies \
     -f name=master -f type=branch
   gh run rerun <run-id> --failed
   ```

5. 线上抽查：`/`、`/docs/`、任一文档页、`/search-index.json`、`/sitemap-index.xml`、`/og.png`、`/fonts/phosphor-regular.woff2` 都应为 200，未知路径应返回真 404。
   也可以让验收脚本直接量线上：`$env:AUDIT_BASE="https://ffmpeg.ndjp.net"; node .shots/ui-audit.mjs`。

## 部署现状

- 站点：<https://ffmpeg.ndjp.net>（GitHub Pages，自定义域，HTTPS 由 GitHub 签发）
- 仓库：<https://github.com/bbylw/FFmpeg-CN>，`master` 分支，Pages 构建源为 GitHub Actions
- DNS：由用户侧维护（指向 GitHub Pages）；`gh api repos/bbylw/FFmpeg-CN/pages` 的 `https_certificate.state` 为 `approved` 即表示 GitHub 已完成域名校验
- 遗留：工作流用的 `actions/checkout@v4`、`upload-artifact@v4`、`deploy-pages@v4` 会被 GitHub 从 Node 20 强制升到 Node 24 并给出弃用告警（不影响运行），后续可升到各 action 的 v5

## 内容来源与授权

全部译自 ffmpeg.org 官方手册（存档见 `.sources/`，各页 frontmatter `source` 字段标注原始 URL）与 FFmpeg 源码仓库 `doc/` 目录；命令、选项、名称逐字保留，页脚声明以官方英文手册为准。当前内容基线：FFmpeg 8.1 "Hoare"（2026-03-16）。
