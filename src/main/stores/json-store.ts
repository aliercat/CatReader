import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { dirname } from 'path'

/** 写入前把当前文件轮转为备份，保留最近两份：file.bak、file.bak.1 */
function rotateBackup(file: string): void {
  try {
    if (!existsSync(file)) return
    const bak1 = `${file}.bak`
    const bak2 = `${file}.bak.1`
    if (existsSync(bak2)) rmSync(bak2, { force: true })
    if (existsSync(bak1)) renameSync(bak1, bak2)
    copyFileSync(file, bak1)
  } catch {
    // 备份失败不影响主文件写入
  }
}

/** 主文件损坏时按最近顺序回退到备份，全部失败才返回 fallback */
export function readJson<T>(file: string, fallback: T): T {
  for (const candidate of [file, `${file}.bak`, `${file}.bak.1`]) {
    try {
      return JSON.parse(readFileSync(candidate, 'utf-8')) as T
    } catch {
      // 继续尝试下一份
    }
  }
  return fallback
}

/** Write JSON via temp file + rename so a crash never leaves a half-written store. */
export function writeJsonAtomic(file: string, data: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  rotateBackup(file)
  const tmp = `${file}.tmp`
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmp, file)
}
