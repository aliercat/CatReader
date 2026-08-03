import { paginate, type MeasureFn } from './paginate'

export type ChapterPage = { kind: 'text'; text: string } | { kind: 'image'; src: string }

const IMG_MARKER = /\[\[IMG:(\d+)\]\]/g

/** 把章节文本按 [[IMG:n]] 占位标记切成文本段与图片索引 */
export function splitChapterContent(
  content: string
): ({ type: 'text'; value: string } | { type: 'image'; value: string })[] {
  const items: ({ type: 'text'; value: string } | { type: 'image'; value: string })[] = []
  let last = 0
  for (const m of content.matchAll(IMG_MARKER)) {
    const idx = m.index ?? 0
    if (idx > last) items.push({ type: 'text', value: content.slice(last, idx) })
    items.push({ type: 'image', value: m[1] })
    last = idx + m[0].length
  }
  if (last < content.length) items.push({ type: 'text', value: content.slice(last) })
  return items
}

/**
 * 把章节内容构造成阅读页序列：文本段按页切分，每张插图独占一页。
 * 图片页不需要测量，天然不会溢出。
 */
export function buildChapterPages(
  content: string,
  images: string[],
  measure: MeasureFn,
  pageHeight: number
): ChapterPage[] {
  const pages: ChapterPage[] = []
  for (const item of splitChapterContent(content)) {
    if (item.type === 'image') {
      const src = images[Number(item.value)]
      if (src) pages.push({ kind: 'image', src })
      continue
    }
    const textRun = item.value.trim()
    if (textRun === '') continue
    for (const text of paginate(textRun, measure, pageHeight).pages) {
      pages.push({ kind: 'text', text })
    }
  }
  return pages.length > 0 ? pages : [{ kind: 'text', text: '' }]
}
