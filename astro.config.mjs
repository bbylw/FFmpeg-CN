// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { rehypeHeadingIds } from "./src/lib/md-slug";
import { stripTokenAlpha } from "./src/lib/shiki-token-alpha";

export default defineConfig({
  // 自定义域：GitHub Pages 里用 API 设 cname，不要往 public/ 放 CNAME 文件
  site: "https://ffmpeg.ndjp.net",
  output: "static",
  trailingSlash: "ignore",
  // 悬停即预取站内链接，静态站点的页面切换几乎零等待
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    processor: unified({
      rehypePlugins: [rehypeHeadingIds],
      smartypants: false,
    }),
    shikiConfig: {
      themes: {
        light: "vitesse-light",
        dark: "vitesse-dark",
      },
      defaultColor: false,
      // 主题给标点带 alpha（引号只剩 47% 不透明度），手册里引号必须看得清
      transformers: [stripTokenAlpha()],
    },
  },
});
