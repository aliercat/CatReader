import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import {
  READER_FONTS,
  READER_LIMITS,
  READER_THEMES,
  type ReaderSettings
} from '../lib/reader-presets'
import type { UiThemeMode } from '../lib/ui-theme'

interface SettingsPanelProps {
  open: boolean
  settings: ReaderSettings
  onChange: (patch: Partial<ReaderSettings>) => void
  onReset: () => void
  onClose: () => void
  uiTheme: UiThemeMode
  onUiThemeChange: (mode: UiThemeMode) => void
}

function SliderRow({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange
}: {
  label: string
  display: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div className="settings-row">
      <div className="settings-row-head">
        <span className="settings-row-label">{label}</span>
        <span className="settings-row-value">{display}</span>
      </div>
      <input
        className="settings-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export default function SettingsPanel({
  open,
  settings,
  onChange,
  onReset,
  onClose,
  uiTheme,
  onUiThemeChange
}: SettingsPanelProps): JSX.Element {
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  return (
    <div className={`settings-overlay${open ? ' open' : ''}`} onClick={onClose}>
      <section
        ref={panelRef}
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="阅读设置"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h3>阅读设置</h3>
          <button className="btn ghost settings-close" onClick={onClose} aria-label="关闭设置">
            ✕
          </button>
        </header>

        <div className="settings-body">
          <div className="settings-group">
            <div className="settings-group-label">外观</div>
            <div className="font-row" role="group" aria-label="外观">
              {(
                [
                  ['system', '跟随系统'],
                  ['light', '亮色'],
                  ['dark', '深色']
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  className={`font-chip${uiTheme === mode ? ' active' : ''}`}
                  aria-pressed={uiTheme === mode}
                  onClick={() => onUiThemeChange(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-label">主题</div>
            <div className="theme-grid">
              {READER_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-option${settings.themeId === t.id ? ' selected' : ''}`}
                  data-theme={t.id}
                  onClick={() => onChange({ themeId: t.id })}
                >
                  <span className="theme-swatch" style={{ background: t.bg, color: t.text }}>
                    <i />
                    <i />
                    <i />
                    <i className="short" />
                    <span className="theme-check">✓</span>
                  </span>
                  <span className="theme-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-label">分栏</div>
            <div className="segmented" role="group" aria-label="分栏">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={settings.columns === n ? 'active' : ''}
                  aria-pressed={settings.columns === n}
                  onClick={() => onChange({ columns: n })}
                >
                  {n} 栏
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-label">字体</div>
            <div className="font-row" role="group" aria-label="字体">
              {READER_FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`font-chip${settings.fontFamily === f.id ? ' active' : ''}`}
                  style={{ fontFamily: f.stack }}
                  aria-pressed={settings.fontFamily === f.id}
                  onClick={() => onChange({ fontFamily: f.id })}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <div className="settings-group-label">排版</div>
            <div className="slider-list">
              <SliderRow
                label="字号"
                display={`${settings.fontSize} px`}
                min={READER_LIMITS.fontSize.min}
                max={READER_LIMITS.fontSize.max}
                step={1}
                value={settings.fontSize}
                onChange={(v) => onChange({ fontSize: v })}
              />
              <SliderRow
                label="行距"
                display={settings.lineHeight.toFixed(1)}
                min={READER_LIMITS.lineHeight.min}
                max={READER_LIMITS.lineHeight.max}
                step={0.1}
                value={settings.lineHeight}
                onChange={(v) => onChange({ lineHeight: v })}
              />
              <SliderRow
                label="页宽"
                display={`${settings.pageWidth} px`}
                min={READER_LIMITS.pageWidth.min}
                max={READER_LIMITS.pageWidth.max}
                step={40}
                value={settings.pageWidth}
                onChange={(v) => onChange({ pageWidth: v })}
              />
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn ghost" onClick={onReset}>
              恢复默认
            </button>
            <button className="btn primary" onClick={onClose}>
              完成
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
