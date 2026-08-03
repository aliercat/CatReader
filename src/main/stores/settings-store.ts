import { join } from 'path'
import type { AppSettings, UpdateMode } from '../../shared/types'
import { readJson, writeJsonAtomic } from './json-store'

export const DEFAULT_SETTINGS: AppSettings = {
  updateMode: 'auto'
}

function normalize(raw: unknown): AppSettings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS }
  const mode = (raw as { updateMode?: unknown }).updateMode
  return {
    updateMode: mode === 'manual' ? 'manual' : DEFAULT_SETTINGS.updateMode
  }
}

/** 应用级设置：原子写入 + 损坏自动回退默认值 */
export class SettingsStore {
  private readonly file: string
  private data: AppSettings

  constructor(userDataPath: string) {
    this.file = join(userDataPath, 'settings.json')
    this.data = normalize(readJson(this.file, DEFAULT_SETTINGS))
  }

  get(): AppSettings {
    return { ...this.data }
  }

  set(patch: Partial<AppSettings>): AppSettings {
    this.data = { ...this.data, ...normalize({ ...this.data, ...patch }) }
    writeJsonAtomic(this.file, this.data)
    return this.get()
  }
}

export type { UpdateMode }
