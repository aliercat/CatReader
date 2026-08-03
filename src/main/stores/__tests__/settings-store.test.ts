import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, SettingsStore } from '../settings-store'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'catreader-settings-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('settings-store', () => {
  it('defaults to auto update mode', () => {
    const store = new SettingsStore(dir)
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('persists changes and reloads them', () => {
    const store = new SettingsStore(dir)
    store.set({ updateMode: 'manual' })
    expect(store.get()).toEqual({ updateMode: 'manual' })
    expect(new SettingsStore(dir).get()).toEqual({ updateMode: 'manual' })
  })

  it('ignores unknown values and falls back to defaults', () => {
    const store = new SettingsStore(dir)
    store.set({ updateMode: 'auto' })
    // @ts-expect-error 非法值应被归一化
    store.set({ updateMode: 'nonsense' })
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults when the file is corrupt', () => {
    writeFileSync(join(dir, 'settings.json'), '{corrupt json', 'utf-8')
    expect(new SettingsStore(dir).get()).toEqual(DEFAULT_SETTINGS)
  })
})
