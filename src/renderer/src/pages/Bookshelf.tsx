import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
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
import Dropdown from '../components/Dropdown'
import ConfirmDialog from '../components/ConfirmDialog'

function AddBookCard({ onAdd }: { onAdd: () => void }): JSX.Element {
  return (
    <button className="book-add" onClick={onAdd} aria-label="导入小说" title="导入小说">
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )
}

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
  const [deleteTarget, setDeleteTarget] = useState<BookshelfItem | null>(null)

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
    setDeleteTarget(b)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    await window.api.deleteBook(deleteTarget.id)
    setDeleteTarget(null)
    await refresh()
  }

  const visible = useMemo(
    () => sortBooks(filterBooks(books, query, format), sort),
    [books, query, format, sort]
  )

  return (
    <div className="shelf-page">
      <header className="shelf-header">
        <WindowControls />
      </header>
      <div className="shelf">
        {books.length > 0 && (
          <div className="shelf-toolbar">
            <input
              className="shelf-search"
              type="search"
              placeholder="搜索书名或作者"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Dropdown
              ariaLabel="格式"
              value={format}
              options={[
                { value: 'all', label: '全部格式' },
                { value: 'txt', label: 'TXT' },
                { value: 'epub', label: 'EPUB' }
              ]}
              onChange={(v) => setFormat(v)}
            />
            <Dropdown
              ariaLabel="排序"
              value={sort}
              options={[
                { value: 'recent', label: '最近阅读' },
                { value: 'imported', label: '最近导入' },
                { value: 'title', label: '书名' }
              ]}
              onChange={(v) => setSort(v)}
            />
          </div>
        )}
        {notice && <div className="notice">{notice}</div>}
        <UpdateBar
          state={updateState}
          onRestart={() => void window.api.quitAndInstall()}
          onRetry={() => void handleCheckUpdate()}
        />
        {loading ? (
          <p className="empty">加载中…</p>
        ) : books.length === 0 ? (
          <>
            <div className="empty">
              <p className="empty-title">书架还是空的</p>
              <p className="empty-sub">点击下方虚线卡片，导入 txt / epub 小说。</p>
            </div>
            <div className="book-grid">
              <AddBookCard onAdd={() => void handleImport()} />
            </div>
          </>
        ) : visible.length === 0 ? (
          <div className="empty">
            <p className="empty-title">没有匹配的书籍</p>
            <p className="empty-sub">换个关键词或筛选条件试试。</p>
          </div>
        ) : (
          <div className="book-grid">
            {visible.map((b) => (
              <div className="book-card" key={b.id}>
                <div className="book-cover-wrap">
                  <button className="book-cover" onClick={() => onOpen(b.id)} title={`打开《${b.title}》`}>
                    {b.coverPath ? <img src={fileUrl(b.coverPath)} alt="" /> : <CoverPlaceholder title={b.title} />}
                    {b.readPercent != null && <span className="read-badge">已读 {b.readPercent}%</span>}
                  </button>
                  <button
                    className="book-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDelete(b)
                    }}
                    aria-label={`删除《${b.title}》`}
                    title="删除"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
                <div className="book-title" title={b.title}>
                  {b.title}
                </div>
                <div className="book-meta">
                  <span>{b.format.toUpperCase()}</span>
                  <span>{b.chapterCount} 章</span>
                </div>
              </div>
            ))}
            <AddBookCard onAdd={() => void handleImport()} />
          </div>
        )}
      </div>
      <div className="shelf-menu-dock">
        <AppMenu
          uiTheme={uiTheme}
          onUiThemeChange={onUiThemeChange}
          updateMode={updateMode}
          onUpdateModeChange={(m) => void handleUpdateModeChange(m)}
          updateState={updateState}
          onCheckUpdate={() => void handleCheckUpdate()}
          onAbout={() => setAboutOpen(true)}
        />
      </div>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ConfirmDialog
        open={deleteTarget !== null}
        message={deleteTarget ? `删除《${deleteTarget.title}》？书籍文件与阅读进度将一并移除。` : ''}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
