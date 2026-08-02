import { describe, expect, it } from 'vitest'
import iconv from 'iconv-lite'
import { decodeText } from '../encoding'

describe('decodeText', () => {
  it('decodes UTF-8 with BOM and strips the BOM', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('第一章 测试', 'utf-8')])
    const r = decodeText(buf)
    expect(r.encoding).toBe('utf-8')
    expect(r.text.startsWith('第一章 测试')).toBe(true)
    expect(r.garbled).toBe(0)
  })

  it('decodes plain UTF-8 without BOM', () => {
    const buf = Buffer.from('这是 UTF-8 内容\n第二行', 'utf-8')
    const r = decodeText(buf)
    expect(r.text).toContain('这是 UTF-8 内容')
    expect(r.garbled).toBe(0)
  })

  it('decodes GBK-encoded Chinese text', () => {
    const buf = iconv.encode('第一章 武侠小说\n内容正文', 'gbk')
    const r = decodeText(buf)
    expect(r.text).toContain('第一章')
    expect(r.text).toContain('内容正文')
    expect(r.garbled).toBeLessThan(0.05)
  })

  it('decodes UTF-16LE with BOM', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), iconv.encode('第十六章', 'utf-16le')])
    const r = decodeText(buf)
    expect(r.text).toContain('第十六章')
  })

  it('falls back to gb18030 when UTF-8 produces replacement chars', () => {
    // Bytes that are invalid UTF-8 but valid GB18030
    const buf = Buffer.from([0xc4, 0xe3, 0xba, 0xc3, 0xca, 0xc0, 0xbd, 0xe7]) // 你好世界 in GBK
    const r = decodeText(buf)
    expect(r.text).toBe('你好世界')
  })
})
