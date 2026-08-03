# CatReader 小说阅读器

Windows 平台的本地小说阅读器（MVP），基于 Electron + React + TypeScript。

## MVP 功能

- **导入**：支持 `.txt` / `.epub` 格式，导入时复制入库（文件拷贝到应用管理目录，原文件变动不影响阅读）。
- **目录解析**：
  - txt：编码检测（UTF-8 / GB18030 / GBK）+ 常见章节标题自动识别（"第X章/回/卷"、楔子、序章、番外、"Chapter N" 等），支持手动修正（重命名、删除/合并、插入章节标记、换规则重新解析）。
  - epub：读取书内目录（OPF/spine/NCX 或 nav.xhtml），提取章节纯文本；无目录时按 spine 平铺。
- **书架**：封面网格（txt 生成首字渐变占位封面，epub 尝试提取封面图），按最近阅读排序，点击续读。
- **分页阅读**：CSS 多栏分页引擎；字号、行距、页宽、栏数（1/2/3 栏）可调，变化后自动重排并尽量保持位置；阅读进度（章节 + 页码 + 显示设置）自动记忆。

## 技术栈

- [electron-vite](https://electron-vite.org/)（main / preload / renderer 三进程）
- React + TypeScript + Vite
- pnpm（包管理）
- vitest（单元测试）、Playwright + Electron（冒烟测试）
- electron-builder（Windows x64 便携版 + NSIS 安装包）

## 快速开始

```bash
pnpm install
pnpm dev          # 开发模式
pnpm test         # 单元测试
pnpm build:win    # 打包 Windows x64
```

> 首次安装与打包需要网络下载 Electron 二进制。

## 目录结构（规划）

```text
src/
  main/       # 主进程：导入、解析、存储
  preload/    # contextBridge 暴露 window.api
  renderer/   # React 界面：书架、阅读页、目录编辑
```

## 后续扩展（不在 MVP）

- 滚动阅读模式、夜间模式/主题、翻页动画
- PDF / mobi / azw3 格式
- epub 插图与样式还原
- 书内搜索、云同步、多端

## 数据存储

所有数据位于 `app.getPath('userData')/library/`：

- `books/<bookId>/`：书籍文件与章节文本缓存
- `books.json`：书籍元数据
- `progress.json`：阅读进度

JSON 写入采用"临时文件 + 原子替换"；仓储层留接口，后续可平滑替换为 SQLite。
