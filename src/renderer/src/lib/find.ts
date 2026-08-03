/** 在文本中查找所有匹配起点（忽略大小写） */
export function findAllIndices(text: string, query: string): number[] {
  const q = query.trim().toLowerCase()
  if (!q || !text) return []
  const lower = text.toLowerCase()
  const out: number[] = []
  let i = 0
  while (i < lower.length) {
    const idx = lower.indexOf(q, i)
    if (idx === -1) break
    out.push(idx)
    i = idx + q.length
  }
  return out
}

/**
 * 根据各页文本长度（图片页为 0）与字符偏移找到所属页码。
 * 找不到时返回最后一页。
 */
export function pageIndexForOffset(pageTextLengths: number[], offset: number): number {
  if (pageTextLengths.length === 0) return 0
  let acc = 0
  for (let i = 0; i < pageTextLengths.length; i++) {
    acc += pageTextLengths[i]
    if (acc > offset) return i
  }
  return pageTextLengths.length - 1
}

/** 在页面文本中高亮第一处匹配（忽略大小写），未命中返回 null */
export function highlightInText(
  text: string,
  query: string
): { before: string; match: string; after: string } | null {
  const q = query.trim()
  if (!q) return null
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return null
  return {
    before: text.slice(0, idx),
    match: text.slice(idx, idx + q.length),
    after: text.slice(idx + q.length)
  }
}
