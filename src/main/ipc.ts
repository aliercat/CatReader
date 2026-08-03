import { BrowserWindow, dialog, ipcMain } from 'electron'
import type { TocUpdateOptions } from '../shared/types'
import { BookStore } from './stores/book-store'
import { ProgressStore } from './stores/progress-store'
import { ImportService } from './import-service'
import { DEFAULT_PRESET_IDS, parseTxtToc, splitByLines } from './parsers/txt-parser'

interface Services {
  bookStore: BookStore
  progressStore: ProgressStore
  importService: ImportService
}

export function registerIpc({ bookStore, progressStore, importService }: Services): void {
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

  ipcMain.handle('books:list', () => bookStore.list())

  ipcMain.handle('books:open', (_event, id: string) => {
    const book = bookStore.get(id)
    if (!book) throw new Error('书籍不存在')
    return {
      book,
      chapters: bookStore.readChapters(id)?.chapters ?? [],
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
}
