# CatReader 小说阅读器 MVP 设计文档

日期：2026-08-02
状态：已获用户确认（待实施）

## 1. 背景与目标

开发一个 Windows x64 中文界面的本地小说阅读器 MVP。核心诉求：把本地 txt/epub 小说"导入 → 管理 → 阅读"形成闭环，具备可靠的目录解析能力和良好的阅读体验。

## 2. 决策记录

| 决策点 | 结论 |
| --- | --- |
| MVP 范围 | 含基础阅读器（章节切换、字号、进度记忆），不含夜间模式/主题/翻页动画 |
| 支持格式 | 仅 txt + epub |
| 导入方式 | 复制入库（文件拷贝到应用管理目录） |
| 阅读交互 | 分页阅读（MVP），上下滚动列为后续扩展 |
| 目录容错 | txt 自动识别 + 手动修正；epub 读书内目录 |
| 架构方案 | 轻量自研解析 + 统一阅读引擎（txt/epub 统一为章节纯文本） |
| 包管理器 | pnpm（本机 npm 命令行故障） |
| 远程仓库 | github.com/aliercat/CatReader（public，HTTPS 推送） |

## 3. 需求范围

### MVP 内

- 导入：文件对话框选择 `.txt` / `.epub`，复制入库；重复文件（同名 + 同大小）提示跳过/替换。
- txt 解析：编码检测（UTF-8 / GB18030 / GBK，失败依次回退），章节正则预设（第X章/回/卷、楔子、序章、番外、Chapter N 等）；导入时解码缓存为 UTF-8 文本，按字符偏移切章；识别失败兜底为整本一章。
- epub 解析：解压读取 container.xml → OPF → spine/NCX（或 nav.xhtml），每章提取纯文本缓存；无目录时按 spine 平铺。
- 书架：封面网格（txt 首字渐变占位封面，epub 尝试提取封面图），按最近阅读排序，点击续读。
- 分页阅读：CSS 多栏分页；字号/行距/页宽可调，变化后重排当前章并尽量保持阅读位置；进度（章节 + 页码 + 显示设置）防抖持久化。
- 目录修正（仅 txt）：重命名章节、删除章节（并入上一章）、在阅读页光标处插入新章节标记、换预设规则重新解析。
- 删除书籍：确认后移除元数据、进度与书籍目录。

### MVP 外（后续扩展）

- 滚动阅读模式、夜间模式/主题、翻页动画
- PDF / mobi / azw3
- epub 插图与样式还原
- 书内搜索、云同步、多端、书签/笔记

## 4. 架构

electron-vite 标准三进程结构：

```text
main（Electron 主进程）
  ├─ ImportService   导入对话框/拖拽 → 复制入库 → 触发解析
  ├─ TxtParser       编码检测 + 章节识别（字符偏移）
  ├─ EpubParser      zip 解压 + OPF/spine/NCX 解析 → 章节纯文本
  ├─ BookStore       books.json 元数据（原子写 + 仓储接口）
  └─ ProgressStore   progress.json 进度（防抖写入）
preload               contextBridge 暴露 window.api（类型安全）
renderer（React）
  ├─ 书架页          封面网格、最近阅读排序、删除
  ├─ 阅读页          分页引擎、目录侧栏、设置工具栏、进度记忆
  └─ 目录编辑弹窗    仅 txt：重命名/删除/插入/重解析
```

安全基线：`contextIsolation: true`、`nodeIntegration: false`，渲染层只能调用 preload 暴露的 IPC 接口。

## 5. IPC 接口（window.api）

```ts
interface ImportResult { ok: boolean; bookId?: string; error?: string }
interface BookMeta {
  id: string; title: string; author?: string; format: 'txt' | 'epub';
  filePath: string; cover?: string; chapterCount: number;
  createdAt: number; lastReadAt?: number;
}
interface BookDetail extends BookMeta {
  chapters: { index: number; title: string }[];
  progress: Progress | null;
}
interface Progress {
  chapterIndex: number; pageIndex: number;
  fontSize: number; lineHeight: number; pageWidth: number;
}
interface TocEntry { index: number; title: string; charStart: number; charEnd: number }

api.importBooks(): Promise<ImportResult[]>
api.getBooks(): Promise<BookMeta[]>
api.openBook(id: string): Promise<BookDetail>
api.getChapter(bookId: string, chapterIndex: number): Promise<string>
api.saveProgress(bookId: string, progress: Progress): Promise<void>
api.updateToc(bookId: string, chapters: TocEntry[]): Promise<void> // 仅 txt
api.deleteBook(id: string): Promise<void>
```

## 6. 数据存储

- 位置：`app.getPath('userData')/library/`
- `books/<bookId>/`：原始书籍文件、txt 解码后的 UTF-8 缓存、epub 各章纯文本缓存、封面图片
- `books.json`：`BookMeta[]`
- `progress.json`：`{ [bookId]: Progress }`
- 写入策略：临时文件 + 原子替换（`rename`）；仓储层抽象接口，便于后续换 SQLite

## 7. 容错设计

- 非法/损坏文件：不入库，返回错误提示。
- 重复文件：同名 + 同大小判定，提示"跳过/替换"。
- 复制中断：回滚已写入的半成品（删除半截文件与元数据）。
- 编码检测失败：依次回退 GB18030 → UTF-8；解码乱码率过高时提示用户。
- 章节识别失败：整本作为一章"全文"。
- epub 无 TOC：按 spine 顺序平铺章节。
- 进度写入失败：不阻断阅读，仅提示。

## 8. 测试与验收

### 单元测试（vitest）

- 章节正则：第一章 / 第1章 / 第 123 回 / 楔子 / 序章 / 番外 / Chapter 1 / 无章节文本
- 编码检测：UTF-8 与 GBK 样本
- epub 解析：最小样例（container.xml + OPF + NCX + spine）
- 分页纯函数：页数计算、字号变化重排
- 存储：原子写、异常回滚

### 冒烟测试（Playwright + Electron）

导入 → 书架出现 → 打开 → 翻页 → 改字号重排 → 重启后进度恢复 → 目录手动修正 → 删除书籍。

### 验收标准

- Windows 10/11 x64：安装包与便携版均可运行
- 中文无乱码
- 100MB 级 txt 打开不卡死（章节懒加载）

## 9. 实施步骤

1. git init、保存本文档与 README，推送至 GitHub（HTTPS 认证就绪后）。
2. pnpm 初始化 electron-vite 项目（React + TS），配置 electron-builder，搭好 main/preload/renderer 骨架与 `window.api` 类型。
3. 解析层：TxtParser / EpubParser / 编码检测 + vitest 单测与 fixture。
4. 存储层：BookStore / ProgressStore（原子写 + 仓储接口）、ImportService（复制入库、封面、重复检测、删除）。
5. 渲染层：书架 → 目录侧栏 → 分页引擎 → 设置工具栏 → 目录编辑弹窗，接通 IPC。
6. 冒烟测试全流程并修复。
7. electron-builder 打包 Windows x64 便携版 + NSIS 安装包，手动验收。

## 10. 技术风险与对策

- Electron 二进制下载与依赖安装需要网络：首次 `pnpm install` / 打包时申请网络权限。
- 本机 npm 故障：全程使用 pnpm（已验证可用）。
- 分页引擎复杂：用 CSS 多栏布局（Chromium 排版），重排逻辑收敛为纯函数便于单测。
- epub 样式多样：MVP 只提取正文文本，插图/样式列为后续扩展。
