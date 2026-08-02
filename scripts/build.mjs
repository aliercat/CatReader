import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'out')
const tscBin = require.resolve('typescript/bin/tsc')

// 1) Main + preload: compile TypeScript to CommonJS (out/main, out/preload)
console.log('[build] tsc main+preload -> out/')
execFileSync(process.execPath, [tscBin, '-p', resolve(root, 'tsconfig.build.json')], {
  cwd: root,
  stdio: 'inherit'
})

// 2) Renderer: Vite production build (out/renderer)
console.log('[build] vite renderer -> out/renderer')
await build({
  configFile: false,
  root: resolve(root, 'src/renderer'),
  base: './',
  plugins: [react()],
  build: {
    outDir: resolve(outDir, 'renderer'),
    emptyOutDir: true
  }
})

if (!existsSync(outDir)) {
  throw new Error('build output missing')
}
console.log('[build] done:', outDir)
