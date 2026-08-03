import { describe, expect, it } from 'vitest'
import { buildChapterPages, splitChapterContent } from '../chapter-pages'

describe('splitChapterContent', () => {
  it('returns a single text item when there are no images', () => {
    expect(splitChapterContent('第一章\n正文内容。')).toEqual([
      { type: 'text', value: '第一章\n正文内容。' }
    ])
  })

  it('splits around image markers and keeps order', () => {
    expect(splitChapterContent('开头。\n[[IMG:0]]\n中间。\n[[IMG:1]]\n结尾。')).toEqual([
      { type: 'text', value: '开头。\n' },
      { type: 'image', value: '0' },
      { type: 'text', value: '\n中间。\n' },
      { type: 'image', value: '1' },
      { type: 'text', value: '\n结尾。' }
    ])
  })

  it('handles markers at the very start or end', () => {
    expect(splitChapterContent('[[IMG:0]]\n正文')).toEqual([
      { type: 'image', value: '0' },
      { type: 'text', value: '\n正文' }
    ])
  })
})

describe('buildChapterPages', () => {
  const measure = (t: string): number => t.length

  it('paginates text and gives each image its own page', () => {
    const pages = buildChapterPages(
      '一二三四五六七八九十\n[[IMG:0]]\n甲\n[[IMG:1]]\n乙丙丁戊己庚辛壬癸',
      ['/lib/a.png', '/lib/b.png'],
      measure,
      6
    )
    expect(pages.map((p) => (p.kind === 'image' ? `img:${p.src}` : p.text))).toEqual([
      '一二三四五六',
      '七八九十',
      'img:/lib/a.png',
      '甲',
      'img:/lib/b.png',
      '乙丙丁戊己庚',
      '辛壬癸'
    ])
  })

  it('drops markers without a matching image and falls back to one empty page', () => {
    expect(buildChapterPages('', [], measure, 100)).toEqual([{ kind: 'text', text: '' }])
    expect(buildChapterPages('[[IMG:9]]', [], measure, 100)).toEqual([{ kind: 'text', text: '' }])
  })
})
