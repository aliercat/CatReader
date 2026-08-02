import { basename, join } from 'path'
import { mkdirSync } from 'fs'
import type { BookChapters, BookMeta } from '../../shared/types'
import { readJson, writeJsonAtomic } from './json-store'

export class BookStore {
  constructor(private readonly libraryRoot: string) {
    mkdirSync(this.libraryRoot, { recursive: true })
    mkdirSync(join(this.libraryRoot, 'books'), { recursive: true })
  }

  get booksFile(): string {
    return join(this.libraryRoot, 'books.json')
  }

  getBookDir(id: string): string {
    return join(this.libraryRoot, 'books', id)
  }

  list(): BookMeta[] {
    return readJson<BookMeta[]>(this.booksFile, [])
  }

  get(id: string): BookMeta | undefined {
    return this.list().find((b) => b.id === id)
  }

  add(meta: BookMeta): void {
    const all = this.list()
    if (!all.some((b) => b.id === meta.id)) {
      all.push(meta)
      writeJsonAtomic(this.booksFile, all)
    }
  }

  update(id: string, patch: Partial<BookMeta>): void {
    const all = this.list()
    const i = all.findIndex((b) => b.id === id)
    if (i >= 0) {
      all[i] = { ...all[i], ...patch }
      writeJsonAtomic(this.booksFile, all)
    }
  }

  remove(id: string): void {
    writeJsonAtomic(
      this.booksFile,
      this.list().filter((b) => b.id !== id)
    )
  }

  findDuplicate(fileName: string, fileSize: number): BookMeta | undefined {
    return this.list().find((b) => basename(b.filePath) === fileName && b.fileSize === fileSize)
  }

  chaptersFile(id: string): string {
    return join(this.getBookDir(id), 'chapters.json')
  }

  readChapters(id: string): BookChapters | null {
    return readJson<BookChapters | null>(this.chaptersFile(id), null)
  }

  writeChapters(id: string, data: BookChapters): void {
    writeJsonAtomic(this.chaptersFile(id), data)
  }
}
