import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { AppInfo } from '../../../shared/types'

export default function AboutDialog({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}): JSX.Element | null {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    void window.api.getAppInfo().then((i) => {
      if (alive) setInfo(i)
    })
    return () => {
      alive = false
    }
  }, [open])

  if (!open) return null

  return (
    <div className="about-overlay" onClick={onClose}>
      <div
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="关于"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>CatReader</h3>
        <p className="about-version">版本 {info?.version ? `v${info.version}` : '…'}</p>
        <p className="about-desc">
          本地小说阅读器：支持 txt / epub 导入、目录解析、书架管理与多栏分页阅读。
        </p>
        <a
          className="btn ghost about-link"
          href={info?.homepage ?? 'https://github.com/aliercat/CatReader'}
          target="_blank"
          rel="noreferrer"
        >
          访问 GitHub 仓库
        </a>
        <div className="about-actions">
          <button className="btn ghost" onClick={() => void window.api.openLibrary()}>
            打开数据目录
          </button>
          <button className="btn primary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
