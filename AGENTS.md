# AGENTS.md

CatReader — 本地小说阅读器（Windows 桌面应用），支持 txt / epub 导入、目录解析、书架管理与分页阅读。

## Tech stack

- Electron 39 + electron-vite + React 19 + TypeScript（pnpm 单包管理）
- electron-builder 打包，electron-updater 走 GitHub Releases 自动更新

## Commands

- `pnpm install` / `pnpm install --frozen-lockfile`
- `pnpm run dev` — electron-vite 开发模式（HMR）
- `pnpm run build` — tsc + vite 生产构建到 `out/`
- `pnpm start` — 运行构建产物（`electron .`）
- `pnpm run typecheck` — tsc（node + web 两个工程）
- `pnpm test` — vitest 单元测试（排除 `e2e/**` 与 `work/**`）
- `pnpm run test:e2e` — playwright（仓库内 `e2e/smoke.spec.ts`）
- `pnpm run build:unpack` / `build:win` — electron-builder 打包

## Project layout

- `src/main` — 主进程：`ipc.ts`（IPC 处理）、`updater.ts`（更新状态机）、`stores/`（book/progress/settings/json-store）、`services/text-cache.ts`、`import-service.ts`、`parsers/`（txt/epub/编码）
- `src/preload` — contextBridge 暴露 `window.api`
- `src/shared/types.ts` — 共享类型与 `window.api` 接口定义（单一事实来源）
- `src/renderer/src` — React UI：`pages/Bookshelf.tsx`、`pages/Reader.tsx`；`components/`（AppMenu、AboutDialog、UpdateBar、WindowControls、SettingsPanel、TocEditor）；`lib/`（reader-presets、ui-theme、paginate、chapter-pages、update-format、shelf）
- `e2e/smoke.spec.ts` — 已提交的冒烟测试；其余打包版 e2e 规范放在 `work/`（gitignored），运行前复制到仓库根目录、跑完删除（vitest 会扫描根目录 `*.spec.ts`）
- `.github/workflows/release.yml` — 标签触发的构建发布流水线

## Conventions & behavior that must not regress

- 阅读导航：**上一章按钮 / Ctrl+↑ 跳到上一章开头**；在某章第一页按上一页（←）回到上一章**末页**。两者语义不同，改动其中一个时不要破坏另一个。
- 分页：章节切换后 `pageIndex` 需在章节加载完成后再收敛（`loadedChapterIndex` 守卫），避免"回翻跳页"回归。
- 自定义标题栏：窗口 `frame: false`；`.shelf-header` 与 `.reader-topbar` 为 `-webkit-app-region: drag`，交互元素 `no-drag`；`.window-controls` 必须锚定在窗口右上角（书架顶栏是**全宽**布局，不要塞回 `max-width` 的 `.shelf` 容器内）。
- 更新策略：`src/main/stores/settings-store.ts` 持久化 `updateMode`（auto/manual）到 `userData/settings.json`；更新状态统一走 `src/main/updater.ts` 状态机，渲染层通过 `window.api.onUpdateState` 订阅；横幅与菜单共用同一状态。
- 渲染层↔主进程的所有 API 必须先改 `src/shared/types.ts` 的 `Api`，再在 `src/preload/index.ts` 实现。

## Verification workflow

1. `pnpm run typecheck`
2. `pnpm test`
3. `pnpm run build`
4. UI/回归类改动：重新打包未安装版（`pnpm exec electron-builder --dir`），用 `work/e2e-*.spec.ts` 对 `dist/win-unpacked/catreader.exe` 跑 e2e，启动环境需设置 `CATREADER_E2E_USERDATA`、`CATREADER_LIBRARY_DIR`，更新相关用例加 `CATREADER_DISABLE_UPDATES=1`（更新检查会返回确定的 `dev` 状态）。

## Release process

- 升 `package.json` 版本 → 提交 → `git tag vX.Y.Z && git push origin vX.Y.Z`
- CI（windows-latest）执行 typecheck + 单元测试 + 构建，electron-builder 打包后把安装包与 `latest.yml` 发布为正式 GitHub Release（v0.3.0 起）。

## Known environment gotchas (this machine)

- **pnpm 版本不一致**：当前 `node_modules/.modules.yaml` 记录的是 pnpm 11.18.0。Codex 内置终端解析到运行时自带的 pnpm 11.9.0，会触发"删除并重装 modules 目录"的提示。**不要答应删除**；请使用全局 pnpm（`C:\Users\jinzhenyi\AppData\Roaming\npm\pnpm.cmd`，11.18.0）或普通终端运行 pnpm 命令。
- **Electron 安装脚本在 Node 24 下静默卡死**：electron 的 postinstall（extract-zip/yauzl）在 Node 24 上解压不完整且无报错，表现为 `dist/` 只有部分文件、缺少 `path.txt`，启动报 "Electron failed to install correctly"。若 node_modules 被重装，需重新修复：把 `%LOCALAPPDATA%\electron\Cache` 里对应版本的 zip 解压到 `.pnpm\electron@...\node_modules\electron\dist`，并写入内容为 `electron.exe` 的 `path.txt`。全新安装建议用 Node 22 LTS 跑 `pnpm install`。
- 沙箱 shell 读部分 node_modules 文件会 EPERM；从 agent 沙箱执行 pnpm/typecheck/test/build 时需提权运行。
