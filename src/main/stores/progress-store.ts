import type { Progress } from '../../shared/types'
import { readJson, writeJsonAtomic } from './json-store'

export class ProgressStore {
  constructor(private readonly file: string) {}

  private data(): Record<string, Progress> {
    return readJson<Record<string, Progress>>(this.file, {})
  }

  get(bookId: string): Progress | null {
    return this.data()[bookId] ?? null
  }

  save(bookId: string, progress: Omit<Progress, 'updatedAt'>): void {
    const data = this.data()
    data[bookId] = { ...progress, updatedAt: Date.now() }
    writeJsonAtomic(this.file, data)
  }

  remove(bookId: string): void {
    const data = this.data()
    delete data[bookId]
    writeJsonAtomic(this.file, data)
  }
}
