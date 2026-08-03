export type UiThemeMode = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'catreader-ui-theme'

export function normalizeUiTheme(value: string | null): UiThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function loadUiTheme(): UiThemeMode {
  return normalizeUiTheme(localStorage.getItem(STORAGE_KEY))
}

export function saveUiTheme(mode: UiThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode)
  applyUiTheme(mode)
}

/** data-theme 缺省时由 CSS 的 prefers-color-scheme 媒体查询决定（跟随系统） */
export function applyUiTheme(mode: UiThemeMode): void {
  const root = document.documentElement
  if (mode === 'dark') root.dataset.theme = 'dark'
  else if (mode === 'light') root.dataset.theme = 'light'
  else delete root.dataset.theme
}
