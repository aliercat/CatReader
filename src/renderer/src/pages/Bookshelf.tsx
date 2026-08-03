import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BookshelfItem, UpdateMode, UpdateState } from '../../../shared/types'
import type { UiThemeMode } from '../lib/ui-theme'
import { CoverPlaceholder } from '../components/CoverPlaceholder'
import { fileUrl } from '../lib/file-url'
import {
  filterBooks,
  sortBooks,
  type ShelfFormatFilter,
  type ShelfSort
} from '../lib/shelf'
import AppMenu from '../components/AppMenu'
import AboutDialog from '../components/AboutDialog'
import UpdateBar from '../components/UpdateBar'
import WindowControls from '../components/WindowControls'

export default function Bookshelf({
  onOpen,
  uiTheme,
  onUiThemeChange
}: {
  onOpen: (id: string) => void
  uiTheme: UiThemeMode
  onUiThemeChange: (mode: UiThemeMode) => void
}) {
  const [books, setBooks] = useState<BookshelfItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState<ShelfFormatFilter>('all')
  const [sort, setSort] = useState<ShelfSort>('recent')
  const [updateState, setUpdateState] = useState<UpdateState>({ phase: 'idle' })
  const [updateMode, setUpdateMode] = useState<UpdateMode>('auto')
  const [aboutOpen, setAboutOpen] = useState(false)

  const refresh = useCallback(async () => {
    setBooks(await window.api.getBooks())
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    void window.api.getSettings().then((s) => setUpdateMode(s.updateMode))
    void window.api.getUpdateState().then(setUpdateState)
    return window.api.onUpdateState(setUpdateState)
  }, [])

  // 手动检查后“已是最新版本”的提示短暂显示后自动消失
  useEffect(() => {
    if (updateState.phase !== 'latest') return
    const timer = window.setTimeout(() => setUpdateState({ phase: 'idle' }), 3000)
    return () => window.clearTimeout(timer)
  }, [updateState.phase])

  const handleCheckUpdate = async (): Promise<void> => {
    setUpdateState(await window.api.checkForUpdates())
  }

  const handleUpdateModeChange = async (mode: UpdateMode): Promise<void> => {
    const next = await window.api.setSettings({ updateMode: mode })
    setUpdateMode(next.updateMode)
  }

  const showNotice = (msg: string): void => {
    setNotice(msg)
    window.setTimeout(() => setNotice(null), 3000)
  }

  const handleImport = async (): Promise<void> => {
    const paths = await window.api.openFileDialog()
    if (!paths.length) return
    const results = await window.api.importBooks(paths)
    for (const r of results) {
      if (r.ok) {
        showNotice(`已导入：${r.fileName}`)
      } else if (r.reason === 'duplicate') {
        showNotice(`书架中已存在，跳过：${r.fileName}`)
      } else {
        showNotice(`导入失败：${r.fileName}（${r.error ?? r.reason}）`)
      }
    }
    await refresh()
  }

  const handleDelete = async (b: BookshelfItem): Promise<void> => {
    if (!window.confirm(`删除《${b.title}》？书籍文件与阅读进度将一并移除。`)) return
    await window.api.deleteBook(b.id)
    await refresh()
  }

  const visible = useMemo(
    () => sortBooks(filterBooks(books, query, format), sort),
    [books, query, format, sort]
  )

  return (
    <div className="shelf">
      <header className="shelf-header">
        <h1>CatReader</h1>
        <div className="shelf-header-actions">
          <button className="btn primary" onClick={() => void handleImport()}>
            导入小说
          </button>
          <AppMenu
            uiTheme={uiTheme}
            onUiThemeChange={onUiThemeChange}
            updateMode={updateMode}
            onUpdateModeChange={(m) => void handleUpdateModeChange(m)}
            updateState={updateState}
            onCheckUpdate={() => void handleCheckUpdate()}
            onAbout={() => setAboutOpen(true)}
          />
          <WindowControls />
        </div>
      </header>
      {books.length > 0 && (
        <div className="shelf-toolbar">
          <input
            className="shelf-search"
            type="search"
            placeholder="搜索书名或作者"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="font-row" role="group" aria-label="格式">
            {(
              [
                ['all', '全部'],
                ['txt', 'TXT'],
                ['epub', 'EPUB']
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`font-chip${format === value ? ' active' : ''}`}
                aria-pressed={format === value}
                onClick={() => setFormat(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="font-row" role="group" aria-label="排序">
            {(
              [
                ['recent', '最近阅读'],
                ['imported', '最近导入'],
                ['title', '书名']
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`font-chip${sort === value ? ' active' : ''}`}
                aria-pressed={sort === value}
                onClick={() => setSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}
      <UpdateBar
        state={updateState}
        onRestart={() => void window.api.quitAndInstall()}
        onRetry={() => void handleCheckUpdate()}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      {loading ? (
        <p className="empty">加载中…</p>
      ) : books.length === 0 ? (
        <div className="empty">
          <p className="empty-title">书架还是空的</p>
          <p className="empty-sub">点击右上角“导入小说”，支持 txt / epub 格式。</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">
          <p className="empty-title">没有匹配的书籍</p>
          <p className="empty-sub">换个关键词或筛选条件试试。</p>
        </div>
      ) : (
        <div className="book-grid">
          {visible.map((b) => (
            <div className="book-card" key={b.id}>
              <button className="book-cover" onClick={() => onOpen(b.id)} title={`打开《${b.title}》`}>
                {b.coverPath ? <img src={fileUrl(b.coverPath)} alt="" /> : <CoverPlaceholder title={b.title} />}
                {b.readPercent != null && <span className="read-badge">已读 {b.readPercent}%</span>}
              </button>
              <div className="book-title" title={b.title}>
                {b.title}
              </div>
              <div className="book-meta">
                <span>{b.format.toUpperCase()}</span>
                <span>{b.chapterCount} 章</span>
              </div>
              <button className="book-delete" onClick={() => void handleDelete(b)}>
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
