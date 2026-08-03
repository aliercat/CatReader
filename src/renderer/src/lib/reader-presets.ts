/** 阅读区主题（只作用于阅读区，不改变应用界面外观） */
export interface ReaderTheme {
  id: string
  name: string
  bg: string
  text: string
}

export const READER_THEMES: ReaderTheme[] = [
  { id: 'paper', name: '默认', bg: '#ffffff', text: '#2b2f36' },
  { id: 'green', name: '护眼绿', bg: '#cfe8cf', text: '#2e4d36' },
  { id: 'sepia', name: '羊皮纸', bg: '#f3ead3', text: '#5a4632' },
  { id: 'night', name: '夜间', bg: '#1e232b', text: '#b8c0cc' }
]

export interface ReaderFontOption {
  id: string
  name: string
  stack: string
}

export const READER_FONTS: ReaderFontOption[] = [
  {
    id: 'system',
    name: '系统默认',
    stack: "'Microsoft YaHei', 'PingFang SC', 'Segoe UI', system-ui, sans-serif"
  },
  { id: 'song', name: '宋体', stack: "'SimSun', 'Songti SC', 'Noto Serif CJK SC', serif" },
  {
    id: 'kaiti',
    name: '楷体',
    stack: "'KaiTi', 'Kaiti SC', 'STKaiti', 'Noto Serif CJK SC', serif"
  },
  { id: 'hei', name: '黑体', stack: "'SimHei', 'Heiti SC', 'Noto Sans CJK SC', sans-serif" }
]

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  pageWidth: number
  columns: number
  themeId: string
  fontFamily: string
}

export const READER_DEFAULTS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.8,
  pageWidth: 720,
  columns: 1,
  themeId: 'paper',
  fontFamily: 'system'
}

export const READER_LIMITS = {
  fontSize: { min: 14, max: 30 },
  lineHeight: { min: 1.5, max: 2.4 },
  pageWidth: { min: 560, max: 960 }
} as const

export function clampNumber(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resolveTheme(id: string | undefined): ReaderTheme {
  return READER_THEMES.find((t) => t.id === id) ?? READER_THEMES[0]
}

export function resolveFont(id: string | undefined): ReaderFontOption {
  return READER_FONTS.find((f) => f.id === id) ?? READER_FONTS[0]
}

export type ReaderZone = 'left' | 'middle' | 'right'

/** 把点击坐标映射到阅读区的左/中/右三等分区域 */
export function getReaderZone(relativeX: number, width: number): ReaderZone {
  if (width <= 0) return 'middle'
  const ratio = relativeX / width
  if (ratio < 1 / 3) return 'left'
  if (ratio >= 2 / 3) return 'right'
  return 'middle'
}
