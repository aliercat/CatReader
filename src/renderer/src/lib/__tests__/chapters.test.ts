import { describe, expect, it } from 'vitest'
import type { ChapterMeta } from '../../../../shared/types'
import { filterChapters } from '../chapters'

const chapters: ChapterMeta[] = [
  { index: 0, title: '封面' },
  { index: 1, title: '第一章 相遇' },
  { index: 2, title: '第二章 Chapter Two' },
  { index: 3, title: '番外 1' }
]

describe('filterChapters', () => {
  it('returns all chapters for an empty query', () => {
    expect(filterChapters(chapters, '')).toEqual(chapters)
    expect(filterChapters(chapters, '   ')).toEqual(chapters)
  })

  it('matches Chinese substrings', () => {
    expect(filterChapters(chapters, '相遇').map((c) => c.index)).toEqual([1])
    expect(filterChapters(chapters, '章').map((c) => c.index)).toEqual([1, 2])
  })

  it('matches latin case-insensitively', () => {
    expect(filterChapters(chapters, 'chapter').map((c) => c.index)).toEqual([2])
    expect(filterChapters(chapters, 'TWO').map((c) => c.index)).toEqual([2])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterChapters(chapters, '不存在的章节')).toEqual([])
  })
})
