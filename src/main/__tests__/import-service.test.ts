import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { BookStore } from '../stores/book-store'
import { ProgressStore } from '../stores/progress-store'
import { TextCache } from '../services/text-cache'
import { ImportService } from '../import-service'

let dir: string
let importService: ImportService

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'catreader-import-'))
  const bookStore = new BookStore(dir)
  const progressStore = new ProgressStore(join(dir, 'progress.json'))
  importService = new ImportService(bookStore, progressStore, new TextCache())
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

async function makeEpub(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'META-INF/container.xml',
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  )
  zip.file(
    'OEBPS/content.opf',
    '<package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>导入测试书</dc:title><dc:creator>测试作者</dc:creator></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="ch1"/></spine></package>'
  )
  zip.file(
    'OEBPS/toc.ncx',
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint id="n1" playOrder="1"><navLabel><text>序章</text></navLabel><content src="ch1.xhtml"/></navPoint></navMap></ncx>'
  )
  zip.file(
    'OEBPS/ch1.xhtml',
    '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>序章</h1><p>导入测试内容。</p></body></html>'
  )
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function makeEpubWithCoverChapter(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'META-INF/container.xml',
    '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
  )
  zip.file(
    'OEBPS/content.opf',
    '<package xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>封面书</dc:title></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="cover"/><itemref idref="ch1"/></spine></package>'
  )
  zip.file(
    'OEBPS/toc.ncx',
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><navMap><navPoint id="n0" playOrder="1"><navLabel><text>封面</text></navLabel><content src="cover.xhtml"/></navPoint><navPoint id="n1" playOrder="2"><navLabel><text>第一章</text></navLabel><content src="ch1.xhtml"/></navPoint></navMap></ncx>'
  )
  zip.file('OEBPS/cover.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><img src="cover.jpg"/></body></html>')
  zip.file('OEBPS/ch1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>第一章</h1><p>正文。</p></body></html>')
  zip.file('OEBPS/cover.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]))
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('ImportService', () => {
  it('imports a txt file with parsed chapters', async () => {
    const txt = join(dir, '源文件.txt')
    writeFileSync(txt, '楔子\n楔子内容\n第一章 相遇\n正文。\n第二章 分别\n正文二。', 'utf-8')
    const [result] = await importService.importFiles([txt])
    expect(result.ok).toBe(true)
    const id = result.bookId!
    const books = JSON.parse(readFileSync(join(dir, 'books.json'), 'utf-8'))
    expect(books).toHaveLength(1)
    expect(books[0].title).toBe('源文件')
    expect(importService.getChapterText(id, 0)).toBe('楔子\n楔子内容')
    expect(importService.getChapterText(id, 1)).toBe('第一章 相遇\n正文。')
    expect(importService.getChapterText(id, 2)).toBe('第二章 分别\n正文二。')
  })

  it('imports an epub and extracts chapter text', async () => {
    const epub = join(dir, 'book.epub')
    writeFileSync(epub, await makeEpub())
    const [result] = await importService.importFiles([epub])
    expect(result.ok).toBe(true)
    const id = result.bookId!
    expect(importService.getChapterText(id, 0)).toBe('序章\n导入测试内容。')
  })

  it('backfills isCover flags for epubs imported before the flag existed', async () => {
    const epub = join(dir, 'cover.epub')
    writeFileSync(epub, await makeEpubWithCoverChapter())
    const [result] = await importService.importFiles([epub])
    expect(result.ok).toBe(true)
    const id = result.bookId!

    // 模拟旧版本：存储的章节没有 isCover 标记
    const raw = JSON.parse(readFileSync(join(dir, 'books', id, 'chapters.json'), 'utf-8'))
    raw.chapters = raw.chapters.map((c: { index: number; title: string }) => ({ index: c.index, title: c.title }))
    writeFileSync(join(dir, 'books', id, 'chapters.json'), JSON.stringify(raw))

    const chapters = importService.ensureEpubCoverFlags(id)
    expect(chapters[0].isCover).toBe(true)
    expect(chapters[1].isCover).toBeUndefined()
    expect(importService.getChapterText(id, 0)).toBe('')
  })

  it('rejects unsupported formats', async () => {
    const pdf = join(dir, 'x.pdf')
    writeFileSync(pdf, '%PDF-1.4 fake', 'utf-8')
    const [result] = await importService.importFiles([pdf])
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unsupported')
  })

  it('detects duplicates by name and size', async () => {
    const txt = join(dir, '同书.txt')
    writeFileSync(txt, '第一章 开始\n内容', 'utf-8')
    const [first] = await importService.importFiles([txt])
    const [second] = await importService.importFiles([txt])
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    expect(second.reason).toBe('duplicate')
  })

  it('deletes a book and its files', async () => {
    const txt = join(dir, '删我.txt')
    writeFileSync(txt, '第一章 开始\n内容', 'utf-8')
    const [result] = await importService.importFiles([txt])
    const id = result.bookId!
    importService.deleteBook(id)
    const bookDir = join(dir, 'books', id)
    expect(existsSync(bookDir)).toBe(false)
  })

  it('rolls back the book dir on parse failure', async () => {
    const bad = join(dir, 'bad.epub')
    writeFileSync(bad, 'this is not a zip file', 'utf-8')
    const [result] = await importService.importFiles([bad])
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('parse-error')
    // No metadata written and no half-imported book dirs left behind
    const booksFile = join(dir, 'books.json')
    if (existsSync(booksFile)) {
      expect(readFileSync(booksFile, 'utf-8')).toBe('[]')
    }
    expect(readdirSync(join(dir, 'books'))).toEqual([])
  })
})
