import type { JSX } from 'react'
import type { UpdateState } from '../../../shared/types'
import { clampPercent, describeDownload } from '../lib/update-format'

export default function UpdateBar({
  state,
  onRestart,
  onRetry
}: {
  state: UpdateState
  onRestart: () => void
  onRetry: () => void
}): JSX.Element | null {
  switch (state.phase) {
    case 'checking':
      return <div className="update-bar">正在检查更新…</div>
    case 'available':
      return <div className="update-bar">发现新版本 v{state.version}，正在准备下载…</div>
    case 'downloading': {
      const pct = Math.round(clampPercent(state.percent))
      return (
        <div className="update-bar downloading">
          <span>
            正在下载 v{state.version} {describeDownload(state)}
          </span>
          <div
            className="update-progress"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      )
    }
    case 'downloaded':
      return (
        <div className="update-bar ready">
          <span>新版本 v{state.version} 已就绪，重启后生效</span>
          <button className="btn small" onClick={onRestart}>
            立即重启
          </button>
        </div>
      )
    case 'error':
      return (
        <div className="update-bar error">
          <span>更新失败：{state.message ?? '未知错误'}</span>
          <button className="btn small" onClick={onRetry}>
            重试
          </button>
        </div>
      )
    default:
      return null
  }
}
