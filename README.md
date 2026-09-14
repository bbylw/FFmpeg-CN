# FFmpeg 说明文档

FFmpeg 是一套用于处理多媒体内容（如音频、视频、字幕及相关元数据）的库和工具集合。

## 库（Libraries）

* `libavcodec` 提供了大量编解码器的实现。
* `libavformat` 实现了流媒体协议、容器格式以及基础的 I/O 访问。
* `libavutil` 包含哈希器、解压缩器以及各类实用工具函数。
* `libavfilter` 提供了通过相互连接的过滤器有向图来改变已解码音视频的手段。
* `libavdevice` 提供了访问采集与播放设备的抽象层。
* `libswresample` 实现了音频混音与重采样例程。
* `libswscale` 实现了色彩转换与缩放例程。

## 工具（Tools）

* [ffmpeg](https://ffmpeg.org/ffmpeg.html) 是一个命令行工具箱，用于
  操控、转换和流式传输多媒体内容。
* [ffplay](https://ffmpeg.org/ffplay.html) 是一个极简的多媒体播放器。
* [ffprobe](https://ffmpeg.org/ffprobe.html) 是一个用于检视
  多媒体内容的简易分析工具。
* 其他小型工具，例如 `aviocat`、`ismindex` 和 `qt-faststart`。

## 文档（Documentation）

离线文档位于
[doc/](https://github.com/FFmpeg/FFmpeg/tree/master/doc) 目录。

在线文档可在主 [网站](https://ffmpeg.org)
以及 [wiki](https://trac.ffmpeg.org) 上查阅。

### 示例（Examples）

编码示例位于
[doc/examples](https://github.com/FFmpeg/FFmpeg/tree/master/doc/examples) 目录。

## 许可证（License）

FFmpeg 代码库主要以 LGPL 许可证发布，部分可选组件以
GPL 许可证发布。详细说明请参考 [LICENSE](https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE) 文件。

## 贡献（Contributing）

补丁应通过 `git format-patch` 或 `git send-email` 提交至
ffmpeg-devel 邮件列表。请避免使用 GitHub 拉取请求（pull request），
因为它们不属于我们的审核流程，并且会被忽略。
