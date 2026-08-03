# CatReader 小说阅读器

CatReader 是一款面向 Windows 桌面的本地小说阅读器，基于 Electron + React + TypeScript 构建。书籍文件只保存在本地，导入后复制入库，不依赖网络；支持 txt / epub 导入、章节目录自动解析、书架管理与多栏分页阅读。

## 功能特性

- **导入**：支持 `.txt` / `.epub`，导入时复制到应用管理目录（原文件后续变动不影响阅读），自动检测重复文件。
- **目录解析**：
  - txt：编码检测（UTF-8 / GB18030 / GBK），自动识别常见章节标题（“第X章/回/卷”、楔子、序章、番外、“Chapter N”等）；内置“目录修正”工具，可重命名、删除/合并、插入章节标记、换规则重新解析。
  - epub：读取书内目录（OPF / spine / NCX / nav.xhtml），提取章节纯文本。
- **书架**：封面网格展示（txt 生成首字渐变占位封面，epub 尝试提取封面图），按最近阅读排序，点击续读。
- **分页阅读**：CSS 多栏分页引擎，翻页带轻量过渡动画；点击阅读区左 / 右 1/3 翻页，中间 1/3 呼出底部设置面板（字号、行距、页宽、1/2/3 栏、字体），调整后自动重排；页脚提供上一章 / 上一页 / 下一页 / 下一章快捷按钮（快捷键 Ctrl+↑ / Ctrl+↓ 切章）。
- **目录侧边栏**：左侧滑出，支持按章节名实时搜索（长书快速定位），点击跳转。
- **阅读主题**：默认 / 护眼绿 / 羊皮纸 / 夜间四套阅读区主题，可一键恢复默认；主题只作用于阅读区。
- **进度记忆**：每本书自动保存章节、页码与显示设置，下次打开续读。

## 技术栈

- **Electron**（主进程）+ **electron-vite**（main / preload / renderer 三进程构建）
- **React 19 + TypeScript + Vite**
- **pnpm** 包管理
- **vitest** 单元测试、**Playwright**（Electron）端到端测试
- **electron-builder** 产出 Windows x64 便携版与 NSIS 安装包
- 解析相关：JSZip（epub）、fast-xml-parser、iconv-lite / jschardet（txt 编码检测）

## 环境要求

- Windows 10 / 11（x64）
- Node.js 20+ 与 pnpm

## 运行（无需安装安装包）

安装依赖后即可直接运行，不必每次安装 NSIS 安装程序：

```bash
pnpm install

# 方式一：开发模式（推荐，修改代码后热更新）
pnpm dev

# 方式二：构建后直接运行（效果与安装版一致）
pnpm run build && pnpm start

# 方式三：生成免安装便携版，双击 dist/win-unpacked/catreader.exe 即可
pnpm run build:unpack
```

> 首次运行或构建需要联网下载 Electron 二进制。

## 测试

```bash
pnpm test          # 单元测试（解析器、存储、导入、分页等）
pnpm run test:e2e  # Playwright 端到端测试（需要可启动 Electron 图形界面的环境）
```

## 打包

```bash
pnpm run build:win
```

产物输出到 `dist/`，NSIS 安装包同时复制一份到 `outputs/`。

## 目录结构

```text
src/
  main/       # 主进程：文件导入、格式解析、存储、IPC
    parsers/  #   txt / epub 解析器（含单测）
    stores/   #   JSON 原子写入的书籍与进度存储
    services/ #   章节文本缓存等
  preload/    # contextBridge 向渲染进程暴露 window.api
  renderer/   # React 界面：书架、阅读页、设置面板、目录侧边栏、目录编辑
  shared/     # 主/渲染进程共享的类型与目录预设
e2e/          # Playwright 冒烟测试
scripts/      # 自定义构建脚本
```

## 数据存储

所有数据位于 `app.getPath('userData')/library/`：

- `books/<bookId>/`：导入的书籍文件与章节文本缓存
- `books.json`：书籍元数据
- `progress.json`：每本书的阅读进度与显示设置

JSON 写入采用“临时文件 + 原子替换”，避免写入中断损坏数据。

## 后续计划

- 滚动阅读模式
- PDF / mobi / azw3 等更多格式
- epub 插图与样式还原
- 书内搜索、云同步、多端
