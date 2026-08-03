import { describe, expect, it } from 'vitest'
import { findAllIndices, highlightInText, pageIndexForOffset } from '../find'

describe('findAllIndices', () => {
  it('finds all case-insensitive matches', () => {
    expect(findAllIndices('第一章 相遇。第一章 再见。', '第一章')).toEqual([0, 7])
    expect(findAllIndices('Hello hello HELLO', 'hello')).toEqual([0, 6, 12])
  })

  it('returns empty for blank query or no matches', () => {
    expect(findAllIndices('正文', '')).toEqual([])
    expect(findAllIndices('正文', '不存在')).toEqual([])
  })
})

describe('pageIndexForOffset', () => {
  it('maps a character offset to the page containing it', () => {
    // 页1: 5 字，图片页: 0，页2: 4 字
    const lengths = [5, 0, 4]
    expect(pageIndexForOffset(lengths, 0)).toBe(0)
    expect(pageIndexForOffset(lengths, 4)).toBe(0)
    expect(pageIndexForOffset(lengths, 5)).toBe(2)
    expect(pageIndexForOffset(lengths, 8)).toBe(2)
    expect(pageIndexForOffset(lengths, 99)).toBe(2)
  })

  it('handles an empty page list', () => {
    expect(pageIndexForOffset([], 3)).toBe(0)
  })
})

describe('highlightInText', () => {
  it('splits around the first match preserving original casing', () => {
    expect(highlightInText('正文Hello世界', 'hello')).toEqual({
      before: '正文',
      match: 'Hello',
      after: '世界'
    })
  })

  it('returns null when the query is blank or missing', () => {
    expect(highlightInText('正文', '')).toBeNull()
    expect(highlightInText('正文', '没有')).toBeNull()
  })
})
