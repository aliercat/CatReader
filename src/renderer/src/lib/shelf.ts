import type { BookMeta } from '../../../shared/types'

export type ShelfFormatFilter = 'all' | 'txt' | 'epub'
export type ShelfSort = 'recent' | 'imported' | 'title'

/** 按书名/作者关键字过滤（忽略大小写），空查询返回全部 */
export function filterBooks<T extends BookMeta>(
  books: T[],
  query: string,
  format: ShelfFormatFilter
): T[] {
  const q = query.trim().toLowerCase()
  return books.filter((b) => {
    if (format !== 'all' && b.format !== format) return false
    if (!q) return true
    return b.title.toLowerCase().includes(q) || (b.author ?? '').toLowerCase().includes(q)
  })
}

export function sortBooks<T extends BookMeta>(books: T[], sort: ShelfSort): T[] {
  const list = [...books]
  if (sort === 'title') {
    return list.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
  }
  if (sort === 'imported') {
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }
  return list.sort(
    (a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0) || b.createdAt - a.createdAt
  )
}
