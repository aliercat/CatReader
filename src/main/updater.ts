import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '../shared/types'

let state: UpdateState = { phase: 'idle' }
let initialized = false
let autoCheckStarted = false

function setState(patch: Partial<UpdateState>): void {
  state = { ...state, ...patch }
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send('update:state', state)
  }
}

export function getUpdateState(): UpdateState {
  return { ...state }
}

export function hasAutoCheckStarted(): boolean {
  return autoCheckStarted
}

export function markAutoCheckStarted(): void {
  autoCheckStarted = true
}

/** 初始化更新器；仅在打包版且未禁用更新时调用 */
export function initUpdater(enabled: boolean, autoCheck: boolean): void {
  if (!enabled || initialized) return
  initialized = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('checking-for-update', () => setState({ phase: 'checking' }))
  autoUpdater.on('update-available', (info) => setState({ phase: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => setState({ phase: 'latest' }))
  autoUpdater.on('download-progress', (p) =>
    setState({
      phase: 'downloading',
      version: state.version,
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    })
  )
  autoUpdater.on('update-downloaded', (info) =>
    setState({ phase: 'downloaded', version: info.version, percent: 100 })
  )
  autoUpdater.on('error', (err) => setState({ phase: 'error', message: err?.message ?? String(err) }))
  if (autoCheck) {
    autoCheckStarted = true
    void checkForUpdates()
  }
}

/** 手动检查：未启用更新（dev/被禁用）时返回 dev 状态 */
export async function checkForUpdates(): Promise<UpdateState> {
  if (!initialized) {
    setState({ phase: 'dev' })
    return getUpdateState()
  }
  setState({ phase: 'checking' })
  try {
    await autoUpdater.checkForUpdates()
    return getUpdateState()
  } catch (err) {
    setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
    return getUpdateState()
  }
}

/** 测试专用：注入模拟更新状态（仅 e2e 使用） */
export function setTestUpdateState(patch: Partial<UpdateState>): void {
  setState(patch)
}
