import { describe, expect, it } from 'vitest'
import { fileUrl } from '../file-url'

describe('fileUrl', () => {
  it('builds a catreader:// URL with an encoded absolute path', () => {
    expect(fileUrl('C:\\Users\\测试\\cover.jpg')).toBe(
      'catreader://local/C:/Users/%E6%B5%8B%E8%AF%95/cover.jpg'
    )
  })

  it('encodes spaces and keeps the drive letter intact', () => {
    expect(fileUrl('C:\\Users\\my books\\cover 1.jpg')).toBe(
      'catreader://local/C:/Users/my%20books/cover%201.jpg'
    )
  })
})
