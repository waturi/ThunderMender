import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { components, getComponent, getPage, pages, type Citation } from './data'
import type { Answers } from './diagnostics'
import type { ManualImage } from './manuals'
import { Icon } from './ui'

function observation(id: string, answers: Answers): string {
  const key = ({ 'front-left': 'frontLeft', 'front-right': 'frontRight', 'rear-left': 'rearLeft', 'rear-right': 'rearRight' } as const)[id as 'front-left']
  const value = key && answers[key]
  return value && value !== 'unknown' ? ({ flashes: 'Observed: flashing', steady: 'Observed: steady', dark: 'Observed: dark', sequence: 'Observed: sequencing', together: 'Observed: together', partial: 'Observed: some lamps', intermittent: 'Observed: intermittent' }[value] ?? 'Not observed') : 'Not observed'
}
export function ComponentMap({ selected, onSelect, answers, focus }: { selected: string; onSelect: (id: string) => void; answers: Answers; focus: boolean }) {
  return <div className="component-map">
    <div className="map-heading"><span className="eyebrow">THE BLINKER CIRCUIT</span><h2>A clearer place to start.</h2><p>Factory components, organized for exploration.<br />Select a component to see its original source.</p></div>
    <div className="map-groups">
      {(['Driver controls', 'Factory sequencing', 'Exterior lamps'] as const).map((group, index) => <section className="map-group" key={group}>
        <h3><span>{String(index + 1).padStart(2, '0')}</span>{group}</h3>
        <div className="map-nodes">{components.filter(c => c.group === group).map(component => <button
          key={component.id} className={`map-node ${selected === component.id ? 'selected' : ''} ${focus && selected !== component.id ? 'dimmed' : ''}`}
          onClick={() => onSelect(component.id)} aria-pressed={selected === component.id}
        ><span className="node-symbol"><Icon name={group === 'Exterior lamps' ? 'lamp' : 'circuit'} size={24} /></span>
          <span><strong>{component.shortName}</strong><small>{group === 'Exterior lamps' ? observation(component.id, answers) : group === 'Factory sequencing' ? answers.configuration === 'factory' ? 'Factory reported · untested' : 'Fitment unconfirmed' : 'Condition unknown'}</small></span>
          <span className="node-selection">{selected === component.id ? <Icon name="check" size={14} /> : '+'}</span>
        </button>)}</div>
      </section>)}
    </div>
    <div className="map-caption"><Icon name="book" /><span><strong>Component map, not a wiring schematic.</strong> Grouping lines are not wires. No current flow, sequence timing, or live state is simulated. Amber marks selection—not wire color or a failed part.</span></div>
  </div>
}

