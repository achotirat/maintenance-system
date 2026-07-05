import { describe, it, expect, afterEach } from 'vitest'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { saveUploadedFile, UPLOAD_DIR } from './local-upload'

describe('saveUploadedFile', () => {
  afterEach(async () => {
    await rm(UPLOAD_DIR, { recursive: true, force: true })
  })

  it('writes the file to disk and returns a URL path under /uploads', async () => {
    const file = new File(['fake receipt bytes'], 'receipt.png', { type: 'image/png' })

    const url = await saveUploadedFile(file)

    expect(url).toMatch(/^\/uploads\/.+\.png$/)
    const savedPath = path.join(UPLOAD_DIR, path.basename(url))
    const contents = await readFile(savedPath, 'utf-8')
    expect(contents).toBe('fake receipt bytes')
  })

  it('rejects files larger than 5MB', async () => {
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    })

    await expect(saveUploadedFile(oversized)).rejects.toThrow('File too large')
  })
})
