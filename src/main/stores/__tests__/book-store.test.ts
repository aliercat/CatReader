import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BookStore } from '../book-store'
import type { BookMeta } from '../../../shared/types'

let dir: string
let store: BookStore

function makeMeta(overrides: Partial<BookMeta> = {}): BookMeta {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: '测试书',
    format: 'txt',
    filePath: join(dir, 'books', '11111111-1111-1111-1111-111111111111', 'book.txt'),
    fileSize: 123,
    chapterCount: 3,
    createdAt: 1,
    ...overrides
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'catreader-bookstore-'))
  store = new BookStore(dir)
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('BookStore', () => {
  it('adds, lists and reads books', () => {
    store.add(makeMeta())
    const all = store.list()
    expect(all).toHaveLength(1)
    expect(store.get('11111111-1111-1111-1111-111111111111')?.title).toBe('测试书')
  })

  it('updates fields and keeps others', () => {
    store.add(makeMeta())
    store.update('11111111-1111-1111-1111-111111111111', { chapterCount: 5, lastReadAt: 99 })
    const book = store.get('11111111-1111-1111-1111-111111111111')
    expect(book?.chapterCount).toBe(5)
    expect(book?.lastReadAt).toBe(99)
    expect(book?.title).toBe('测试书')
  })

  it('removes books', () => {
    store.add(makeMeta())
    store.remove('11111111-1111-1111-1111-111111111111')
    expect(store.list()).toHaveLength(0)
  })

  it('detects duplicates by file name and size', () => {
    store.add(makeMeta({ filePath: join(dir, 'books', 'x', 'book.txt'), fileSize: 100 }))
    expect(store.findDuplicate('book.txt', 100)).toBeDefined()
    expect(store.findDuplicate('book.txt', 200)).toBeUndefined()
    expect(store.findDuplicate('other.txt', 100)).toBeUndefined()
  })

  it('persists chapters metadata', () => {
    store.writeChapters('11111111-1111-1111-1111-111111111111', {
      source: 'txt',
      fallback: false,
      chapters: [{ index: 0, title: '第一章', charStart: 0, charEnd: 10 }]
    })
    const chapters = store.readChapters('11111111-1111-1111-1111-111111111111')
    expect(chapters?.chapters[0].title).toBe('第一章')
    expect(chapters?.chapters[0].charEnd).toBe(10)
  })

  it('recovers from a missing or corrupt books.json', () => {
    writeFileSync(store.booksFile, '{corrupt json', 'utf-8')
    expect(store.list()).toEqual([])
  })
})
