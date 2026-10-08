import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { components, getPage, pages } from './data'
import { deleteImage, hashBytes, importImages, pageForHash, prepareImage, readImages } from './manuals'

describe('source integrity', () => {
  it('has 13 unique, fingerprinted pages with correct identities', () => {
    expect(pages).toHaveLength(13)
    expect(new Set(pages.map(p => p.sha256)).size).toBe(13)
    expect(getPage('exterior-schematic').filename).toBe('Scan 6.jpeg')
    expect(getPage('exterior-location').filename).toBe('Scan 5.jpeg')
    expect(getPage('air-conditioning').filename).toBe('Scan 12.jpeg')
    expect(pageForHash(getPage('exterior-schematic').sha256)).toBe('exterior-schematic')
    expect(pageForHash('different bytes, same name')).toBeNull()
  })
  it('keeps every component source link inside a known page', () => {
    for (const component of components) {
      expect(component.citations.length).toBeGreaterThan(0)
      for (const citation of component.citations) {
        expect(getPage(citation.pageId)).toBeDefined()
        const { x, y, w, h } = citation.region
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(w).toBeGreaterThan(0)
        expect(h).toBeGreaterThan(0)
        expect(x + w).toBeLessThanOrEqual(1)
        expect(y + h).toBeLessThanOrEqual(1)
      }
    }
  })
  it('computes SHA-256 without secure-context-only APIs', () => {
    expect(hashBytes(new TextEncoder().encode('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})

describe('private manual storage', () => {
  beforeEach(() => vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() })))
  const image = () => new File([new Uint8Array([255, 216, 255, 0, 1])], 'Scan 6.jpeg', { type: 'image/jpeg' })
  it('does not attach citation regions based only on a matching filename', async () => {
    const prepared = await prepareImage(image())
    expect(prepared.pageId).toBeNull()
  })
  it('persists and deduplicates blobs in IndexedDB, and deletes only the selected image', async () => {
    const result = await importImages([image(), image()])
    expect(result.images).toHaveLength(1)
    expect((await readImages())[0].blob).toBeInstanceOf(Blob)
    await deleteImage(result.images[0].id)
    expect(await readImages()).toHaveLength(0)
  })
  it('rejects markup and oversized files without relying on extension or MIME', async () => {
    await expect(prepareImage(new File(['<svg onload="alert(1)"/>'], 'Scan 6.jpeg', { type: 'image/jpeg' }))).rejects.toThrow('genuine JPEG')
    await expect(prepareImage(new File([new Uint8Array(26 * 1024 * 1024)], 'huge.jpeg'))).rejects.toThrow('25 MiB')
    await expect(importImages([])).rejects.toThrow('1–30')
    await expect(importImages(Array.from({ length: 31 }, image))).rejects.toThrow('1–30')
  })
  it('does not partially write a batch with an invalid image', async () => {
    await expect(importImages([image(), new File(['invalid'], 'fake.png')])).rejects.toThrow()
    expect(await readImages()).toHaveLength(0)
  })
  it('surfaces decode failures and pixel limits', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode')))
    await expect(prepareImage(image())).rejects.toThrow('could not be decoded')
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10000, height: 10000, close: vi.fn() }))
    await expect(prepareImage(image())).rejects.toThrow('50-megapixel')
  })
})
