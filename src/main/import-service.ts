import { basename, extname, join } from 'path'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import type { BookMeta, ImportResult } from '../shared/types'
import { BookStore } from './stores/book-store'
import { ProgressStore } from './stores/progress-store'
import { TextCache } from './services/text-cache'
import { decodeText } from './parsers/encoding'
import { chapterContent, DEFAULT_PRESET_IDS, parseTxtToc } from './parsers/txt-parser'
import { parseEpub } from './parsers/epub-parser'

const MAX_FILE_SIZE = 500 * 1024 * 1024
const SUPPORTED_EXTENSIONS = new Set(['.txt', '.epub'])
const BOOK_ID_PATTERN = /^[0-9a-f-]{36}$/

export class ImportService {
  constructor(
    private readonly bookStore: BookStore,
    private readonly progressStore: ProgressStore,
    private readonly textCache: TextCache
  ) {}

  async importFiles(paths: string[]): Promise<ImportResult[]> {
    const results: ImportResult[] = []
    for (const p of paths) {
      results.push(await this.importFile(p))
    }
    return results
  }

  private async importFile(filePath: string): Promise<ImportResult> {
    const fileName = basename(filePath)
    const ext = extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return { ok: false, reason: 'unsupported', fileName, error: `不支持的格式：${ext}` }
    }

    let size: number
    try {
      size = statSync(filePath).size
    } catch {
      return { ok: false, reason: 'read-error', fileName, error: '无法读取文件' }
    }
    if (size > MAX_FILE_SIZE) {
      return { ok: false, reason: 'read-error', fileName, error: '文件超过 500MB 上限' }
    }

    const duplicate = this.bookStore.findDuplicate(fileName, size)
    if (duplicate) {
      return { ok: false, reason: 'duplicate', bookId: duplicate.id, fileName }
    }

    const id = randomUUID()
    const bookDir = this.bookStore.getBookDir(id)
    try {
      mkdirSync(bookDir, { recursive: true })
      const meta: BookMeta = {
        id,
        title: basename(filePath, ext),
        format: ext === '.epub' ? 'epub' : 'txt',
        filePath: join(bookDir, fileName),
        fileSize: size,
        chapterCount: 0,
        createdAt: Date.now()
      }

      if (ext === '.txt') {
        const { text, garbled } = decodeText(readFileSync(filePath))
        const textPath = join(bookDir, 'book.txt')
        writeFileSync(textPath, text, 'utf-8')
        const { chapters, fallback } = parseTxtToc(text, DEFAULT_PRESET_IDS)
        this.bookStore.writeChapters(id, { source: 'txt', fallback, chapters })
        meta.textPath = textPath
        meta.chapterCount = chapters.length
        meta.fallbackToc = fallback
        meta.tocPresets = DEFAULT_PRESET_IDS
        meta.garbled = garbled > 0.05
        this.textCache.set(id, text)
      } else {
        const book = await parseEpub(readFileSync(filePath))
        copyFileSync(filePath, join(bookDir, fileName))
        const chapters = book.chapters.map((c, i) => ({ index: i, title: c.title }))
        const chapterDir = join(bookDir, 'chapters')
        mkdirSync(chapterDir, { recursive: true })
        for (const [i, c] of book.chapters.entries()) {
          writeFileSync(join(chapterDir, `${i}.txt`), c.content, 'utf-8')
        }
        this.bookStore.writeChapters(id, { source: 'epub', fallback: false, chapters })
        if (book.cover) {
          const coverPath = join(bookDir, 'cover.jpg')
          writeFileSync(coverPath, book.cover)
          meta.coverPath = coverPath
        }
        meta.title = book.title
        meta.author = book.author
        meta.chapterCount = chapters.length
      }

      this.bookStore.add(meta)
      return { ok: true, bookId: id, reason: 'success', fileName }
    } catch (err) {
      try {
        rmSync(bookDir, { recursive: true, force: true })
      } catch {
        // best effort rollback
      }
      return { ok: false, reason: 'parse-error', fileName, error: err instanceof Error ? err.message : String(err) }
    }
  }

  getChapterText(bookId: string, chapterIndex: number): string | null {
    const meta = this.bookStore.get(bookId)
    if (!meta) return null
    const chapters = this.bookStore.readChapters(bookId)?.chapters
    if (!chapters || chapterIndex < 0 || chapterIndex >= chapters.length) return null

    if (meta.format === 'txt') {
      let text = this.textCache.get(bookId)
      if (text === undefined) {
        if (!meta.textPath || !existsSync(meta.textPath)) return null
        text = readFileSync(meta.textPath, 'utf-8')
        this.textCache.set(bookId, text)
      }
      const ch = chapters[chapterIndex]
      if (ch.charStart === undefined || ch.charEnd === undefined) return null
      return chapterContent(text, {
        index: ch.index,
        title: ch.title,
        charStart: ch.charStart,
        charEnd: ch.charEnd
      })
    }

    const file = join(this.bookStore.getBookDir(bookId), 'chapters', `${chapterIndex}.txt`)
    return existsSync(file) ? readFileSync(file, 'utf-8') : null
  }

  getFullText(bookId: string): string | null {
    const meta = this.bookStore.get(bookId)
    if (!meta || meta.format !== 'txt') return null
    let text = this.textCache.get(bookId)
    if (text === undefined) {
      if (!meta.textPath || !existsSync(meta.textPath)) return null
      text = readFileSync(meta.textPath, 'utf-8')
      this.textCache.set(bookId, text)
    }
    return text
  }

  deleteBook(bookId: string): void {
    if (!BOOK_ID_PATTERN.test(bookId)) {
      throw new Error('非法的书籍 ID')
    }
    const meta = this.bookStore.get(bookId)
    if (!meta) return
    rmSync(this.bookStore.getBookDir(bookId), { recursive: true, force: true })
    this.bookStore.remove(bookId)
    this.progressStore.remove(bookId)
    this.textCache.delete(bookId)
  }
}
