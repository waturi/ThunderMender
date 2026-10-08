import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { pages } from './data'

export interface ManualImage {
  id: string
  filename: string
  pageId: string | null
  width: number
  height: number
  blob: Blob
}
const DB_NAME = 'thundermender-manuals-v1'
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024
export const MAX_BATCH_BYTES = 200 * 1024 * 1024
export function pageForHash(hash: string): string | null {
  return pages.find(page => page.sha256 === hash)?.id ?? null
}
export function hashBytes(bytes: Uint8Array): string { return bytesToHex(sha256(bytes)) }

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Private manual storage could not open. Check browser storage permissions.'))
    request.onblocked = () => reject(new Error('Manual storage is blocked by another open tab. Close other ThunderMender tabs and retry.'))
  })
}
export async function readImages(): Promise<ManualImage[]> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly')
    const request = tx.objectStore('images').getAll()
    tx.oncomplete = () => { db.close(); resolve(request.result as ManualImage[]) }
    tx.onerror = () => { db.close(); reject(new Error('Could not read private manual images. Reopen the library to retry.')) }
    tx.onabort = () => { db.close(); reject(new Error('Reading manual storage was interrupted.')) }
  })
}
async function writeImages(images: ManualImage[]): Promise<void> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite')
    for (const image of images) tx.objectStore('images').put(image)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(new Error('Manual images could not be saved. Browser storage may be full. No images in this batch were saved.')) }
    tx.onabort = () => { db.close(); reject(new Error('Manual import was cancelled by storage. No images in this batch were saved.')) }
  })
}
export async function deleteImage(id: string): Promise<void> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite')
    tx.objectStore('images').delete(id)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(new Error('Could not remove this local image.')) }
    tx.onabort = () => { db.close(); reject(new Error('Removing this local image was interrupted.')) }
  })
}
export async function prepareImage(file: File): Promise<ManualImage> {
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: use an image smaller than 25 MiB.`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)
  if (!jpeg && !png) throw new Error(`${file.name}: only genuine JPEG and PNG images are accepted.`)
  const blob = new Blob([bytes], { type: jpeg ? 'image/jpeg' : 'image/png' })
  let image: ImageBitmap
  try { image = await createImageBitmap(blob) }
  catch { throw new Error(`${file.name}: the image could not be decoded. Nothing in this batch was imported.`) }
  const { width, height } = image
  image.close()
  if (!width || !height || width * height > 50_000_000) throw new Error(`${file.name}: image exceeds the 50-megapixel limit.`)
  const id = hashBytes(bytes)
  return { id, filename: file.name.slice(0, 180), pageId: pageForHash(id), width, height, blob }
}
export async function importImages(files: File[]): Promise<{ images: ManualImage[]; matched: number; unmatched: number }> {
  if (!files.length || files.length > 30 || files.reduce((sum, f) => sum + f.size, 0) > MAX_BATCH_BYTES) throw new Error('Choose 1–30 images, at most 200 MiB total.')
  const images: ManualImage[] = []
  // Decode sequentially to avoid holding an entire folder of uncompressed scans.
  for (const file of files) images.push(await prepareImage(file))
  await writeImages(images)
  return { images: await readImages(), matched: images.filter(i => i.pageId).length, unmatched: images.filter(i => !i.pageId).length }
}
