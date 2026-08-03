import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Api,
  AppSettings,
  ChapterMeta,
  ImportResult,
  Progress,
  TocUpdateOptions,
  UpdateState
} from '../shared/types'

// Custom APIs for renderer
const api: Api = {
  openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  importBooks: (paths: string[]): Promise<ImportResult[]> => ipcRenderer.invoke('books:import', paths),
  getBooks: () => ipcRenderer.invoke('books:list'),
  openBook: (id: string) => ipcRenderer.invoke('books:open', id),
  getChapter: (bookId: string, chapterIndex: number): Promise<string> =>
    ipcRenderer.invoke('books:getChapter', bookId, chapterIndex),
  saveProgress: (bookId: string, progress: Omit<Progress, 'updatedAt'>): Promise<void> =>
    ipcRenderer.invoke('books:saveProgress', bookId, progress),
  updateToc: (bookId: string, options: TocUpdateOptions): Promise<ChapterMeta[]> =>
    ipcRenderer.invoke('books:updateToc', bookId, options),
  deleteBook: (id: string): Promise<void> => ipcRenderer.invoke('books:delete', id),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('app:quitAndInstall'),
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke('settings:set', patch),
  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke('update:check'),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke('update:getState'),
  onUpdateState: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, state: UpdateState): void => callback(state)
    ipcRenderer.on('update:state', handler)
    return () => {
      ipcRenderer.removeListener('update:state', handler)
    }
  },
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  openLibrary: (): Promise<void> => ipcRenderer.invoke('app:openLibrary'),
  windowControls: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: (): Promise<void> => ipcRenderer.invoke('window:toggleMaximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback) => {
      const handler = (_event: Electron.IpcRendererEvent, maximized: boolean): void => callback(maximized)
      ipcRenderer.on('window:maximized-changed', handler)
      return () => {
        ipcRenderer.removeListener('window:maximized-changed', handler)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
