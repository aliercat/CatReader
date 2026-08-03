import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { UpdateMode, UpdateState } from '../../../shared/types'
import type { UiThemeMode } from '../lib/ui-theme'
import { describeDownload } from '../lib/update-format'

interface AppMenuProps {
  uiTheme: UiThemeMode
  onUiThemeChange: (mode: UiThemeMode) => void
  updateMode: UpdateMode
  onUpdateModeChange: (mode: UpdateMode) => void
  updateState: UpdateState
  onCheckUpdate: () => void
  onAbout: () => void
}

export default function AppMenu({
  uiTheme,
  onUiThemeChange,
  updateMode,
  onUpdateModeChange,
  updateState,
  onCheckUpdate,
  onAbout
}: AppMenuProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const updateLine = (): JSX.Element => {
    switch (updateState.phase) {
      case 'checking':
        return <span>正在检查更新…</span>
      case 'available':
        return <span>发现新版 v{updateState.version}</span>
      case 'downloading':
        return <span>下载中 {describeDownload(updateState)}</span>
      case 'downloaded':
        return <span>新版 v{updateState.version} 已就绪</span>
      case 'latest':
        return <span>已是最新版本</span>
      case 'error':
        return <span>检查失败：{updateState.message ?? '未知错误'}</span>
      case 'dev':
        return <span>开发版本无需更新</span>
      default:
        return <span>尚未检查更新</span>
    }
  }

  return (
    <div className="app-menu" ref={rootRef}>
      <button
        className="btn ghost btn-menu"
        aria-label="设置"
        aria-haspopup="menu"
        aria-expanded={open}
        title="设置"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open && (
        <div className="menu-popover" role="menu" aria-label="应用设置">
          <div className="menu-section">
            <div className="menu-section-title">外观</div>
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

          <div className="menu-section">
            <div className="menu-section-title">更新</div>
            <div className="segmented" role="group" aria-label="更新策略">
              {(
                [
                  ['auto', '自动更新'],
                  ['manual', '手动更新']
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  className={updateMode === mode ? 'active' : ''}
                  aria-pressed={updateMode === mode}
                  onClick={() => onUpdateModeChange(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="menu-update-status">
              <span className="menu-update-line">{updateLine()}</span>
              <button className="btn small" onClick={onCheckUpdate}>
                检查更新
              </button>
            </div>
          </div>

          <div className="menu-footer">
            <button className="btn ghost menu-about" onClick={onAbout}>
              关于…
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
