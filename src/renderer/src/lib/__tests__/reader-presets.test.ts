import { describe, expect, it } from 'vitest'
import {
  READER_DEFAULTS,
  READER_FONTS,
  READER_THEMES,
  clampNumber,
  getReaderZone,
  resolveFont,
  resolveTheme
} from '../reader-presets'

describe('reader-presets', () => {
  it('defaults are within limits', () => {
    expect(READER_DEFAULTS.fontSize).toBeGreaterThanOrEqual(14)
    expect(READER_DEFAULTS.fontSize).toBeLessThanOrEqual(30)
    expect(READER_DEFAULTS.lineHeight).toBeGreaterThanOrEqual(1.5)
    expect(READER_DEFAULTS.lineHeight).toBeLessThanOrEqual(2.4)
    expect(READER_DEFAULTS.pageWidth).toBeGreaterThanOrEqual(560)
    expect(READER_DEFAULTS.pageWidth).toBeLessThanOrEqual(960)
    expect(READER_DEFAULTS.columns).toBeGreaterThanOrEqual(1)
    expect(READER_DEFAULTS.columns).toBeLessThanOrEqual(3)
  })

  it('resolveTheme falls back to the first theme for unknown ids', () => {
    expect(resolveTheme('night')).toEqual(READER_THEMES[3])
    expect(resolveTheme('missing')).toEqual(READER_THEMES[0])
    expect(resolveTheme(undefined)).toEqual(READER_THEMES[0])
  })

  it('resolveFont falls back to system font for unknown ids', () => {
    expect(resolveFont('song')).toEqual(READER_FONTS[1])
    expect(resolveFont('missing')).toEqual(READER_FONTS[0])
    expect(resolveFont(undefined)).toEqual(READER_FONTS[0])
  })

  it('clampNumber clamps to the inclusive range', () => {
    expect(clampNumber(14, 30, 10)).toBe(14)
    expect(clampNumber(14, 30, 22)).toBe(22)
    expect(clampNumber(14, 30, 99)).toBe(30)
  })

  it('getReaderZone splits the reading area into thirds', () => {
    expect(getReaderZone(0, 900)).toBe('left')
    expect(getReaderZone(299, 900)).toBe('left')
    expect(getReaderZone(300, 900)).toBe('middle')
    expect(getReaderZone(599, 900)).toBe('middle')
    expect(getReaderZone(600, 900)).toBe('right')
    expect(getReaderZone(900, 900)).toBe('right')
    expect(getReaderZone(100, 0)).toBe('middle')
  })
})
