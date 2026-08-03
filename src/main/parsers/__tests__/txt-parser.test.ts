import { describe, expect, it } from 'vitest'
import { chapterContent, parseTxtToc, splitByLines, stripLeadingTitle } from '../txt-parser'

const SAMPLE = [
  '楔子',
  '这是楔子内容。',
  '第一章 开始',
  '正文第一段。',
  '第2章 继续',
  '正文第二段。',
  '番外',
  '番外内容。'
].join('\n')

describe('parseTxtToc', () => {
  it('detects common Chinese chapter markers in order', () => {
    const { chapters, fallback } = parseTxtToc(SAMPLE)
    expect(fallback).toBe(false)
    expect(chapters.map((c) => c.title)).toEqual(['楔子', '第一章 开始', '第2章 继续', '番外'])
    expect(chapters[0].charStart).toBeLessThan(chapters[1].charStart)
    expect(chapters[3].charEnd).toBe(SAMPLE.length)
  })

  it('extracts chapter content by offsets', () => {
    const { chapters } = parseTxtToc(SAMPLE)
    expect(chapterContent(SAMPLE, chapters[0])).toBe('楔子\n这是楔子内容。')
    expect(chapterContent(SAMPLE, chapters[1])).toBe('第一章 开始\n正文第一段。')
  })

  it('flattens to a single chapter when no markers exist', () => {
    const text = '随便一段话\n没有章节标记\n再来一段。'
    const { chapters, fallback } = parseTxtToc(text)
    expect(fallback).toBe(true)
    expect(chapters).toEqual([{ index: 0, title: '全文', charStart: 0, charEnd: text.length }])
  })

  it('ignores long lines that only look like titles', () => {
    const text = `第一章 ${'很长的正文内容'.repeat(20)}\n这是正文`
    const { chapters, fallback } = parseTxtToc(text)
    expect(fallback).toBe(true)
    expect(chapters[0].title).toBe('全文')
  })

  it('detects English chapter markers', () => {
    const text = 'Chapter 1 The Beginning\nstory\nChapter 12 End\nmore'
    const { chapters } = parseTxtToc(text)
    expect(chapters.map((c) => c.title)).toEqual(['Chapter 1 The Beginning', 'Chapter 12 End'])
  })

  it('supports numeric-section preset explicitly', () => {
    const text = '1、开篇\n内容\n2. 第二章内容\n更多'
    const { chapters } = parseTxtToc(text, ['numbered'])
    expect(chapters.map((c) => c.title)).toEqual(['1、开篇', '2. 第二章内容'])
  })
})

describe('splitByLines', () => {
  it('splits long text into fixed-size line chunks', () => {
    const lines: string[] = []
    for (let i = 0; i < 450; i++) lines.push(`line${i}`)
    const text = lines.join('\n')
    const entries = splitByLines(text, 200)
    expect(entries).toHaveLength(3)
    expect(entries[0].title).toBe('第1部分')
    expect(entries[2].charEnd).toBe(text.length)
  })

  it('keeps short text as one chapter', () => {
    const text = 'a\nb\nc'
    const entries = splitByLines(text, 200)
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe('全文')
  })
})

describe('stripLeadingTitle', () => {
  it('removes a first line that equals the chapter title', () => {
    expect(stripLeadingTitle('第一章 开始\n正文第一段。\n继续。', '第一章 开始')).toBe(
      '正文第一段。\n继续。'
    )
    expect(stripLeadingTitle('第一章 开始', '第一章 开始')).toBe('')
  })

  it('keeps content when the first line differs from the title', () => {
    expect(stripLeadingTitle('正文第一段。\n第一章 开始\n再一段。', '第一章 开始')).toBe(
      '正文第一段。\n第一章 开始\n再一段。'
    )
    expect(stripLeadingTitle('开篇的话\n正文', '序章')).toBe('开篇的话\n正文')
  })

  it('handles empty content, empty title and CRLF line endings', () => {
    expect(stripLeadingTitle('', '第一章')).toBe('')
    expect(stripLeadingTitle('第一章 开始\n正文', '')).toBe('第一章 开始\n正文')
    expect(stripLeadingTitle('\r\n第一章 开始\r\n正文。', '第一章 开始')).toBe('正文。')
  })

  it('does not strip a longer first line that merely starts with the title', () => {
    expect(stripLeadingTitle('第一章 开始（上）\n正文', '第一章 开始')).toBe('第一章 开始（上）\n正文')
  })

  it('strips repeated leading title lines (with extra whitespace)', () => {
    expect(stripLeadingTitle('第一章 开始\n 第一章 开始\n\n正文第一段。', '第一章 开始')).toBe(
      '正文第一段。'
    )
  })
})
