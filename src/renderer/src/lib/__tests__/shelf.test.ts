import { describe, expect, it } from 'vitest'
import type { BookMeta } from '../../../../shared/types'
import { filterBooks, sortBooks } from '../shelf'

const books: BookMeta[] = [
  { id: '1', title: '诡秘之主', author: '爱潜水的乌贼', format: 'epub', filePath: '', fileSize: 1, chapterCount: 100, createdAt: 100, lastReadAt: 300 },
  { id: '2', title: '第一章笔记', author: '某人', format: 'txt', filePath: '', fileSize: 1, chapterCount: 10, createdAt: 200, lastReadAt: 100 },
  { id: '3', title: '凡人修仙传', format: 'txt', filePath: '', fileSize: 1, chapterCount: 20, createdAt: 150 }
]

describe('filterBooks', () => {
  it('filters by title or author, ignoring case', () => {
    expect(filterBooks(books, '诡秘', 'all').map((b) => b.id)).toEqual(['1'])
    expect(filterBooks(books, '某人', 'all').map((b) => b.id)).toEqual(['2'])
    expect(filterBooks(books, '   ', 'all')).toHaveLength(3)
  })

  it('filters by format', () => {
    expect(filterBooks(books, '', 'txt').map((b) => b.id)).toEqual(['2', '3'])
    expect(filterBooks(books, '', 'epub').map((b) => b.id)).toEqual(['1'])
  })

  it('combines keyword and format filters', () => {
    expect(filterBooks(books, '第', 'txt').map((b) => b.id)).toEqual(['2'])
  })
})

describe('sortBooks', () => {
  it('sorts by recent read, then newest import', () => {
    expect(sortBooks(books, 'recent').map((b) => b.id)).toEqual(['1', '2', '3'])
  })

  it('sorts by import time', () => {
    expect(sortBooks(books, 'imported').map((b) => b.id)).toEqual(['2', '3', '1'])
  })

  it('sorts by title', () => {
    expect(sortBooks(books, 'title').map((b) => b.id)).toEqual(['2', '3', '1'])
  })
})
