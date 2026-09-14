import { defineCollection } from "astro:content";
// astro:content 重新导出的 z 已弃用（Astro 8 移除），这里直接用 astro/zod
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    group: z.enum([
      "开始",
      "命令行工具",
      "通用语法",
      "组件手册",
      "开发库",
      "资源",
    ]),
    order: z.number(),
    source: z.string().optional(),
  }),
});

export const collections = { docs };
