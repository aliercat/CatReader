import { useCallback, useEffect, useState } from 'react'
import type { BookMeta } from '../../../shared/types'
import { CoverPlaceholder } from '../components/CoverPlaceholder'
import { fileUrl } from '../lib/file-url'

export default function Bookshelf({ onOpen }: { onOpen: (id: string) => void }) {
  const [books, setBooks] = useState<BookMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBooks(await window.api.getBooks())
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

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

  const handleDelete = async (b: BookMeta): Promise<void> => {
    if (!window.confirm(`删除《${b.title}》？书籍文件与阅读进度将一并移除。`)) return
    await window.api.deleteBook(b.id)
    await refresh()
  }

  const sorted = [...books].sort(
    (a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0) || b.createdAt - a.createdAt
  )

  return (
    <div className="shelf">
      <header className="shelf-header">
        <h1>CatReader</h1>
        <button className="btn primary" onClick={() => void handleImport()}>
          导入小说
        </button>
      </header>
      {notice && <div className="notice">{notice}</div>}
      {loading ? (
        <p className="empty">加载中…</p>
      ) : sorted.length === 0 ? (
        <div className="empty">
          <p className="empty-title">书架还是空的</p>
          <p className="empty-sub">点击右上角“导入小说”，支持 txt / epub 格式。</p>
        </div>
      ) : (
        <div className="book-grid">
          {sorted.map((b) => (
            <div className="book-card" key={b.id}>
              <button className="book-cover" onClick={() => onOpen(b.id)} title={`打开《${b.title}》`}>
                {b.coverPath ? <img src={fileUrl(b.coverPath)} alt="" /> : <CoverPlaceholder title={b.title} />}
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
