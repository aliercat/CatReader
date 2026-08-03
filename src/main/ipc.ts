import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { AppSettings, TocUpdateOptions, UpdateState } from '../shared/types'
import { BookStore } from './stores/book-store'
import { ProgressStore } from './stores/progress-store'
import { ImportService } from './import-service'
import { SettingsStore } from './stores/settings-store'
import {
  checkForUpdates,
  getUpdateState,
  hasAutoCheckStarted,
  markAutoCheckStarted,
  setTestUpdateState
} from './updater'
import { DEFAULT_PRESET_IDS, parseTxtToc, splitByLines } from './parsers/txt-parser'

interface Services {
  bookStore: BookStore
  progressStore: ProgressStore
  importService: ImportService
  settingsStore: SettingsStore
  libraryRoot: string
}

export function registerIpc({
  bookStore,
  progressStore,
  importService,
  settingsStore,
  libraryRoot
}: Services): void {
  ipcMain.handle('dialog:openFiles', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const result = await dialog.showOpenDialog(win!, {
      title: '导入小说',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '小说文件', extensions: ['txt', 'epub'] },
        { name: '全部文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('books:import', (_event, paths: string[]) => importService.importFiles(paths))

  ipcMain.handle('books:list', () =>
    bookStore.list().map((b) => {
      const p = progressStore.get(b.id)
      if (!p) return b
      const percent = Math.min(100, Math.round((p.chapterIndex / Math.max(1, b.chapterCount)) * 100))
      return percent > 0 ? { ...b, readPercent: percent } : b
    })
  )

  ipcMain.handle('books:open', (_event, id: string) => {
    const book = bookStore.get(id)
    if (!book) throw new Error('书籍不存在')
    const chapters = importService.ensureEpubCoverFlags(id)
    return {
      book,
      chapters,
      progress: progressStore.get(id)
    }
  })

  ipcMain.handle('books:getChapter', (_event, bookId: string, chapterIndex: number) =>
    importService.getChapterText(bookId, chapterIndex)
  )

  ipcMain.handle('books:saveProgress', (_event, bookId: string, progress: Parameters<ProgressStore['save']>[1]) => {
    progressStore.save(bookId, progress)
    bookStore.update(bookId, { lastReadAt: Date.now() })
  })

  ipcMain.handle('books:updateToc', (_event, bookId: string, options: TocUpdateOptions) => {
    const meta = bookStore.get(bookId)
    if (!meta) throw new Error('书籍不存在')
    if (meta.format !== 'txt') throw new Error('仅 txt 支持目录修正')
    const text = importService.getFullText(bookId)
    if (text === null) throw new Error('无法读取书籍内容')

    if (options.chapters) {
      const chapters = options.chapters
      if (!Array.isArray(chapters) || chapters.length === 0) throw new Error('章节列表为空')
      bookStore.writeChapters(bookId, { source: 'txt', fallback: false, chapters })
      bookStore.update(bookId, { chapterCount: chapters.length, fallbackToc: false })
      return chapters
    }

    let result: ReturnType<typeof parseTxtToc>
    if (options.splitByLines) {
      result = { chapters: splitByLines(text), fallback: true }
    } else {
      result = parseTxtToc(text, options.presetIds?.length ? options.presetIds : DEFAULT_PRESET_IDS)
    }
    bookStore.writeChapters(bookId, { source: 'txt', fallback: result.fallback, chapters: result.chapters })
    bookStore.update(bookId, {
      chapterCount: result.chapters.length,
      fallbackToc: result.fallback,
      tocPresets: options.presetIds ?? DEFAULT_PRESET_IDS
    })
    return result.chapters
  })

  ipcMain.handle('books:delete', (_event, id: string) => importService.deleteBook(id))

  ipcMain.handle('app:quitAndInstall', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('settings:get', () => settingsStore.get())

  ipcMain.handle('settings:set', (_event, patch: Partial<AppSettings>) => {
    const next = settingsStore.set(patch)
    // 切回自动更新时，若启动阶段未检查过（此前为手动模式），立即补一次检查
    if (next.updateMode === 'auto' && !hasAutoCheckStarted()) {
      markAutoCheckStarted()
      void checkForUpdates()
    }
    return next
  })

  ipcMain.handle('update:check', () => checkForUpdates())

  ipcMain.handle('update:getState', () => getUpdateState())

  ipcMain.handle('app:getInfo', () => ({
    name: app.getName(),
    version: app.getVersion(),
    homepage: 'https://github.com/aliercat/CatReader'
  }))

  ipcMain.handle('app:openLibrary', () => shell.openPath(libraryRoot))

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:isMaximized', (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false)

  // e2e 专用：注入模拟更新状态，仅在端到端测试环境注册
  if (process.env.CATREADER_E2E_USERDATA) {
    ipcMain.handle('update:setTestState', (_event, patch: Partial<UpdateState>) => {
      setTestUpdateState(patch)
    })
  }
}
