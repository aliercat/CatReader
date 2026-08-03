import { app, shell, BrowserWindow, protocol } from 'electron'
import { readFile } from 'fs/promises'
import { extname, join, resolve } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BookStore } from './stores/book-store'
import { ProgressStore } from './stores/progress-store'
import { TextCache } from './services/text-cache'
import { ImportService } from './import-service'
import { registerIpc } from './ipc'

const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
}

// 自定义协议必须在 app ready 之前声明为 privileged，才能在 dev（http 页面）
// 与打包版（file 页面）中统一加载本地文件；否则 dev 模式下的 http 页面
// 会被 Chromium 拦截 file:// 图片导致封面裂图。
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'catreader',
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
  }
])

// 端到端测试隔离：把 userData（localStorage 等）也重定向到测试目录，避免污染真实数据
if (process.env.CATREADER_E2E_USERDATA) {
  app.setPath('userData', process.env.CATREADER_E2E_USERDATA)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.catreader.app')

  // Allow tests / portable runs to redirect the library to a custom directory
  const libraryRoot = process.env.CATREADER_LIBRARY_DIR ?? join(app.getPath('userData'), 'library')

  // catreader://local/<绝对路径> 仅允许读取库目录内的文件
  const libraryRootResolved = resolve(libraryRoot)
  protocol.handle('catreader', async (request) => {
    try {
      const url = new URL(request.url)
      const requested = resolve(decodeURIComponent(url.pathname).replace(/^[/\\]+/, ''))
      if (requested !== libraryRootResolved && !requested.startsWith(libraryRootResolved + '\\')) {
        return new Response('Forbidden', { status: 403 })
      }
      const data = await readFile(requested)
      return new Response(data, {
        headers: { 'Content-Type': IMAGE_MIME[extname(requested).toLowerCase()] ?? 'application/octet-stream' }
      })
    } catch {
      return new Response('Not Found', { status: 404 })
    }
  })

  const bookStore = new BookStore(libraryRoot)
  const progressStore = new ProgressStore(join(libraryRoot, 'progress.json'))
  const importService = new ImportService(bookStore, progressStore, new TextCache())
  registerIpc({ bookStore, progressStore, importService })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
