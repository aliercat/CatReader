import { useState } from 'react'
import type { ChapterMeta } from '../../../shared/types'
import { DEFAULT_PRESET_IDS, TOC_PRESETS } from '../../../shared/toc-presets'

export interface InsertPosition {
  chapterIndex: number
  charOffset: number
}

interface TocEditorProps {
  chapters: ChapterMeta[]
  insertPosition: InsertPosition | null
  onClose: () => void
  onSave: (chapters: ChapterMeta[]) => Promise<void>
  onReparse: (presetIds: string[]) => Promise<void>
  onSplitByLines: () => Promise<void>
}

export default function TocEditor({
  chapters,
  insertPosition,
  onClose,
  onSave,
  onReparse,
  onSplitByLines
}: TocEditorProps) {
  const [list, setList] = useState<ChapterMeta[]>(chapters)
  const [selected, setSelected] = useState<string[]>(DEFAULT_PRESET_IDS)
  const [busy, setBusy] = useState(false)

  const updateTitle = (i: number, title: string): void => {
    setList((prev) => prev.map((c, idx) => (idx === i ? { ...c, title } : c)))
  }

  const removeChapter = (i: number): void => {
    if (list.length <= 1) return
    const next = [...list]
    if (i > 0) {
      next[i - 1] = { ...next[i - 1], charEnd: next[i].charEnd ?? next[i - 1].charEnd }
      next.splice(i, 1)
    } else {
      next[1] = { ...next[1], charStart: next[0].charStart ?? next[1].charStart }
      next.splice(0, 1)
    }
    setList(next.map((c, idx) => ({ ...c, index: idx })))
  }

  const insertMarker = (): void => {
    if (!insertPosition) return
    const { chapterIndex, charOffset } = insertPosition
    const current = list[chapterIndex]
    if (!current || current.charStart === undefined || current.charEnd === undefined) return
    const newStart = current.charStart + charOffset
    if (newStart <= current.charStart || newStart >= current.charEnd) return
    const next = [...list]
    next[chapterIndex] = { ...current, charEnd: newStart }
    next.splice(chapterIndex + 1, 0, {
      index: chapterIndex + 1,
      title: `第${list.length + 1}章`,
      charStart: newStart,
      charEnd: current.charEnd
    })
    setList(next.map((c, idx) => ({ ...c, index: idx })))
  }

  const togglePreset = (id: string): void => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const run = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal toc-editor" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h3>目录修正（txt）</h3>
          <button className="btn ghost" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="toc-edit-actions">
          <button
            className="btn small"
            disabled={!insertPosition || busy}
            onClick={() => void run(async () => insertMarker())}
          >
            在阅读位置插入章节标记
          </button>
          <button
            className="btn small"
            disabled={busy}
            onClick={() => void run(async () => onSplitByLines())}
          >
            按每 200 行分段
          </button>
        </div>

        <div className="toc-edit-presets">
          <span>重新解析：</span>
          {TOC_PRESETS.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => togglePreset(p.id)}
              />
              {p.label}
            </label>
          ))}
          <button
            className="btn small"
            disabled={busy || selected.length === 0}
            onClick={() => void run(async () => onReparse(selected))}
          >
            重新解析
          </button>
        </div>

        <ul className="toc-edit-list">
          {list.map((c, i) => (
            <li key={i} className="toc-edit-item">
              <input
                className="toc-edit-title"
                value={c.title}
                onChange={(e) => updateTitle(i, e.target.value)}
              />
              <button className="btn small danger" onClick={() => removeChapter(i)} disabled={busy || list.length <= 1}>
                删除（并入上一章）
              </button>
            </li>
          ))}
        </ul>

        <footer className="modal-footer">
          <button className="btn primary" disabled={busy} onClick={() => void run(async () => onSave(list))}>
            保存修改
          </button>
        </footer>
      </div>
    </div>
  )
}
