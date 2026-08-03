export type BookFormat = 'txt' | 'epub'

export interface BookMeta {
  id: string
  title: string
  author?: string
  format: BookFormat
  /** Absolute path of the imported file inside the library */
  filePath: string
  /** txt: decoded UTF-8 cache file */
  textPath?: string
  /** epub: extracted cover image */
  coverPath?: string
  fileSize: number
  chapterCount: number
  createdAt: number
  lastReadAt?: number
  /** txt: which toc presets were used */
  tocPresets?: string[]
  /** txt: true when no chapter markers were found */
  fallbackToc?: boolean
  /** txt: decoding produced many replacement chars */
  garbled?: boolean
}

export interface ChapterMeta {
  index: number
  title: string
  /** epub：该章节是封面页（正文为空白，应显示书籍封面图） */
  isCover?: boolean
  /** txt: char offsets into the decoded text */
  charStart?: number
  charEnd?: number
}

export interface BookChapters {
  source: BookFormat
  fallback: boolean
  chapters: ChapterMeta[]
}

export interface Progress {
  chapterIndex: number
  pageIndex: number
  fontSize: number
  lineHeight: number
  pageWidth: number
  /** 阅读栏数（1/2/3），默认 1 */
  columns?: number
  /** 阅读区主题（paper/green/sepia/night），缺省回退默认 */
  themeId?: string
  /** 阅读字体（字体选项 id），缺省回退系统默认 */
  fontFamily?: string
  updatedAt: number
}

export interface BookDetail {
  book: BookMeta
  chapters: ChapterMeta[]
  progress: Progress | null
}

export interface TocUpdateOptions {
  presetIds?: string[]
  splitByLines?: boolean
  chapters?: ChapterMeta[]
}

export type ImportReason = 'success' | 'duplicate' | 'unsupported' | 'read-error' | 'parse-error'

export interface ImportResult {
  ok: boolean
  bookId?: string
  reason: ImportReason
  fileName?: string
  error?: string
}

export interface Api {
  openFileDialog(): Promise<string[]>
  importBooks(paths: string[]): Promise<ImportResult[]>
  getBooks(): Promise<BookMeta[]>
  openBook(id: string): Promise<BookDetail>
  getChapter(bookId: string, chapterIndex: number): Promise<string>
  saveProgress(bookId: string, progress: Omit<Progress, 'updatedAt'>): Promise<void>
  updateToc(bookId: string, options: TocUpdateOptions): Promise<ChapterMeta[]>
  deleteBook(id: string): Promise<void>
}
