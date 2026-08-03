import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

test('import → shelf → open → read → progress saved', async () => {
  const libDir = mkdtempSync(join(tmpdir(), 'catreader-e2e-'))
  const txtPath = join(libDir, '源文件.txt')
  writeFileSync(txtPath, '楔子\n楔子内容。\n第一章 相遇\n正文第一段。\n第二章 分别\n正文第二段。', 'utf-8')

  const app = await electron.launch({
    args: ['.'],
    cwd: process.cwd(),
    env: { ...process.env, CATREADER_LIBRARY_DIR: libDir }
  })

  try {
    const win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await expect(win.locator('h1')).toHaveText('CatReader')

    // Exercise the full IPC import path (bypasses the native file dialog)
    const results = await win.evaluate(async (p: string) => window.api.importBooks([p]), txtPath)
    expect(results[0].ok).toBe(true)

    await win.reload()
    await expect(win.locator('.book-card')).toHaveCount(1)
    await expect(win.locator('.book-title')).toHaveText('源文件')

    await win.locator('.book-cover').first().click()
    await expect(win.locator('.reader-page')).toBeVisible()
    await expect(win.locator('.reader-text')).toContainText('楔子内容')

    // Flip to page 2 and wait for the debounced progress save
    await win.locator('.page-zone.right').click()
    await win.waitForTimeout(1200)

    const books = await win.evaluate(async () => window.api.getBooks())
    expect(books[0].lastReadAt).toBeTruthy()
    const detail = await win.evaluate(async (id: string) => window.api.openBook(id), books[0].id)
    expect(detail.progress?.pageIndex).toBeGreaterThan(0)
  } finally {
    await app.close()
    rmSync(libDir, { recursive: true, force: true })
  }
})
