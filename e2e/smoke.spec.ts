import { _electron as electron, expect, test } from '@playwright/test'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

test('import → shelf → open → read → progress saved', async () => {
  const libDir = mkdtempSync(join(tmpdir(), 'catreader-e2e-'))
  const txtPath = join(libDir, '源文件.txt')
  writeFileSync(
    txtPath,
    '楔子\n楔子内容。\n第一章 相遇\n正文第一段。\n第二章 分别\n正文第二段。',
    'utf-8'
  )

  const app = await electron.launch({
    args: ['.', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    cwd: process.cwd(),
    env: { ...process.env, CATREADER_LIBRARY_DIR: libDir }
  })

  try {
    const win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await expect(win.getByRole('button', { name: '导入小说' })).toBeVisible()

    // Exercise the full IPC import path (bypasses the native file dialog)
    const results = await win.evaluate(async (p: string) => window.api.importBooks([p]), txtPath)
    expect(results[0].ok).toBe(true)

    await win.reload()
    await expect(win.locator('.book-card')).toHaveCount(1)
    await expect(win.locator('.book-title')).toHaveText('源文件')

    await win.locator('.book-cover').first().click()
    await expect(win.locator('.reader-page')).toBeVisible()
    await expect(win.locator('.reader-text')).toContainText('楔子内容')

    // Flip to page 2 by clicking the right third of the reading area
    const bodyBox = await win.locator('.reader-body').boundingBox()
    if (!bodyBox) throw new Error('reader body not measurable')
    await win.mouse.click(bodyBox.x + bodyBox.width * 0.9, bodyBox.y + bodyBox.height * 0.5)
    await win.waitForTimeout(1200)

    // The middle third opens the settings panel; theme changes persist
    await win.mouse.click(bodyBox.x + bodyBox.width * 0.5, bodyBox.y + bodyBox.height * 0.5)
    await expect(win.locator('.settings-sheet')).toBeVisible()
    await win.locator('.theme-option[data-theme="night"]').click()
    await win.locator('.settings-close').click()
    await expect(win.locator('.settings-sheet')).not.toBeVisible()
    await win.waitForTimeout(1200)

    const books = await win.evaluate(async () => window.api.getBooks())
    expect(books[0].lastReadAt).toBeTruthy()
    const detail = await win.evaluate(async (id: string) => window.api.openBook(id), books[0].id)
    const p = detail.progress
    expect(p && (p.chapterIndex > 0 || p.pageIndex > 0)).toBe(true)
    expect(detail.progress?.themeId).toBe('night')
  } finally {
    await app.close()
    rmSync(libDir, { recursive: true, force: true })
  }
})
