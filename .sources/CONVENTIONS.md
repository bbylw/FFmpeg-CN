# ffmpeg-cn 内容写作与翻译规范（子代理必读）

项目：FFmpeg 中文站（Astro 7 + MDX 内容集合）。你负责把 `.sources/` 下的 ffmpeg.org 官方页面英文 HTML 翻译成高质量中文 MDX，写入 `src/content/docs/`。

## 文件与 frontmatter

每个文件是 `.mdx`，放在 `src/content/docs/`，只允许标准 Markdown + 代码围栏，**禁止 import 任何组件**。frontmatter 固定为：

```yaml
---
title: 页面标题（中文）
description: 一句 40 字以内的页面摘要（用于 meta 与搜索）
group: 分组名（见下）
order: 组内序号数字
source: https://ffmpeg.org/xxx.html
---
```

分组名只能是：`开始`、`命令行工具`、`通用语法`、`组件手册`、`开发库`、`资源`。

## 站点路由约定

- 文档 URL = `/docs/<文件名去扩展名>/`，交叉引用时用相对站内链接，如 `[ffmpeg 滤镜详解](/docs/filters/)`。
- 指向官方英文资源继续用绝对链接（ffmpeg.org、trac.ffmpeg.org、git.ffmpeg.org）。
- 首页在 `/`，下载入口在 `/docs/download/`，导航不含“中文文档”等后缀。

## 翻译与文案红线（违反即返工）

1. **零 em-dash**：全文禁止 `—` 与 `–`（引用官方原文也要改写成句号/逗号/冒号/括号）。只允许普通连字符 `-`。
2. 不做文言腔、不做古风扮演；现代、直白、工程师语气。标题本身就是导航，**禁止** `01/02`、`壹贰叁` 之类装饰序号。数字只出现在真实数据（版本号、日期、参数值）里。
3. 选项名、参数、代码、文件路径、编解码器/容器名（如 `libx264`、`-c:v`、`MP4`、`H.264`）一律保持原文，不翻译。
4. 术语统一表：
   - muxer → 混流器；demuxer → 解流器；encoder/decoder → 编码器/解码器
   - container format → 封装格式；codec → 编解码器；bitstream filter → 比特流过滤器
   - filter / filtergraph → 滤镜 / 滤镜图；stream → 流；frame → 帧
   - keyframe → 关键帧；timestamp → 时间戳；bitrate → 码率；sample rate → 采样率
   - channel layout → 声道布局；pixel format → 像素格式；transcode → 转码
   - hardware acceleration → 硬件加速；overlay → 叠加（滤镜语境保留 `overlay` 名）
5. 代码示例逐字保留（命令、选项顺序都不许改），示例后的解释句翻译。
6. 不编造数据、不编造官方没有的功能。版本号/日期以 `.sources/index.html` 为准：当前最新 minor 发行版 **FFmpeg 8.1 "Hoare"（2026-03-16）**，git master 更新更靠前。发行版代号带人名引号时保留原样。
7. 表格：官方支持列表（格式/编解码器/滤镜/设备）用 Markdown 表格呈现，表头译成中文，条目的名称/特性列保持英文原名；过长的细节列（如“描述”）可翻译为一句中文。
8. 内容取舍：官方手册是逐选项的长文。你产出的文档要**覆盖原页面的章节结构与所有小节**，长选项表挑对中文用户最有价值的行保留并在表前注明“完整列表见官方手册（绝对链接）”；叙述性段落、语法说明、示例必须完整翻译，不许整节省略。
9. 标题锚点：正文标题就是普通中文标题，不要手写 HTML id。
10. 页脚不要伪造版本号/构建号装饰。

## 体量约束

单个 MDX 源文件控制在 15KB 以内（渲染后页面长一点没关系，源文件别爆）。若原文某节只能压缩，写「摘要 + 官方绝对链接」。

## 完成标准

- 分配给你的每个文件都写完，frontmatter 完整。
- 文件内 `—`、`–` 出现次数为 0（自查：搜索这两个字符）。
- 术语符合上表。
