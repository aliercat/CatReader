import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BookDetail, ChapterMeta } from '../../../shared/types'
import { paginate } from '../lib/paginate'
import TocEditor from '../components/TocEditor'
import type { InsertPosition } from '../components/TocEditor'

const DEFAULT_FONT_SIZE = 18
const DEFAULT_LINE_HEIGHT = 1.8
const DEFAULT_PAGE_WIDTH = 720
const DEFAULT_COLUMNS = 1
const COLUMN_GAP = 24
const PAGE_MIN_HEIGHT = 200

export default function Reader({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<BookDetail | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [lineHeight, setLineHeight] = useState(DEFAULT_LINE_HEIGHT)
  const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH)
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [chapterText, setChapterText] = useState('')
  const [showToc, setShowToc] = useState(false)
  const [showTocEditor, setShowTocEditor] = useState(false)
  const measureRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLElement | null>(null)
  const [pageHeight, setPageHeight] = useState(600)

  useEffect(() => {
    void (async () => {
      const d = await window.api.openBook(bookId)
      setDetail(d)
      if (d.progress) {
        setChapterIndex(d.progress.chapterIndex)
        setPageIndex(d.progress.pageIndex)
        setFontSize(d.progress.fontSize)
        setLineHeight(d.progress.lineHeight)
        setPageWidth(d.progress.pageWidth)
        setColumns(d.progress.columns ?? DEFAULT_COLUMNS)
      }
    })()
  }, [bookId])

  useEffect(() => {
    if (!detail) return
    let cancelled = false
    void window.api.getChapter(bookId, chapterIndex).then((text) => {
      if (!cancelled) setChapterText(text ?? '')
    })
    return () => {
      cancelled = true
    }
  }, [detail, bookId, chapterIndex])

  // Paginate against the real on-screen page container height so the text
  // fills the whole reading area instead of leaving a blank band at the bottom.
  useEffect(() => {
    const update = (): void => {
      const el = pageRef.current
      if (el) setPageHeight(Math.max(PAGE_MIN_HEIGHT, el.clientHeight - 2))
    }
    update()
    const timer = window.setTimeout(update, 120)
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', update)
    }
  }, [])

  const measure = useCallback(
    (t: string): number => {
      const el = measureRef.current
      if (!el) return 0
      el.textContent = t
      el.style.width = `${pageWidth}px`
      el.style.fontSize = `${fontSize}px`
      el.style.lineHeight = String(lineHeight)
      el.style.padding = '36px 44px'
      el.style.columnCount = String(columns)
      el.style.columnGap = `${COLUMN_GAP}px`
      return el.offsetHeight
    },
    [pageWidth, fontSize, lineHeight, columns]
  )

  const { pages, pageCount } = useMemo(
    () => paginate(chapterText, measure, pageHeight),
    [chapterText, measure, pageHeight]
  )

  const chapters = detail?.chapters ?? []
  const clampedPage = Math.min(pageIndex, Math.max(0, pageCount - 1))
  const chapterTitle = chapters[chapterIndex]?.title ?? ''

  useEffect(() => {
    setPageIndex((p) => Math.min(p, Math.max(0, pageCount - 1)))
  }, [pageCount, chapterIndex])

  useEffect(() => {
    if (!detail) return
    const timer = window.setTimeout(() => {
      void window.api.saveProgress(bookId, {
        chapterIndex,
        pageIndex: clampedPage,
        fontSize,
        lineHeight,
        pageWidth,
        columns
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [detail, bookId, chapterIndex, clampedPage, fontSize, lineHeight, pageWidth, columns])

  const goToChapter = (i: number, toLast = false): void => {
    const target = Math.max(0, Math.min(i, chapters.length - 1))
    setChapterIndex(target)
    setPageIndex(toLast ? Number.MAX_SAFE_INTEGER : 0)
    setShowToc(false)
  }

  const nextPage = (): void => {
    if (clampedPage < pageCount - 1) {
      setPageIndex(clampedPage + 1)
    } else if (chapterIndex < chapters.length - 1) {
      goToChapter(chapterIndex + 1)
    }
  }

  const prevPage = (): void => {
    if (clampedPage > 0) {
      setPageIndex(clampedPage - 1)
    } else if (chapterIndex > 0) {
      goToChapter(chapterIndex - 1, true)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        nextPage()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prevPage()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const adjust = (kind: 'font' | 'line' | 'width', delta: number): void => {
    if (kind === 'font') setFontSize((v) => Math.min(30, Math.max(14, v + delta)))
    if (kind === 'line') setLineHeight((v) => Math.round(Math.min(2.4, Math.max(1.5, v + delta * 0.1)) * 10) / 10)
    if (kind === 'width') setPageWidth((v) => Math.min(960, Math.max(560, v + delta * 40)))
  }

  const setColumnCount = (n: number): void => {
    const clamped = Math.min(3, Math.max(1, n))
    setColumns(clamped)
    setPageIndex(0)
  }

  const applyChapters = (newChapters: ChapterMeta[]): void => {
    setDetail((d) => (d ? { ...d, chapters: newChapters } : d))
  }

  const insertPosition: InsertPosition | null = useMemo(() => {
    if (detail?.book.format !== 'txt') return null
    const offset = pages.slice(0, clampedPage).reduce((sum, p) => sum + p.length, 0)
    return { chapterIndex, charOffset: offset }
  }, [detail, pages, clampedPage, chapterIndex])

  if (!detail) {
    return <div className="reader-loading">加载中…</div>
  }

  return (
    <div className="reader-shell">
      <div ref={measureRef} className="page-measure" aria-hidden="true" />

      <header className="reader-topbar">
        <button className="btn ghost" onClick={onBack}>
          ‹ 书架
        </button>
        <div className="reader-title" title={chapterTitle}>
          {chapterTitle}
        </div>
        <div className="reader-tools">
          <button className="btn small" onClick={() => setShowToc(true)}>
            目录
          </button>
          {detail.book.format === 'txt' && (
            <button className="btn small" onClick={() => setShowTocEditor(true)}>
              目录修正
            </button>
          )}
          <span className="tool-group">
            <button className="btn small" onClick={() => adjust('font', -1)}>
              A−
            </button>
            <button className="btn small" onClick={() => adjust('font', 1)}>
              A+
            </button>
          </span>
          <span className="tool-group">
            <button className="btn small" onClick={() => adjust('line', -1)}>
              行距−
            </button>
            <button className="btn small" onClick={() => adjust('line', 1)}>
              行距+
            </button>
          </span>
          <span className="tool-group">
            <button className="btn small" onClick={() => adjust('width', -1)}>
              页宽−
            </button>
            <button className="btn small" onClick={() => adjust('width', 1)}>
              页宽+
            </button>
          </span>
          <span className="tool-group">
            <button className="btn small" onClick={() => setColumnCount(columns - 1)} disabled={columns <= 1}>
              栏数−
            </button>
            <span className="tool-value">{columns} 栏</span>
            <button className="btn small" onClick={() => setColumnCount(columns + 1)} disabled={columns >= 3}>
              栏数+
            </button>
          </span>
        </div>
      </header>

      <div className="reader-body">
        <button className="page-zone left" onClick={prevPage} aria-label="上一页" />
        <main
          ref={pageRef}
          className="reader-page"
          style={{ maxWidth: pageWidth, columnCount: columns, columnGap: `${COLUMN_GAP}px` }}
        >
          <p className="reader-text" style={{ fontSize: `${fontSize}px`, lineHeight }}>
            {pages[clampedPage]}
          </p>
        </main>
        <button className="page-zone right" onClick={nextPage} aria-label="下一页" />
      </div>

      <footer className="reader-footer">
        <button className="btn small" onClick={prevPage} disabled={chapterIndex === 0 && clampedPage === 0}>
          上一页
        </button>
        <span>
          第 {clampedPage + 1} / {pageCount} 页 · 第 {chapterIndex + 1} / {chapters.length} 章
        </span>
        <button
          className="btn small"
          onClick={nextPage}
          disabled={chapterIndex === chapters.length - 1 && clampedPage === pageCount - 1}
        >
          下一页
        </button>
      </footer>

      {showToc && (
        <div className="toc-overlay" onClick={() => setShowToc(false)}>
          <aside className="toc-panel" onClick={(e) => e.stopPropagation()}>
            <h3>目录</h3>
            <ul className="toc-list">
              {chapters.map((c, i) => (
                <li key={i} className={i === chapterIndex ? 'active' : ''} onClick={() => goToChapter(i)}>
                  {c.title}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}

      {showTocEditor && (
        <TocEditor
          chapters={chapters}
          insertPosition={insertPosition}
          onClose={() => setShowTocEditor(false)}
          onSave={async (list) => {
            const updated = await window.api.updateToc(bookId, { chapters: list })
            applyChapters(updated)
          }}
          onReparse={async (presetIds) => {
            const updated = await window.api.updateToc(bookId, { presetIds })
            applyChapters(updated)
            goToChapter(0)
          }}
          onSplitByLines={async () => {
            const updated = await window.api.updateToc(bookId, { splitByLines: true })
            applyChapters(updated)
            goToChapter(0)
          }}
        />
      )}
    </div>
  )
}
