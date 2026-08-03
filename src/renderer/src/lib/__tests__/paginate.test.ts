import { describe, expect, it } from 'vitest'
import { paginate } from '../paginate'

/** Mock measure: every character is 1px tall, so a page holds pageHeight chars. */
const measureByLength = (text: string): number => text.length

describe('paginate', () => {
  it('splits text into fixed-height pages', () => {
    const text = 'a'.repeat(50)
    const { pages, pageCount } = paginate(text, measureByLength, 20)
    expect(pageCount).toBe(3)
    expect(pages[0].length).toBe(20)
    expect(pages[1].length).toBe(20)
    expect(pages[2].length).toBe(10)
    expect(pages.join('').replace(/ /g, '')).toBe(text)
  })

  it('handles empty text', () => {
    const { pages, pageCount } = paginate('', measureByLength, 20)
    expect(pageCount).toBe(1)
    expect(pages[0]).toBe('')
  })

  it('handles text shorter than one page', () => {
    const { pageCount, pages } = paginate('short', measureByLength, 100)
    expect(pageCount).toBe(1)
    expect(pages[0]).toBe('short')
  })

  it('produces at least one character per page even for huge fonts', () => {
    const text = 'abcde'
    const { pageCount, pages } = paginate(text, () => 9999, 10)
    expect(pageCount).toBe(5)
    expect(pages[0]).toBe('a')
  })
})
