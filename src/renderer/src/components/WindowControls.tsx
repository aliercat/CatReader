import { useEffect, useState } from 'react'
import type { JSX } from 'react'

function MinimizeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function MaximizeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function RestoreIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 4.5V2h5v5H7" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2.8 2.8l6.4 6.4M9.2 2.8l-6.4 6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export default function WindowControls(): JSX.Element {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    let alive = true
    void window.api.windowControls.isMaximized().then((v) => {
      if (alive) setMaximized(v)
    })
    const off = window.api.windowControls.onMaximizedChange((v) => setMaximized(v))
    return () => {
      alive = false
      off()
    }
  }, [])

  return (
    <div className="window-controls" role="group" aria-label="窗口控制">
      <button
        className="wc-btn"
        onClick={() => void window.api.windowControls.minimize()}
        aria-label="最小化"
        title="最小化"
      >
        <MinimizeIcon />
      </button>
      <button
        className="wc-btn"
        onClick={() => void window.api.windowControls.toggleMaximize()}
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
      >
        {maximized ? <RestoreIcon /> : <MaximizeIcon />}
      </button>
      <button
        className="wc-btn wc-close"
        onClick={() => void window.api.windowControls.close()}
        aria-label="关闭"
        title="关闭"
      >
        <CloseIcon />
      </button>
    </div>
  )
}
