import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { BookDetail, ChapterMeta } from '../../../shared/types'
import { paginate } from '../lib/paginate'
import { fileUrl } from '../lib/file-url'
import {
  READER_DEFAULTS,
  clampNumber,
  getReaderZone,
  resolveFont,
  resolveTheme,
  type ReaderSettings
} from '../lib/reader-presets'
import TocEditor from '../components/TocEditor'
import SettingsPanel from '../components/SettingsPanel'
import type { InsertPosition } from '../components/TocEditor'

const COLUMN_GAP = 24
const PAGE_MIN_HEIGHT = 200

export default function Reader({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<BookDetail | null>(null)
  const [chapterIndex, setChapterIndex] = useState(0)
  const [pageIndex, setPageIndex] = useState(0)
  const [fontSize, setFontSize] = useState(READER_DEFAULTS.fontSize)
  const [lineHeight, setLineHeight] = useState(READER_DEFAULTS.lineHeight)
  const [pageWidth, setPageWidth] = useState(READER_DEFAULTS.pageWidth)
  const [columns, setColumns] = useState(READER_DEFAULTS.columns)
  const [themeId, setThemeId] = useState(READER_DEFAULTS.themeId)
  const [fontFamily, setFontFamily] = useState(READER_DEFAULTS.fontFamily)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chapterText, setChapterText] = useState('')
  const [loadedChapterIndex, setLoadedChapterIndex] = useState(-1)
  const [showToc, setShowToc] = useState(false)
  const [showTocEditor, setShowTocEditor] = useState(false)
  const measureRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLElement | null>(null)
  const [pageHeight, setPageHeight] = useState(600)
  const [measureWidth, setMeasureWidth] = useState(READER_DEFAULTS.pageWidth)

  const theme = resolveTheme(themeId)
  const font = resolveFont(fontFamily)

  useEffect(() => {
    void (async () => {
      const d = await window.api.openBook(bookId)
      setDetail(d)
      if (d.progress) {
        setChapterIndex(d.progress.chapterIndex)
        setPageIndex(d.progress.pageIndex)
        setFontSize(d.progress.fontSize ?? READER_DEFAULTS.fontSize)
        setLineHeight(d.progress.lineHeight ?? READER_DEFAULTS.lineHeight)
        setPageWidth(d.progress.pageWidth ?? READER_DEFAULTS.pageWidth)
        setColumns(d.progress.columns ?? READER_DEFAULTS.columns)
        setThemeId(d.progress.themeId ?? READER_DEFAULTS.themeId)
        setFontFamily(d.progress.fontFamily ?? READER_DEFAULTS.fontFamily)
      }
    })()
  }, [bookId])

  useEffect(() => {
    if (!detail) return
    let cancelled = false
    void window.api.getChapter(bookId, chapterIndex).then((text) => {
      if (!cancelled) {
        setChapterText(text ?? '')
        setLoadedChapterIndex(chapterIndex)
      }
    })
    return () => {
      cancelled = true
    }
  }, [detail, bookId, chapterIndex])

  // Paginate against the real on-screen page container size so the text fills
  // the reading area and columns never overflow. A ResizeObserver keeps the
  // measurement in sync with the actual container, which may not be mounted
  // yet on the first effect run (large books load slowly) or may resize when
  // the window / topbar / page-width changes.
  useLayoutEffect(() => {
    const update = (): void => {
      const el = pageRef.current
      if (el) {
        setPageHeight(Math.max(PAGE_MIN_HEIGHT, el.clientHeight - 2))
        setMeasureWidth(Math.max(200, el.clientWidth - 2))
      }
    }
    update()
    const el = pageRef.current
    if (el) {
      const observer = new ResizeObserver(update)
      observer.observe(el)
      return () => observer.disconnect()
    }
    return undefined
  }, [pageWidth, detail])

  const measure = useCallback(
    (t: string): number => {
      const el = measureRef.current
      if (!el) return 0
      el.textContent = t
      el.style.width = `${measureWidth}px`
      el.style.fontSize = `${fontSize}px`
      el.style.lineHeight = String(lineHeight)
      el.style.fontFamily = font.stack
      el.style.padding = '36px 44px'
      el.style.columnCount = String(columns)
      el.style.columnGap = `${COLUMN_GAP}px`
      return el.offsetHeight
    },
    [measureWidth, fontSize, lineHeight, columns, font]
  )

  const { pages, pageCount } = useMemo(
    () => paginate(chapterText, measure, pageHeight),
    [chapterText, measure, pageHeight]
  )

  const chapters = detail?.chapters ?? []
  const isCoverChapter = chapters[chapterIndex]?.isCover === true
  const chapterReady = loadedChapterIndex === chapterIndex
  const clampedPage = Math.min(pageIndex, Math.max(0, pageCount - 1))
  const chapterTitle = chapters[chapterIndex]?.title ?? ''

  useEffect(() => {
    // 章节文本异步加载期间 pages 仍属于上一章，不能用它的 pageCount 去钳制页码，
    // 否则“回到上一章最后一页”（pageIndex 暂存为 MAX_SAFE_INTEGER）会被错误收敛
    if (loadedChapterIndex !== chapterIndex) return
    setPageIndex((p) => Math.min(p, Math.max(0, pageCount - 1)))
  }, [pageCount, chapterIndex, loadedChapterIndex])

  useEffect(() => {
    if (!detail || !chapterReady) return
    const timer = window.setTimeout(() => {
      void window.api.saveProgress(bookId, {
        chapterIndex,
        pageIndex: clampedPage,
        fontSize,
        lineHeight,
        pageWidth,
        columns,
        themeId,
        fontFamily
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [
    detail,
    bookId,
    chapterIndex,
    clampedPage,
    fontSize,
    lineHeight,
    pageWidth,
    columns,
    themeId,
    fontFamily,
    chapterReady
  ])

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
      if (settingsOpen) {
        if (e.key === 'Escape') setSettingsOpen(false)
        return
      }
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

  const updateSettings = (patch: Partial<ReaderSettings>): void => {
    if (patch.fontSize !== undefined) setFontSize(clampNumber(14, 30, patch.fontSize))
    if (patch.lineHeight !== undefined) {
      setLineHeight(Math.round(clampNumber(1.5, 2.4, patch.lineHeight) * 10) / 10)
    }
    if (patch.pageWidth !== undefined) setPageWidth(clampNumber(560, 960, patch.pageWidth))
    if (patch.columns !== undefined) {
      const n = Math.min(3, Math.max(1, Math.round(patch.columns)))
      if (n !== columns) {
        setColumns(n)
        setPageIndex(0)
      }
    }
    if (patch.themeId !== undefined) setThemeId(patch.themeId)
    if (patch.fontFamily !== undefined) setFontFamily(patch.fontFamily)
  }

  const resetSettings = (): void => {
    setFontSize(READER_DEFAULTS.fontSize)
    setLineHeight(READER_DEFAULTS.lineHeight)
    setPageWidth(READER_DEFAULTS.pageWidth)
    setColumns(READER_DEFAULTS.columns)
    setThemeId(READER_DEFAULTS.themeId)
    setFontFamily(READER_DEFAULTS.fontFamily)
    setPageIndex(0)
  }

  const onBodyClick = (e: ReactMouseEvent<HTMLDivElement>): void => {
    if (settingsOpen) return
    // 拖动选中文字后松开的 click 不应触发翻页/设置
    if ((window.getSelection()?.toString() ?? '').length > 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const zone = getReaderZone(e.clientX - rect.left, rect.width)
    if (zone === 'left') prevPage()
    else if (zone === 'right') nextPage()
    else setSettingsOpen(true)
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
        <button
          className="btn ghost btn-back"
          onClick={onBack}
          aria-label="返回书架"
          title="返回书架"
        >
          ←
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
          <button className="btn small" onClick={() => setSettingsOpen(true)}>
            设置
          </button>
        </div>
      </header>

      <div className="reader-body" onClick={onBodyClick}>
        <main
          ref={pageRef}
          className={`reader-page${isCoverChapter ? ' cover' : ''}`}
          style={{
            maxWidth: pageWidth,
            columnCount: isCoverChapter ? 'auto' : columns,
            columnGap: isCoverChapter ? 'normal' : `${COLUMN_GAP}px`,
            background: theme.bg,
            color: theme.text
          }}
        >
          {isCoverChapter ? (
            detail.book.coverPath ? (
              <div className="reader-cover">
                <img src={fileUrl(detail.book.coverPath)} alt="" />
              </div>
            ) : (
              <div className="reader-cover-fallback">{detail.book.title}</div>
            )
          ) : !chapterReady ? (
            <p className="reader-text reader-text-loading">加载中…</p>
          ) : (
            <p
              className="reader-text"
              style={{ fontSize: `${fontSize}px`, lineHeight, fontFamily: font.stack }}
            >
              {pages[clampedPage]}
            </p>
          )}
        </main>
      </div>

      <footer className="reader-footer">
        <button
          className="btn small"
          onClick={prevPage}
          disabled={chapterIndex === 0 && clampedPage === 0}
        >
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

      <SettingsPanel
        open={settingsOpen}
        settings={{ fontSize, lineHeight, pageWidth, columns, themeId, fontFamily }}
        onChange={updateSettings}
        onReset={resetSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <div className={`toc-overlay${showToc ? ' open' : ''}`} onClick={() => setShowToc(false)}>
        <aside className="toc-panel" onClick={(e) => e.stopPropagation()}>
          <div className="toc-header">
            <h3>目录</h3>
            <button className="toc-close" onClick={() => setShowToc(false)} aria-label="关闭目录">
              ✕
            </button>
          </div>
          <ul className="toc-list">
            {chapters.map((c, i) => (
              <li
                key={i}
                className={i === chapterIndex ? 'active' : ''}
                onClick={() => goToChapter(i)}
              >
                {c.title}
              </li>
            ))}
          </ul>
        </aside>
      </div>

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
