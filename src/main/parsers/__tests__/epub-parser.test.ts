import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { parseEpub } from '../epub-parser'

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAf4Xm1sAAAAASUVORK5CYII=',
  'base64'
)

async function buildEpub(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  )
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>测试之书</dc:title>
    <dc:creator>作者甲</dc:creator>
    <meta name="cover" content="cover-img"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-img" href="cover.jpg" media-type="image/jpeg"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`
  )
  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <navMap>
    <navPoint id="n1" playOrder="1">
      <navLabel><text>第一章 相遇</text></navLabel>
      <content src="ch1.xhtml"/>
    </navPoint>
    <navPoint id="n2" playOrder="2">
      <navLabel><text>第二章 离别</text></navLabel>
      <content src="ch2.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`
  )
  zip.file(
    'OEBPS/ch1.xhtml',
    `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第一章</title></head>
<body>
  <h1>第一章 相遇</h1>
  <p>他们在雨&nbsp;中相遇。</p>
  <p>故事从这里开始。</p>
</body></html>`
  )
  zip.file(
    'OEBPS/ch2.xhtml',
    `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第二章</title></head>
<body>
  <p>离别在即。</p>
  <p>第二段内容。</p>
</body></html>`
  )
  zip.file('OEBPS/cover.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))
  return zip.generateAsync({ type: 'nodebuffer' })
}

async function buildEpubWithCoverChapter(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'META-INF/container.xml',
    `<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
  )
  zip.file(
    'OEBPS/content.opf',
    `<package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>封面书</dc:title></metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="ncx"><itemref idref="cover"/><itemref idref="ch1"/></spine></package>`
  )
  zip.file(
    'OEBPS/toc.ncx',
    `<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="n0" playOrder="1"><navLabel><text>封面</text></navLabel><content src="cover.xhtml"/></navPoint><navPoint id="n1" playOrder="2"><navLabel><text>第一章</text></navLabel><content src="ch1.xhtml"/></navPoint></navMap></ncx>`
  )
  zip.file(
    'OEBPS/cover.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><img src="images/cover.jpg" alt="封面"/></body></html>`
  )
  zip.file(
    'OEBPS/ch1.xhtml',
    `<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>第一章</h1><p>正文内容。</p></body></html>`
  )
  zip.file('OEBPS/images/cover.jpg', PNG_BYTES)
  return zip.generateAsync({ type: 'nodebuffer' })
}

describe('parseEpub', () => {
  it('extracts metadata, chapters and cover from a minimal epub', async () => {
    const buf = await buildEpub()
    const book = await parseEpub(buf)
    expect(book.title).toBe('测试之书')
    expect(book.author).toBe('作者甲')
    expect(book.cover).toBeInstanceOf(Buffer)
    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0].title).toBe('第一章 相遇')
    expect(book.chapters[0].content).toContain('他们在雨 中相遇。')
    expect(book.chapters[0].content).toContain('故事从这里开始。')
    expect(book.chapters[1].title).toBe('第二章 离别')
    expect(book.chapters[1].content).toContain('离别在即。')
  })

  it('marks image-only pages as cover chapters and falls back to their image', async () => {
    const book = await parseEpub(await buildEpubWithCoverChapter())
    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0].title).toBe('封面')
    expect(book.chapters[0].isCover).toBe(true)
    expect(book.chapters[0].content).toBe('')
    expect(book.chapters[1].title).toBe('第一章')
    expect(book.chapters[1].isCover).toBeUndefined()
    expect(book.cover).not.toBeNull()
    expect(book.cover!.length).toBe(PNG_BYTES.length)
  })

  it('rejects buffers without container.xml', async () => {
    const zip = new JSZip()
    zip.file('random.txt', 'hello')
    const buf = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(parseEpub(buf)).rejects.toThrow('container.xml')
  })
})
