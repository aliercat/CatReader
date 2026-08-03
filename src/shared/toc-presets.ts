export interface TocPreset {
  id: string
  label: string
  patterns: RegExp[]
}

export const TOC_PRESETS: TocPreset[] = [
  {
    id: 'cn-numbered',
    label: '中文数字章节（第一章 / 第1章 / 第十二回 / 第2卷）',
    patterns: [/^第\s*[0-9０-９一二三四五六七八九十百千万零两]+\s*[章回节卷部集篇]/u]
  },
  {
    id: 'cn-special',
    label: '常见卷标（楔子 / 序章 / 番外 / 尾声 / 后记）',
    patterns: [
      /^(?:楔子|序章|序言|前言|引子|引言|尾声|终章|后记|番外|外传|完结感言|作品相关)(?:[\s0-9０-９一二三四五六七八九十百千万两、。．:：)）】]|$)/u
    ]
  },
  {
    id: 'english',
    label: '英文章节（Chapter 1 / Chapter XII）',
    patterns: [/^chapter\s+[0-9]+/iu, /^chapter\s+[ivxlcdm]+/iu]
  },
  {
    id: 'numbered',
    label: '纯数字序号（1、xxx / 1. xxx）',
    patterns: [/^[0-9０-９]{1,4}\s*[、.．:：]\s*\S/u]
  }
]

export const DEFAULT_PRESET_IDS = ['cn-numbered', 'cn-special', 'english']
