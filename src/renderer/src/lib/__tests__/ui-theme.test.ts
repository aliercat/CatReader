import { describe, expect, it } from 'vitest'
import { normalizeUiTheme, type UiThemeMode } from '../ui-theme'

describe('normalizeUiTheme', () => {
  it('accepts valid modes and falls back to system', () => {
    expect(normalizeUiTheme(null)).toBe('system')
    expect(normalizeUiTheme('dark')).toBe('dark')
    expect(normalizeUiTheme('light')).toBe('light')
    expect(normalizeUiTheme('bogus')).toBe('system')
  })

  it('type-guards the result', () => {
    const mode: UiThemeMode = normalizeUiTheme('dark')
    expect(['system', 'light', 'dark']).toContain(mode)
  })
})
