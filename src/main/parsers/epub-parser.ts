import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'
import { htmlToText } from './html'

export interface EpubChapter {
  title: string
  content: string
}

export interface EpubBook {
  title: string
  author?: string
  cover?: Buffer | null
  chapters: EpubChapter[]
}

interface XmlNode {
  [key: string]: unknown
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  trimValues: true,
  isArray: (name: string) =>
    ['rootfile', 'item', 'itemref', 'meta', 'navPoint', 'li'].includes(name)
})

function parseXml(xml: string): XmlNode {
  return parser.parse(xml) as XmlNode
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function textOf(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return node.trim()
  if (typeof node === 'object') {
    const obj = node as XmlNode
    const t = obj['#text']
    if (typeof t === 'string') return t.trim()
    // nested (e.g. <title><span>..</span></title>)
    return Object.values(obj)
      .map((v) => textOf(v))
      .join(' ')
      .trim()
  }
  return String(node).trim()
}

function baseHref(href: string): string {
  return href.split('#')[0].split('/').pop() ?? ''
}

export async function parseEpub(buf: Buffer): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(buf)
  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) {
    throw new Error('不是有效的 EPUB 文件：缺少 META-INF/container.xml')
  }
  const containerXml = await containerFile.async('string')
  const container = parseXml(containerXml)
  const containerNode = container.container as XmlNode | undefined
  const rootfiles = containerNode?.rootfiles as XmlNode | undefined
  const rootfile = asArray(rootfiles?.rootfile)[0] as XmlNode | undefined
  const opfPath = String(rootfile?.['@_full-path'] ?? rootfile?.['@_fullpath'] ?? '')
  if (!opfPath) {
    throw new Error('不是有效的 EPUB 文件：无法定位 OPF 文件')
  }

  const opfFile = zip.file(opfPath)
  if (!opfFile) throw new Error(`EPUB 缺少 OPF 文件：${opfPath}`)
  const opfXml = await opfFile.async('string')
  const opf = parseXml(opfXml)
  const pkg = opf.package as XmlNode | undefined
  const meta = pkg?.metadata as XmlNode | undefined
  const title = textOf(meta?.title) || '未命名'
  const author = textOf(meta?.creator) || undefined

  const manifest = new Map<string, XmlNode>()
  const pkgManifest = pkg?.manifest as XmlNode | undefined
  for (const item of asArray(pkgManifest?.item)) {
    const obj = item as XmlNode
    const id = String(obj['@_id'] ?? '')
    if (id) manifest.set(id, obj)
  }

  const spineNode = pkg?.spine as XmlNode | undefined
  const spineIds = asArray(spineNode?.itemref)
    .map((r) => String((r as XmlNode)['@_idref'] ?? ''))
    .filter(Boolean)

  // NCX toc
  let tocMap = new Map<string, string>()
  const ncxItem = [...manifest.values()].find(
    (item) => String(item['@_media-type'] ?? '') === 'application/x-dtbncx+xml'
  )
  if (ncxItem) {
    const ncxFile = zip.file(resolvePath(opfPath, String(ncxItem['@_href'] ?? '')))
    if (ncxFile) {
      const ncxXml = await ncxFile.async('string')
      tocMap = parseNcx(ncxXml)
    }
  }

  // EPUB3 nav.xhtml fallback
  const navItem = [...manifest.values()].find(
    (item) =>
      String(item['@_properties'] ?? '').split(/\s+/).includes('nav') ||
      String(item['@_href'] ?? '').toLowerCase().endsWith('nav.xhtml')
  )
  if (tocMap.size === 0 && navItem) {
    const navFile = zip.file(resolvePath(opfPath, String(navItem['@_href'] ?? '')))
    if (navFile) {
      const navXml = await navFile.async('string')
      tocMap = parseNav(navXml)
    }
  }

  const chapterPlan: { idref: string; item: XmlNode; title: string }[] = []
  spineIds.forEach((idref, i) => {
    const item = manifest.get(idref)
    if (!item) return
    const href = String(item['@_href'] ?? '')
    const base = baseHref(href)
    const rawTitle = tocMap.get(base)
    const title = rawTitle || `第${i + 1}章`
    chapterPlan.push({ idref, item, title })
  })

  const chapters: EpubChapter[] = await Promise.all(
    chapterPlan.map(async ({ item, title }, i) => {
      const file = zip.file(resolvePath(opfPath, String(item['@_href'] ?? '')))
      if (!file) return { title, content: '' }
      let finalTitle = title
      const content = htmlToText(await file.async('string'))
      if (finalTitle === `第${i + 1}章`) {
        const heading = await detectHeading(file)
        if (heading) finalTitle = heading
      }
      return { title: finalTitle, content }
    })
  )

  let cover: Buffer | null = null
  const coverMeta = asArray(meta?.meta).find(
    (m) => String((m as XmlNode)['@_name'] ?? '').toLowerCase() === 'cover'
  ) as XmlNode | undefined
  const coverId = coverMeta?.['@_content']
  const coverItem =
    (coverId ? manifest.get(String(coverId)) : undefined) ??
    [...manifest.values()].find(
      (item) => String(item['@_properties'] ?? '').split(/\s+/).includes('cover-image')
    )
  if (coverItem) {
    const coverFile = zip.file(resolvePath(opfPath, String(coverItem['@_href'] ?? '')))
    if (coverFile) {
      cover = await coverFile.async('nodebuffer')
    }
  }

  return { title, author, cover, chapters: chapters.filter((c) => c.content.length > 0 || c.title) }
}

function resolvePath(opfPath: string, href: string): string {
  const dir = opfPath.split('/').slice(0, -1).join('/')
  const combined = dir ? `${dir}/${href}` : href
  const parts: string[] = []
  for (const part of combined.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

function parseNcx(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  const parsed = parseXml(xml)
  const ncx = (parsed.ncx ?? parsed) as XmlNode
  const navPoints = asArray((ncx.navMap as XmlNode | undefined)?.navPoint)
  const walk = (points: unknown[]): void => {
    for (const raw of points) {
      const p = raw as XmlNode
      const src = String((p.content as XmlNode | undefined)?.['@_src'] ?? '')
      const label = textOf((p.navLabel as XmlNode | undefined)?.text)
      if (src && label) map.set(baseHref(src), label)
      const nested = asArray((p.navPoint as XmlNode | undefined)?.navPoint)
      if (nested.length) walk(nested)
    }
  }
  walk(navPoints)
  return map
}

function parseNav(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  const nav = parseXml(xml)
  const links: { href: string; label: string }[] = []
  const walk = (nodes: unknown[]): void => {
    for (const raw of nodes) {
      const node = raw as XmlNode
      const a = node.a as XmlNode | undefined
      if (a) {
        const href = String(a['@_href'] ?? '')
        const label = textOf(a['#text'])
        if (href && label) links.push({ href, label })
      }
      const nested = asArray(node.li as XmlNode | undefined)
      if (nested.length) walk(nested)
    }
  }
  const htmlNode = nav.html as XmlNode | undefined
  const bodyNode = (htmlNode?.body ?? nav.body) as XmlNode | undefined
  walk(asArray(bodyNode?.nav ?? nav.nav))
  for (const l of links) map.set(baseHref(l.href), l.label)
  return map
}

async function detectHeading(file: JSZip.JSZipObject): Promise<string | undefined> {
  const s = await file.async('string')
  const m = s.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
  if (!m) return undefined
  const text = htmlToText(m[1])
  return text.length > 0 && text.length <= 80 ? text : undefined
}
