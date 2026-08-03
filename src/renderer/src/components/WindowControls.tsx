import { useEffect, useState } from 'react'
import type { JSX } from 'react'

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
        ─
      </button>
      <button
        className="wc-btn"
        onClick={() => void window.api.windowControls.toggleMaximize()}
        aria-label={maximized ? '还原' : '最大化'}
        title={maximized ? '还原' : '最大化'}
      >
        {maximized ? '❐' : '□'}
      </button>
      <button
        className="wc-btn wc-close"
        onClick={() => void window.api.windowControls.close()}
        aria-label="关闭"
        title="关闭"
      >
        ✕
      </button>
    </div>
  )
}
