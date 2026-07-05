import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_BYTES = 5 * 1024 * 1024

export async function saveUploadedFile(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('File too large (max 5MB)')
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = path.extname(file.name) || ''
  const filename = `${crypto.randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  return `/uploads/${filename}`
}
