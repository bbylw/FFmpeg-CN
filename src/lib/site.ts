export const GROUPS = [
  "开始",
  "命令行工具",
  "通用语法",
  "组件手册",
  "开发库",
  "资源",
] as const;

export type Group = (typeof GROUPS)[number];

export const GROUP_BLURB: Record<Group, string> = {
  开始: "从下载三条命令开始",
  命令行工具: "ffmpeg、ffprobe、ffplay 与其他工具",
  通用语法: "所有工具共享的写法与记法",
  组件手册: "编解码器、格式、滤镜与设备",
  开发库: "在代码里使用 libav 全家桶",
  资源: "FAQ、版本、安全与社区",
};

export const NAV = [
  { label: "文档", href: "/docs/" },
  { label: "下载", href: "/docs/download/" },
  { label: "版本", href: "/docs/releases/" },
  { label: "社区", href: "/docs/contributing/" },
] as const;

export const OFFICIAL = {
  site: "https://ffmpeg.org/",
  git: "https://git.ffmpeg.org/gitweb/ffmpeg.git",
  code: "https://code.ffmpeg.org/FFmpeg/FFmpeg",
  wiki: "https://trac.ffmpeg.org/",
  irc: "https://web.libera.chat/#ffmpeg",
  list: "https://lists.ffmpeg.org/mailman/listinfo/ffmpeg-devel",
  issues: "https://trac.ffmpeg.org/wiki/Reporting",
  donate: "https://ffmpeg.org/donations.html",
} as const;

export function groupRank(g: string): number {
  const i = (GROUPS as readonly string[]).indexOf(g);
  return i === -1 ? GROUPS.length : i;
}
