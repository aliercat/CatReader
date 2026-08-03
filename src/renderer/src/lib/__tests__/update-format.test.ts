import { describe, expect, it } from 'vitest'
import { clampPercent, describeDownload, formatBytes, formatSpeed } from '../update-format'

describe('formatBytes', () => {
  it('formats bytes with units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(56.2 * 1024 * 1024)).toBe('56.2 MB')
    expect(formatBytes(123.4 * 1024 * 1024)).toBe('123.4 MB')
    expect(formatBytes(2.1 * 1024 * 1024)).toBe('2.1 MB')
    expect(formatBytes(undefined)).toBe('0 B')
  })
})

describe('formatSpeed', () => {
  it('appends /s', () => {
    expect(formatSpeed(2.1 * 1024 * 1024)).toBe('2.1 MB/s')
  })
})

describe('clampPercent', () => {
  it('clamps to 0-100', () => {
    expect(clampPercent(45)).toBe(45)
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(120)).toBe(100)
    expect(clampPercent(undefined)).toBe(0)
  })
})

describe('describeDownload', () => {
  it('includes percent, sizes and speed', () => {
    const text = describeDownload({
      phase: 'downloading',
      version: '9.9.9',
      percent: 45,
      transferred: 56.2 * 1024 * 1024,
      total: 123.4 * 1024 * 1024,
      bytesPerSecond: 2.1 * 1024 * 1024
    })
    expect(text).toBe('45%（已下载 56.2 MB / 共 123.4 MB）2.1 MB/s')
  })

  it('omits speed when missing', () => {
    const text = describeDownload({ phase: 'downloading', percent: 100 })
    expect(text).toBe('100%')
  })
})
