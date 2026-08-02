import jschardet from 'jschardet'
import iconv from 'iconv-lite'

export interface DecodeResult {
  text: string
  encoding: string
  confidence: number
  /** Ratio of replacement chars (U+FFFD) in the decoded text, 0..1 */
  garbled: number
}

function normalizeEncoding(enc: string): string {
  const e = enc.toLowerCase().replace(/[_-]/g, '')
  if (e === 'utf8' || e === 'utf8sig' || e === 'ascii' || e === 'usascii') return 'utf-8'
  if (e === 'gb2312' || e === 'gbk' || e === 'cp936') return 'gbk'
  if (e === 'gb18030') return 'gb18030'
  if (e === 'big5' || e === 'big5hkscs') return 'big5'
  if (e === 'utf16' || e === 'utf16le') return 'utf-16le'
  if (e === 'utf16be') return 'utf-16be'
  if (e === 'shiftjis' || e === 'sjis' || e === 'cp932') return 'shift_jis'
  if (e === 'eucjp' || e === 'eucjis') return 'euc-jp'
  return e
}

function detectEncoding(buf: Buffer): { encoding: string; confidence: number } {
  // BOM takes priority
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { encoding: 'utf-8', confidence: 1 }
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { encoding: 'utf-16le', confidence: 1 }
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return { encoding: 'utf-16be', confidence: 1 }
  }

  const sample = buf.subarray(0, Math.min(buf.length, 1_000_000))
  const detected = jschardet.detect(sample)
  if (detected && detected.encoding && detected.confidence > 0.2) {
    return { encoding: normalizeEncoding(detected.encoding), confidence: detected.confidence }
  }
  return { encoding: 'utf-8', confidence: 0 }
}

function decodeWith(encoding: string, buf: Buffer): string | null {
  try {
    let b = buf
    if (encoding === 'utf-8' && buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      b = buf.subarray(3)
    }
    if (encoding === 'utf-16le' && buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
      b = buf.subarray(2)
    }
    if (encoding === 'utf-16be' && buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      b = buf.subarray(2)
    }
    const text = encoding === 'utf-8' ? b.toString('utf-8') : iconv.decode(b, encoding)
    // A UTF-8 decode that produces replacement chars is likely a wrong guess.
    if (encoding === 'utf-8' && text.includes('\uFFFD')) return null
    return text
  } catch {
    return null
  }
}

/**
 * Decode a text-file buffer. Order: BOM -> jschardet guess -> utf-8 -> gb18030.
 */
export function decodeText(buf: Buffer): DecodeResult {
  const { encoding, confidence } = detectEncoding(buf)
  const direct = decodeWith(encoding, buf)
  if (direct !== null) {
    return { text: direct, encoding, confidence, garbled: garbledRatio(direct) }
  }
  for (const fallback of ['utf-8', 'gb18030']) {
    const text = decodeWith(fallback, buf)
    if (text !== null) {
      return { text, encoding: fallback, confidence: 0, garbled: garbledRatio(text) }
    }
  }
  const text = buf.toString('utf-8')
  return { text, encoding: 'utf-8', confidence: 0, garbled: garbledRatio(text) }
}

function garbledRatio(text: string): number {
  if (text.length === 0) return 0
  let count = 0
  for (const ch of text) {
    if (ch === '\uFFFD') count++
  }
  return count / text.length
}
