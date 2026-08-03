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

/** 书架条目：书籍元数据 + 阅读进度摘要 */
export interface BookshelfItem extends BookMeta {
  /** 已读百分比（1-100）；从未阅读或仍为 0% 时不提供 */
  readPercent?: number
}

export interface ChapterMeta {
  index: number
  title: string
  /** epub：该章节是封面页（正文为空白，应显示书籍封面图） */
  isCover?: boolean
  /** epub：正文内插图（绝对路径，顺序与 [[IMG:n]] 占位标记对应） */
  images?: string[]
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

export type UpdateMode = 'auto' | 'manual'

export interface AppSettings {
  updateMode: UpdateMode
}

export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'latest'
  | 'dev'

export interface UpdateState {
  phase: UpdatePhase
  /** 新版本号（available/downloading/downloaded 时提供） */
  version?: string
  /** 下载进度百分比 0-100 */
  percent?: number
  /** 已下载字节数 */
  transferred?: number
  /** 总字节数 */
  total?: number
  /** 下载速度（字节/秒） */
  bytesPerSecond?: number
  /** 错误信息（error 时提供） */
  message?: string
}

export interface AppInfo {
  name: string
  version: string
  homepage: string
}

export interface WindowControlsApi {
  minimize(): Promise<void>
  toggleMaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  onMaximizedChange(callback: (maximized: boolean) => void): () => void
}

export interface Api {
  openFileDialog(): Promise<string[]>
  importBooks(paths: string[]): Promise<ImportResult[]>
  getBooks(): Promise<BookshelfItem[]>
  openBook(id: string): Promise<BookDetail>
  getChapter(bookId: string, chapterIndex: number): Promise<string>
  saveProgress(bookId: string, progress: Omit<Progress, 'updatedAt'>): Promise<void>
  updateToc(bookId: string, options: TocUpdateOptions): Promise<ChapterMeta[]>
  deleteBook(id: string): Promise<void>
  quitAndInstall(): Promise<void>
  getSettings(): Promise<AppSettings>
  setSettings(patch: Partial<AppSettings>): Promise<AppSettings>
  checkForUpdates(): Promise<UpdateState>
  getUpdateState(): Promise<UpdateState>
  /** 订阅更新状态事件，返回取消订阅函数 */
  onUpdateState(callback: (state: UpdateState) => void): () => void
  getAppInfo(): Promise<AppInfo>
  openLibrary(): Promise<void>
  windowControls: WindowControlsApi
}
