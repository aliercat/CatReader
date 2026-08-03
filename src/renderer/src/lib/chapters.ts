import type { ChapterMeta } from '../../../shared/types'

/** 目录搜索：按章节标题过滤（忽略大小写），空查询返回全部 */
export function filterChapters(chapters: ChapterMeta[], query: string): ChapterMeta[] {
  const q = query.trim().toLowerCase()
  if (!q) return chapters
  return chapters.filter((c) => c.title.toLowerCase().includes(q))
}
