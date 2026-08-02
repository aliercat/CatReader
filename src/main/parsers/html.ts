/**
 * Minimal HTML -> plain text extraction used for EPUB chapter content.
 * Good enough for MVP: keeps paragraph/heading structure, drops images/styles.
 */
export function htmlToText(html: string): string {
  let s = html
  s = s.replace(/<!DOCTYPE[^>]*>/gi, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '')
  // Block-level tags become newlines
  s = s.replace(
    /<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article|blockquote|header|footer|table|ul|ol)>/gi,
    '\n'
  )
  s = s.replace(/<(br|hr)\s*\/?>/gi, '\n')
  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, '')
  // Decode common entities
  s = decodeEntities(s)
  // Collapse whitespace
  s = s.replace(/[ \t]+\n/g, '\n')
  s = s.replace(/\n{3,}/g, '\n\n')
  s = s.replace(/[ \t]{2,}/g, ' ')
  return s.trim()
}

function decodeEntities(s: string): string {
  const named: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    ldquo: '\u201C',
    rdquo: '\u201D',
    lsquo: '\u2018',
    rsquo: '\u2019',
    mdash: '\u2014',
    ndash: '\u2013',
    hellip: '\u2026',
    copy: '\u00A9',
    reg: '\u00AE',
    middot: '\u00B7'
  }
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return named[body.toLowerCase()] ?? m
  })
}
