import { useRef, useState } from 'react'
import { pages, REVIEW_STATUS } from './data'
import { deleteImage, importImages, type ManualImage } from './manuals'
import { Icon, message, Modal } from './ui'

export function Library({ images, onImages, onOpen, onClose }: { images: ManualImage[]; onImages: (images: ManualImage[]) => void; onOpen: (id: string) => void; onClose: () => void }) {
  const files = useRef<HTMLInputElement>(null)
  const folder = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [remove, setRemove] = useState<string | null>(null)
  async function handleFiles(list: FileList | null, folderImport = false) {
    if (!list?.length) return
    setBusy(true); setError(''); setStatus('Checking image identities and saving privately…')
    const all = Array.from(list)
    const chosen = folderImport ? all.filter(f => /\.(jpe?g|png)$/i.test(f.name)) : all
    try {
      const result = await importImages(chosen)
      onImages(result.images)
      setStatus(`${result.matched} source matches, ${result.unmatched} unmatched images. Saved in this browser.${chosen.length !== all.length ? ` ${all.length - chosen.length} non-image files skipped.` : ''}`)
    } catch (err) { setError(message(err)); setStatus('Import did not finish. Existing images are unchanged.') }
    finally { setBusy(false); if (files.current) files.current.value = ''; if (folder.current) folder.current.value = '' }
  }
  async function removeImage(id: string) {
    setBusy(true); setError('')
    try { await deleteImage(id); onImages(images.filter(i => i.id !== id)); setRemove(null); setStatus('Image removed from this browser. Your original file was not changed.') }
    catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }
  return <Modal title="Your manual library" onClose={onClose} wide>
    <div className="library-intro"><div className="empty-book"><Icon name="book" size={30} /></div><div><span className="eyebrow">PRIVATE BY DESIGN</span><h3>The original is your reference.</h3><p>Choose your JPEG / PNG scans. No upload, account, or AI processing. Originals stay untouched; private copies are stored in this browser’s IndexedDB.</p></div></div>
    <div className="import-actions">
      <input ref={files} data-testid="manual-files" className="visually-hidden" type="file" accept="image/jpeg,image/png" multiple onChange={e => void handleFiles(e.target.files)} />
      <input ref={folder} data-testid="manual-folder" className="visually-hidden" type="file" multiple {...{ webkitdirectory: '' }} onChange={e => void handleFiles(e.target.files, true)} />
      <button className="button primary" disabled={busy} onClick={() => files.current?.click()}><Icon name="upload" />{busy ? 'Importing…' : 'Choose scans'}</button>
      <button className="button secondary" disabled={busy} onClick={() => folder.current?.click()}>Choose a folder</button>
      <span className="muted">Up to 30 images · 25 MiB each · 200 MiB per batch</span>
    </div>
    {status && <p role="status" className="notice">{status}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <p className="source-review"><Icon name="shield" />{REVIEW_STATUS}. File fingerprints establish page identity, not technical correctness or the wiring installed in your vehicle.</p>
    <div className="library-pages">{pages.map(page => {
      const image = images.find(i => i.pageId === page.id)
      return <div className="library-page" key={page.id}><span className={`page-status ${image ? 'present' : ''}`}><Icon name={image ? 'check' : 'book'} /></span>
        <div><strong>{page.title}</strong><small>{page.filename} · {page.kind}</small></div>
        <span className="badge subtle">{image ? 'Matched' : 'Not imported'}</span>
        <button className="button small secondary" onClick={() => onOpen(page.id)}>{image ? 'View' : 'Open source'}</button>
        {image && <button className="icon-button" aria-label={`Remove ${page.filename}`} disabled={busy} onClick={() => setRemove(image.id)}><Icon name="close" size={16} /></button>}
      </div>
    })}</div>
    {images.some(i => !i.pageId) && <section><h3>Unmatched local images</h3><p className="muted">Cropped, recompressed, or different scans are browse-only. No authored hotspots will be attached to them.</p>
      {images.filter(i => !i.pageId).map(image => <div className="library-page" key={image.id}><Icon name="book" /><div><strong>{image.filename}</strong><small>Unmatched · no source overlays</small></div><button className="button secondary small" onClick={() => onOpen(image.id)}>View</button><button className="icon-button" aria-label={`Remove ${image.filename}`} onClick={() => setRemove(image.id)}><Icon name="close" /></button></div>)}
    </section>}
    {remove && <div className="inline-warning" role="alert"><p>Remove this browser’s copy? The original file and diagnostic cases will be kept.</p><button className="button danger" disabled={busy} onClick={() => void removeImage(remove)}>Remove local copy</button> <button className="button secondary" onClick={() => setRemove(null)}>Keep image</button></div>}
    <p className="muted footnote">Browser storage is not a backup and is specific to this browser and site address. Case exports do not contain manual images. Keep your originals, and import them separately on a phone. Publisher / reuse rights are unconfirmed; scans are not included in the application.</p>
  </Modal>
}