interface SourceViewerProps {
  image?: ManualImage
  pageId: string
  selected: string
  onSelect: (id: string) => void
  onImport: () => void
  focus: boolean
  focusRequest: { citation: Citation; serial: number } | null
}
const clampZoom = (n: number) => Math.min(14, Math.max(1, n))
export function SourceViewer({ image, pageId, selected, onSelect, onImport, focus, focusRequest }: SourceViewerProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const dragDistance = useRef(0)
  const [size, setSize] = useState({ w: 700, h: 520 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [url, setUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const page = image?.pageId === null ? undefined : pages.find(p => p.id === pageId)
  const ratio = image ? image.width / image.height : 1.29
  const w = Math.min(size.w - 32, (size.h - 32) * ratio)
  const h = w / ratio
  const regions = components.flatMap(c => c.citations.filter(cite => cite.pageId === pageId && image?.pageId === pageId).map(cite => ({ component: c, citation: cite })))
  const active = regions.find(r => r.component.id === selected)?.citation.region
  useEffect(() => {
    if (!image) { setUrl(''); return }
    const next = URL.createObjectURL(image.blob)
    setUrl(next)
    setImageError(false)
    return () => URL.revokeObjectURL(next)
  }, [image])
  useEffect(() => {
    const node = viewport.current
    if (!node) return
    const observer = new ResizeObserver(entries => {
      const rect = entries[0].contentRect
      setSize({ w: Math.max(rect.width, 100), h: Math.max(rect.height, 100) })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); pointers.current.clear() }, [pageId, image?.id])
  useEffect(() => {
    if (!focusRequest || !image || focusRequest.citation.pageId !== pageId || image.pageId !== pageId) return
    const r = focusRequest.citation.region
    const z = clampZoom(Math.min((size.w - 80) / (w * r.w), (size.h - 80) / (h * r.h), 6))
    setZoom(z)
    setPan({ x: (.5 - r.x - r.w / 2) * w * z, y: (.5 - r.y - r.h / 2) * h * z })
  }, [focusRequest, image, pageId, size.w, size.h, w, h])
  function reset() { setZoom(1); setPan({ x: 0, y: 0 }) }
  function changeZoom(next: number) {
    const z = clampZoom(next)
    setPan(p => ({ x: p.x * z / zoom, y: p.y * z / zoom }))
    setZoom(z)
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const before = pointers.current.get(event.pointerId)
    if (!before) return
    dragDistance.current += Math.abs(event.clientX - before.x) + Math.abs(event.clientY - before.y)
    const previous = [...pointers.current.values()]
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const current = [...pointers.current.values()]
    if (current.length === 1) setPan(p => ({ x: p.x + event.clientX - before.x, y: p.y + event.clientY - before.y }))
    else if (current.length === 2) {
      const distance = (points: typeof current) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)
      const oldDistance = distance(previous)
      if (oldDistance > 0) changeZoom(zoom * distance(current) / oldDistance)
    }
  }
  return <div className="source-viewer">
    <div className="source-label"><span className="badge">{page?.kind ?? 'Unmatched image'}</span><span>{page?.title ?? image?.filename}</span></div>
    <div className="source-viewport" ref={viewport} tabIndex={image ? 0 : -1} aria-label="Manual diagram. Drag to pan, pinch to zoom, or use plus, minus, arrow keys and Home."
      onKeyDown={event => {
        if (event.target !== event.currentTarget || !image) return
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault()
        if (event.key === '+' || event.key === '=') changeZoom(zoom * 1.3)
        if (event.key === '-') changeZoom(zoom / 1.3)
        if (event.key === 'Home') reset()
        if (event.key.startsWith('Arrow')) setPan(p => ({ x: p.x + (event.key === 'ArrowLeft' ? 60 : event.key === 'ArrowRight' ? -60 : 0), y: p.y + (event.key === 'ArrowUp' ? 60 : event.key === 'ArrowDown' ? -60 : 0) }))
      }}
      onPointerDown={event => {
        if (!image) return
        if (!pointers.current.size) dragDistance.current = 0
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        const target = (event.target as HTMLElement).closest('button') ?? event.currentTarget
        target.setPointerCapture(event.pointerId)
      }} onPointerMove={pointerMove}
      onPointerUp={event => pointers.current.delete(event.pointerId)}
      onPointerCancel={event => pointers.current.delete(event.pointerId)}
      onLostPointerCapture={event => pointers.current.delete(event.pointerId)}
    >
      {image && url && !imageError ? <div className="source-stage" style={{ width: w, height: h, left: (size.w - w) / 2 + pan.x, top: (size.h - h) / 2 + pan.y, transform: `scale(${zoom})` }}>
        <img src={url} alt={`${page?.title ?? image.filename} — ${page?.kind ?? 'unmatched local image'}`} draggable={false} onError={() => setImageError(true)} />
        {focus && active && <svg className="source-dim" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path fillRule="evenodd" d={`M0 0H1V1H0Z M${active.x} ${active.y}h${active.w}v${active.h}h-${active.w}Z`} /></svg>}
        {regions.map(({ component, citation }, index) => <button key={`${component.id}-${index}`} className={`source-region ${selected === component.id ? 'selected' : ''}`} aria-label={`Locate ${component.name}: ${citation.label}`} aria-pressed={selected === component.id}
          style={{ left: `${citation.region.x * 100}%`, top: `${citation.region.y * 100}%`, width: `${citation.region.w * 100}%`, height: `${citation.region.h * 100}%`, borderWidth: (selected === component.id ? 2 : 1) / zoom }}
          onClick={event => { if (event.detail === 0 || dragDistance.current < 6) onSelect(component.id) }} title={component.name}><span style={{ transform: `scale(${1 / zoom})` }}>{components.indexOf(component) + 1}</span></button>)}
      </div> : <div className="source-empty"><div className="empty-book"><Icon name="book" size={38} /></div><span className="eyebrow">YOUR MANUAL, KEPT PRIVATE</span>
        <h2>{imageError ? 'This image could not be displayed.' : 'Bring the original into view.'}</h2>
        <p>{imageError ? 'Remove and re-import this file from your manual library.' : <>Import <strong>{page?.filename ?? 'your scan'}</strong> or your whole manual folder. Images stay in this browser. We never substitute an invented diagram.</>}</p>
        <button className="button primary" onClick={onImport}><Icon name="upload" />Open manual library</button>
      </div>}
    </div>
    <div className="source-controls"><span>{image ? 'Drag to pan · pinch or buttons to zoom' : 'Original source is not yet imported'}</span><div className="zoom-controls">
      <button disabled={!image} className="icon-button" aria-label="Zoom out" onClick={() => changeZoom(zoom / 1.35)}><Icon name="minus" /></button>
      <output aria-label="Diagram zoom">{Math.round(zoom * 100)}%</output>
      <button disabled={!image} className="icon-button" aria-label="Zoom in" onClick={() => changeZoom(zoom * 1.35)}><Icon name="plus" /></button>
      <button disabled={!image} className="icon-button" aria-label="Reset diagram view" onClick={reset}><Icon name="reset" /></button>
    </div></div>
    {image?.pageId === null && <p className="inline-warning">Unmatched scan: available for browsing only. Source regions are disabled; filename similarity is not evidence of identity.</p>}
  </div>
}

export function ComponentDetail({ selected, onSource, hasPage }: { selected: string; onSource: (citation: Citation) => void; hasPage: (pageId: string) => boolean }) {
  const component = getComponent(selected)
  return <section className="component-detail" aria-label="Selected component detail">
    <div className="detail-heading"><span className="node-symbol"><Icon name={component.group === 'Exterior lamps' ? 'lamp' : 'circuit'} /></span><div><span className="eyebrow">SELECTED COMPONENT</span><h3>{component.name}</h3></div><span className="badge subtle">Untested</span></div>
    <p>{component.fact}</p><p className="muted">{component.uncertainty}</p>
    <div className="citation-list">{component.citations.map(cite => <button className="citation" key={`${cite.pageId}-${cite.label}`} onClick={() => onSource(cite)}><Icon name="book" /><span><strong>{getPage(cite.pageId).filename} · {getPage(cite.pageId).kind}</strong><small>{cite.label}{!hasPage(cite.pageId) ? ' · import needed' : ''}</small></span><Icon name="arrow" size={16} /></button>)}</div>
  </section>
}
