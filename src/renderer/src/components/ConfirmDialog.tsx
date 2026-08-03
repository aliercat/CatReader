import type { JSX } from 'react'

export default function ConfirmDialog({
  open,
  message,
  confirmLabel = '删除',
  cancelLabel = '取消',
  onConfirm,
  onCancel
}: {
  open: boolean
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element | null {
  if (!open) return null
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label="确认操作"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn danger-solid" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
