import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ProgressStore } from '../progress-store'

let file: string
let store: ProgressStore

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'catreader-progress-'))
  file = join(dir, 'progress.json')
  store = new ProgressStore(file)
})

afterEach(() => {
  rmSync(file, { recursive: true, force: true })
})

describe('ProgressStore', () => {
  it('saves and reads progress', () => {
    store.save('book-a', { chapterIndex: 2, pageIndex: 5, fontSize: 18, lineHeight: 1.8, pageWidth: 700 })
    const p = store.get('book-a')
    expect(p?.chapterIndex).toBe(2)
    expect(p?.pageIndex).toBe(5)
    expect(typeof p?.updatedAt).toBe('number')
  })

  it('returns null for unknown books', () => {
    expect(store.get('nope')).toBeNull()
  })

  it('removes progress', () => {
    store.save('book-a', { chapterIndex: 0, pageIndex: 0, fontSize: 18, lineHeight: 1.8, pageWidth: 700 })
    store.remove('book-a')
    expect(store.get('book-a')).toBeNull()
  })
})
