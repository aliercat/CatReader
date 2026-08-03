export interface ChapterEntry {
  index: number
  title: string
  charStart: number
  charEnd: number
}

import { DEFAULT_PRESET_IDS, TOC_PRESETS } from '../../shared/toc-presets'
import type { TocPreset } from '../../shared/toc-presets'

const TITLE_MAX_LENGTH = 80

export { DEFAULT_PRESET_IDS, TOC_PRESETS }
export type { TocPreset }

export interface TxtTocResult {
  chapters: ChapterEntry[]
  /** true when no chapter markers were found and the book was flattened */
  fallback: boolean
}

/**
 * Parse chapter markers from decoded plain text.
 * Titles must start at the beginning of a line; long lines are ignored.
 */
export function parseTxtToc(text: string, presetIds: string[] = DEFAULT_PRESET_IDS): TxtTocResult {
  const patterns = TOC_PRESETS.filter((p) => presetIds.includes(p.id)).flatMap((p) => p.patterns)
  const matches: { index: number; title: string }[] = []

  for (const pattern of patterns) {
    const flags = Array.from(new Set([...(pattern.flags || ''), 'g', 'm'])).join('')
    const re = new RegExp(pattern.source, flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++
        continue
      }
      // Title = full line (trimmed), capped at TITLE_MAX_LENGTH
      const lineStart = text.lastIndexOf('\n', m.index) + 1
      const lineEnd = text.indexOf('\n', m.index)
      const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd).trim()
      if (line.length > 0 && line.length <= TITLE_MAX_LENGTH) {
        matches.push({ index: m.index, title: line })
      }
      if (m[0].length === 0) break
    }
  }

  matches.sort((a, b) => a.index - b.index)
  const seen = new Set<number>()
  const unique = matches.filter((m) => {
    if (seen.has(m.index)) return false
    seen.add(m.index)
    return true
  })

  if (unique.length < 2) {
    return { chapters: [{ index: 0, title: '全文', charStart: 0, charEnd: text.length }], fallback: true }
  }

  const chapters: ChapterEntry[] = unique.map((m, i) => ({
    index: i,
    title: m.title,
    charStart: m.index,
    charEnd: i + 1 < unique.length ? unique[i + 1].index : text.length
  }))
  return { chapters, fallback: false }
}

export function chapterContent(text: string, entry: ChapterEntry): string {
  return text.slice(entry.charStart, entry.charEnd).trim()
}

/**
 * 去掉章节正文开头与章节标题重复的行。
 * 顶栏已经显示章节名，正文里再出现一次标题会显得重复；
 * 只有第一行与标题完全一致时才剥离，避免误删正文内容。
 */
export function stripLeadingTitle(content: string, title: string): string {
  const trimmedTitle = title.trim()
  let rest = content.trimStart()
  if (!rest || !trimmedTitle) return content
  let changed = false
  for (;;) {
    const newline = rest.search(/[\r\n]/)
    const firstLine = (newline === -1 ? rest : rest.slice(0, newline)).trim()
    if (firstLine !== trimmedTitle) break
    changed = true
    if (newline === -1) {
      rest = ''
      break
    }
    rest = rest.slice(newline).trimStart()
  }
  return changed ? rest : content
}

/**
 * Fallback used when a user forces a re-parse without any matching preset.
 */
export function splitByLines(text: string, linesPerChapter = 200): ChapterEntry[] {
  const entries: ChapterEntry[] = []
  const lineStarts: number[] = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') lineStarts.push(i + 1)
  }
  if (lineStarts.length <= linesPerChapter) {
    return [{ index: 0, title: '全文', charStart: 0, charEnd: text.length }]
  }
  let start = 0
  let idx = 0
  while (start < lineStarts.length - 1) {
    const endLine = Math.min(start + linesPerChapter, lineStarts.length - 1)
    const charEnd = endLine === lineStarts.length - 1 ? text.length : lineStarts[endLine]
    entries.push({ index: idx, title: `第${idx + 1}部分`, charStart: lineStarts[start], charEnd })
    idx++
    start = endLine
  }
  return entries
}
