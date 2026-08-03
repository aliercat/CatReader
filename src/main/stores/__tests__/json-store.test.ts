import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readJson, writeJsonAtomic } from '../json-store'

let dir: string
let file: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'catreader-json-'))
  file = join(dir, 'store.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('json-store backup', () => {
  it('keeps the two most recent backups on each write', () => {
    writeJsonAtomic(file, { v: 1 })
    writeJsonAtomic(file, { v: 2 })
    writeJsonAtomic(file, { v: 3 })

    expect(readJson(file, null)).toEqual({ v: 3 })
    expect(readJson(`${file}.bak`, null)).toEqual({ v: 2 })
    expect(readJson(`${file}.bak.1`, null)).toEqual({ v: 1 })
  })

  it('falls back to the nearest backup when the main file is corrupt', () => {
    writeJsonAtomic(file, { v: 1 })
    writeJsonAtomic(file, { v: 2 })
    writeFileSync(file, '{corrupt json', 'utf-8')

    expect(readJson(file, null)).toEqual({ v: 1 })
  })

  it('returns the fallback when nothing exists or everything is corrupt', () => {
    expect(readJson(file, 'default')).toBe('default')
    writeJsonAtomic(file, { v: 1 })
    writeFileSync(file, 'x', 'utf-8')
    writeFileSync(`${file}.bak`, 'y', 'utf-8')
    writeFileSync(`${file}.bak.1`, 'z', 'utf-8')
    expect(readJson(file, 'default')).toBe('default')
  })
})
