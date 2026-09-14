// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { unified } from "@astrojs/markdown-remark";
import { rehypeHeadingIds } from "./src/lib/md-slug";

// 发布前把 site 换成最终域名（GitHub Pages / 自定义域）
export default defineConfig({
  site: "https://ffmpeg.localhost.placeholder",
  output: "static",
  trailingSlash: "ignore",
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
    },
  },
});
