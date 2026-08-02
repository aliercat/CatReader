export interface ChapterEntry {
  index: number
  title: string
  charStart: number
  charEnd: number
}

export interface TocPreset {
  id: string
  label: string
  patterns: RegExp[]
}

const TITLE_MAX_LENGTH = 80

export const TOC_PRESETS: TocPreset[] = [
  {
    id: 'cn-numbered',
    label: '中文数字章节（第一章 / 第1章 / 第十二回 / 第2卷）',
    patterns: [/^第\s*[0-9０-９一二三四五六七八九十百千万零两]+\s*[章回节卷部集篇]/u]
  },
  {
    id: 'cn-special',
    label: '常见卷标（楔子 / 序章 / 番外 / 尾声 / 后记）',
    patterns: [
      /^(?:楔子|序章|序言|前言|引子|引言|尾声|终章|后记|番外|外传|完结感言|作品相关)(?:[\s0-9０-９一二三四五六七八九十百千万两、。．:：)）】]|$)/u
    ]
  },
  {
    id: 'english',
    label: '英文章节（Chapter 1 / Chapter XII）',
    patterns: [/^chapter\s+[0-9]+/iu, /^chapter\s+[ivxlcdm]+/iu]
  },
  {
    id: 'numbered',
    label: '纯数字序号（1、xxx / 1. xxx）',
    patterns: [/^[0-9０-９]{1,4}\s*[、.．:：]\s*\S/u]
  }
]

export const DEFAULT_PRESET_IDS = ['cn-numbered', 'cn-special', 'english']

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
