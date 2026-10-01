import { useEffect, useRef, type ReactNode } from 'react'

const paths = {
  bolt: 'm13 2-8 11h6l-1 9 9-12h-6l1-8Z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  book: 'M4 3h7l1 2 1-2h7v17h-7l-1 1-1-1H4V3Zm8 2v16',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  close: 'm6 6 12 12M6 18 18 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
  upload: 'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6',
  download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
  shield: 'm12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Zm-4 9 3 3 5-6',
  lamp: 'M8 17h8m-8 3h8M8 14a7 7 0 1 1 8 0v3H8v-3Z',
  circuit: 'M3 5h7v14h11M3 19h4M14 5h7M10 12h8M3 3v4m18-4v4m0 10v4',
  note: 'M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 5 7 7-7 7',
  settings: 'M3 7h18M3 17h18M8 4v6m8 4v6',
  focus: 'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6M9 9h6v6H9V9Z',
} as const
export function Icon({ name, size = 18 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose}>
    <header className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></header>
    <div className="modal-body">{children}</div>
  </dialog>
}
export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function message(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred. Your action could not be completed.'
}
