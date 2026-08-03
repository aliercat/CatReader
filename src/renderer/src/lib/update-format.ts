import type { UpdateState } from '../../../shared/types'

export function formatBytes(bytes: number | undefined): string {
  const n = typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0 ? bytes : 0
  if (n < 1024) return `${Math.round(n)} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n
  let i = -1
  do {
    v /= 1024
    i += 1
  } while (v >= 1024 && i < units.length - 1)
  return `${v < 1000 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

export function formatSpeed(bytesPerSecond: number | undefined): string {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function clampPercent(percent: number | undefined): number {
  const p = typeof percent === 'number' && Number.isFinite(percent) ? percent : 0
  return Math.min(100, Math.max(0, p))
}

/** 下载状态描述："45%（已下载 56.2 MB / 共 123.4 MB）2.1 MB/s" */
export function describeDownload(state: UpdateState): string {
  const parts = [`${Math.round(clampPercent(state.percent))}%`]
  if (typeof state.transferred === 'number' && typeof state.total === 'number') {
    parts.push(`（已下载 ${formatBytes(state.transferred)} / 共 ${formatBytes(state.total)}）`)
  }
  if (typeof state.bytesPerSecond === 'number' && state.bytesPerSecond > 0) {
    parts.push(formatSpeed(state.bytesPerSecond))
  }
  return parts.join('')
}
