import { useEffect, useRef, useState } from 'react'
import { components, getComponent, pages, REVIEW_STATUS, type Citation } from './data'
import { nextQuestion, type QuestionId } from './diagnostics'
import { exportCase, importCase, loadCases, MAX_CASES, MAX_IMPORT_BYTES, newCase, saveCases, STORAGE_KEY, updateAnswer, type CaseStore, type DiagnosticCase } from './cases'
import { readImages, type ManualImage } from './manuals'
import { ComponentDetail, ComponentMap, SourceViewer } from './Diagram'
import { Guide } from './Guide'
import { Library } from './Library'
import { Notes } from './Notes'
import { downloadText, Icon, message, Modal } from './ui'

function initialState(): { store: CaseStore; error: string } {
  try { return { store: loadCases(), error: '' } }
  catch (error) {
    const item = newCase()
    return { store: { activeId: item.id, cases: [item] }, error: message(error) }
  }
}
type Dialog = 'library' | 'notes' | 'cases' | 'about' | null
export default function App() {
  const [initial] = useState(initialState)
  const [store, setStore] = useState(initial.store)
  const [recovery, setRecovery] = useState(initial.error)
  const [saveState, setSaveState] = useState('Saving locally…')
  const [saveError, setSaveError] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [images, setImages] = useState<ManualImage[]>([])
  const [manualError, setManualError] = useState('')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [selected, setSelected] = useState('turn-switch')
  const [pageId, setPageId] = useState('exterior-schematic')
  const [mode, setMode] = useState<'map' | 'source'>('map')
  const [focus, setFocus] = useState(false)
  const [focusRequest, setFocusRequest] = useState<{ citation: Citation; serial: number } | null>(null)
  const [search, setSearch] = useState('')
  const [sidebar, setSidebar] = useState(true)
  const [guide, setGuide] = useState(true)
  const [navTab, setNavTab] = useState<'components' | 'pages'>('components')
  const [mobileTab, setMobileTab] = useState<'workbench' | 'guide'>('guide')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const caseFile = useRef<HTMLInputElement>(null)
  const active = store.cases.find(c => c.id === store.activeId)!
  const matched = images.filter(i => i.pageId).length
  const image = images.find(i => i.pageId === pageId || i.id === pageId)
  const hasPage = (id: string) => images.some(i => i.pageId === id)
  const stopped = active.answers.safety && active.answers.safety !== 'clear'

  useEffect(() => {
    if (recovery) return
    try { saveCases(store); setSaveState('Saved in this browser'); setSaveError('') }
    catch (err) { setSaveState('Not saved · export a backup'); setSaveError(`Local saving failed: ${message(err)}. Your changes are in memory only. Export the case before closing this page.`) }
  }, [store, recovery])
  useEffect(() => {
    let cancelled = false
    readImages().then(result => { if (!cancelled) { setImages(result); setManualError('') } }).catch(err => { if (!cancelled) setManualError(message(err)) })
    return () => { cancelled = true }
  }, [])
  function change(item: DiagnosticCase) {
    setStore(s => ({ ...s, cases: s.cases.map(c => c.id === item.id ? item : c) }))
  }
  function answer(id: QuestionId, value: string) {
    const updated = updateAnswer(active, id, value)
    change(updated)
    const next = nextQuestion(updated.answers)
    if (next?.components[0]) setSelected(next.components[0])
  }
  function showSource(citation: Citation) {
    setMode('source'); setPageId(citation.pageId); setFocus(true)
    setFocusRequest({ citation, serial: Date.now() })
    setMobileTab('workbench')
  }
  function selectComponent(id: string) {
    setSelected(id)
    if (mode === 'source') {
      const component = getComponent(id)
      const citation = component.citations.find(c => c.pageId === pageId) ?? component.citations[0]
      setPageId(citation.pageId)
      setFocusRequest({ citation, serial: Date.now() })
    }
  }
  function evidence(id: string) { setSelected(id); showSource(getComponent(id).citations[0]) }
  function openPage(id: string) { setPageId(id); setFocusRequest(null); setMode('source'); setMobileTab('workbench'); setDialog(null) }
  function addCase() {
    if (store.cases.length >= MAX_CASES) { setError(`Limit of ${MAX_CASES} local cases reached. Export and delete a case first.`); return }
    const item = newCase()
    setStore(s => ({ activeId: item.id, cases: [...s.cases, item] })); setDialog(null); setNotice('New case created. No symptoms or wiring configuration have been assumed.')
  }
  function handleExport(item = active) {
    try { downloadText(exportCase(item), `thundermender-${item.id.slice(0, 8)}.thundermender.json`); setNotice('Case exported. Transfer the JSON to your phone and choose Import case there. Manual images are not included.') }
    catch (err) { setError(message(err)) }
  }
  async function handleImport(file?: File) {
    if (!file) return
    setError('')
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Case file exceeds the 2 MB limit.')
      if (store.cases.length >= MAX_CASES) throw new Error(`Limit of ${MAX_CASES} local cases reached. Export and delete a case first.`)
      const item = importCase(await file.text())
      setStore(s => ({ activeId: item.id, cases: [...s.cases, item] }))
      setNotice('Imported as a new local copy. No existing case was overwritten. Images must be imported separately.')
      setDialog(null)
    } catch (err) { setError(message(err)) }
    finally { if (caseFile.current) caseFile.current.value = '' }
  }
  const vehicleLabel = active.answers.vehicle === 'confirmed' ? '1967 Mercury Cougar' : active.answers.vehicle === 'mismatch' ? 'Vehicle mismatch · guide paused' : '1967 Mercury Cougar · confirm in guide'
  if (recovery) return <main className="recovery"><div className="brand"><span className="brand-mark"><Icon name="bolt" size={26} /></span>ThunderMender</div><h1>Let’s protect your saved cases.</h1><p role="alert">{recovery}</p><p>We have not overwritten the saved collection. Download its raw data for recovery before starting fresh. If browser storage is blocked, enable it and reload.</p>
    <button className="button primary" onClick={() => { try { downloadText(localStorage.getItem(STORAGE_KEY) ?? '{}', 'thundermender-recovery.json') } catch (err) { setRecovery(message(err)) } }}>Download recovery copy</button>{' '}
    <button className="button danger" onClick={() => { if (window.confirm('Replace the unreadable saved cases with a new empty workspace? Download a recovery copy first.')) setRecovery('') }}>Replace with empty workspace</button>
  </main>
  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#main-workbench" aria-label="ThunderMender workbench"><span className="brand-mark"><Icon name="bolt" size={25} /></span><span>Thunder<span className="brand-light">Mender</span><small>CLASSIC CAR WIRING. CLEAR ANSWERS.</small></span></a>
      <div className="header-center"><span className="header-divider" /><Icon name="circuit" size={18} /><span>Wiring workbench</span><span className="badge dark">EARLY ACCESS</span></div>
      <div className="header-actions"><span className="save-status"><span className={`local-dot ${saveError ? 'warning' : ''}`} />{saveState}</span><button className="header-button" onClick={() => setDialog('cases')}><Icon name="note" />My cases</button><button className="icon-button" aria-label="Privacy, costs and about" onClick={() => setDialog('about')}><Icon name="settings" /></button></div>
    </header>
    <div className="vehicle-bar"><div><span className="vehicle-year">67</span><div><strong>{vehicleLabel}</strong><span>{active.answers.trim === 'xr7' ? 'XR-7' : active.answers.trim === 'standard' ? 'Standard' : 'Trim unconfirmed'}<span className="dot-separator">·</span>{active.answers.configuration === 'factory' ? 'Factory mechanism reported' : active.answers.configuration === 'modified' ? 'Modified wiring reported' : 'Wiring configuration unconfirmed'}</span></div></div><button className="button secondary small" aria-label={`Manual library, ${matched} of 13 imported`} onClick={() => setDialog('library')}><Icon name="book" size={16} /><span>Manual library</span><span className="count">{matched}/13</span></button></div>
    <div className={`safety-strip ${stopped ? 'urgent' : ''}`}><Icon name="shield" size={16} /><span>{stopped ? 'STOP: Do not energize the wiring. Establish safety with qualified help before continuing.' : 'Parked observations only. Do not drive with unresolved exterior signal or brake-light failures.'}</span>{!stopped && <button onClick={() => { answer('safety', 'danger'); setGuide(true); setMobileTab('guide') }}>Report heat / smoke</button>}</div>
    {(error || saveError || manualError) && <div className="global-error" role="alert">{error || saveError || manualError}
      {error && <button className="text-link" onClick={() => setError('')}>Dismiss</button>}
      {manualError && !error && !saveError && <button className="text-link" onClick={() => { readImages().then(result => { setImages(result); setManualError('') }).catch(err => setManualError(message(err))) }}>Retry manual storage</button>}
    </div>}
    {notice && <div className="global-notice" role="status">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><Icon name="close" size={15} /></button></div>}
    <nav className="mobile-nav" aria-label="Mobile workspace"><button className={mobileTab === 'guide' ? 'active' : ''} onClick={() => { setMobileTab('guide'); setGuide(true) }}><Icon name="bolt" />Diagnostic guide</button><button className={mobileTab === 'workbench' ? 'active' : ''} onClick={() => setMobileTab('workbench')}><Icon name="circuit" />Diagram & sources</button><button aria-label="Open field notes" onClick={() => setDialog('notes')}><Icon name="note" /></button></nav>
    <div className={`workspace ${!sidebar ? 'sidebar-collapsed' : ''} ${!guide ? 'guide-collapsed' : ''} mobile-${mobileTab}`}>
      {sidebar && <aside className="sidebar" aria-label="Systems and source pages">
        <div className="sidebar-heading"><span className="eyebrow">EXPLORE YOUR WIRING</span><button className="icon-button" aria-label="Collapse navigation" onClick={() => setSidebar(false)}><Icon name="close" size={15} /></button></div>
        <label className="search-box"><Icon name="search" size={16} /><input aria-label="Search components and pages" placeholder="Find a component or page…" value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Clear search" onClick={() => setSearch('')}><Icon name="close" size={14} /></button>}</label>
        <div className="sidebar-tabs"><button aria-pressed={navTab === 'components'} onClick={() => setNavTab('components')}>Components</button><button aria-pressed={navTab === 'pages'} onClick={() => setNavTab('pages')}>Manual pages</button></div>
        <div className="sidebar-list">
          {navTab === 'components' ? <><div className="system-label"><Icon name="lamp" size={16} />Exterior lighting<span>01</span></div><div className="circuit-label"><span />Turn signals <span className="count">10</span></div>
            {components.filter(c => `${c.name} ${c.group} exterior lighting blinker`.toLowerCase().includes(search.toLowerCase())).map(c => <button key={c.id} className={`component-row ${selected === c.id ? 'active' : ''}`} onClick={() => selectComponent(c.id)} aria-pressed={selected === c.id}><span className="component-index">{String(components.indexOf(c) + 1).padStart(2, '0')}</span><span>{c.name}</span>{selected === c.id && <Icon name="chevron" size={13} />}</button>)}
            {!components.some(c => `${c.name} ${c.group} exterior lighting blinker`.toLowerCase().includes(search.toLowerCase())) && <p className="empty-search">No component matches. Try the Manual pages tab for other systems.</p>}
          </> : <>
            {pages.filter(p => `${p.title} ${p.filename} ${p.kind}`.toLowerCase().includes(search.toLowerCase())).map(p => <button key={p.id} className={`page-row ${pageId === p.id && mode === 'source' ? 'active' : ''}`} onClick={() => openPage(p.id)}><Icon name="book" size={16} /><span><strong>{p.title}</strong><small>{p.filename} · {p.kind}</small></span><span className={hasPage(p.id) ? 'page-dot loaded' : 'page-dot'} title={hasPage(p.id) ? 'Imported' : 'Not imported'} /></button>)}
            {!pages.some(p => `${p.title} ${p.filename} ${p.kind}`.toLowerCase().includes(search.toLowerCase())) && <p className="empty-search">No manual pages match this search.</p>}
          </>}
        </div>
        <div className="sidebar-bottom"><Icon name="shield" /><strong>Your garage. Your data.</strong><p>Cases and scans stay in this browser. No account needed.</p><button className="text-link" onClick={() => setDialog('about')}>How it works <Icon name="arrow" size={14} /></button></div>
      </aside>}
      <main className="workbench" id="main-workbench">
        <div className="workbench-top"><div><div className="breadcrumbs">Exterior lighting <Icon name="chevron" size={12} /> Turn signals</div><h1>Turn signals<span className="badge subtle">1967 COUGAR</span></h1></div><div className="panel-toggles">{!sidebar && <button className="icon-button" aria-label="Show navigation" onClick={() => setSidebar(true)}><Icon name="search" /></button>}<button className="button small secondary" aria-expanded={guide} onClick={() => setGuide(!guide)}><Icon name="bolt" size={15} />{guide ? 'Hide guide' : 'Show guide'}</button></div></div>
        <div className="diagram-toolbar"><div className="view-tabs" aria-label="Diagram view"><button aria-pressed={mode === 'map'} onClick={() => setMode('map')}><Icon name="circuit" size={15} />Component map</button><button aria-pressed={mode === 'source'} onClick={() => setMode('source')}><Icon name="book" size={15} />Original source</button></div><button className={`focus-toggle ${focus ? 'active' : ''}`} aria-pressed={focus} onClick={() => setFocus(!focus)}><Icon name="focus" size={15} />Focus</button></div>
        <section className="diagram-area" aria-label="Interactive diagram">
          {mode === 'map' ? <ComponentMap selected={selected} onSelect={selectComponent} answers={active.answers} focus={focus} /> : <SourceViewer image={image} pageId={pageId} selected={selected} onSelect={selectComponent} onImport={() => setDialog('library')} focus={focus} focusRequest={focusRequest} />}
        </section>
        <div className="evidence-strip"><Icon name="book" size={15} /><span>{REVIEW_STATUS}</span><button className="text-link" onClick={() => setDialog('library')}>{matched ? `${matched} source pages available` : 'Import your original scans'} <Icon name="arrow" size={13} /></button></div>
        <ComponentDetail selected={selected} onSource={showSource} hasPage={hasPage} />
        <div className="notes-bar"><button onClick={() => setDialog('notes')}><Icon name="note" /><strong>Field notes & recheck</strong><span className="count">{active.notes.length}</span><span className="muted">Observations, measurements, repair history</span><Icon name="chevron" size={16} /></button><button className="icon-button" aria-label="Export active case" onClick={() => handleExport()}><Icon name="download" /></button></div>
      </main>
      {guide && <Guide key={active.id} item={active} onAnswer={answer} onEvidence={evidence} onEditFocus={setSelected} onNotes={() => setDialog('notes')} />}
    </div>
    <input ref={caseFile} data-testid="case-file" className="visually-hidden" type="file" accept=".json,application/json" onChange={e => void handleImport(e.target.files?.[0])} />
    {dialog === 'library' && <Library images={images} onImages={setImages} onOpen={openPage} onClose={() => setDialog(null)} />}
    {dialog === 'notes' && <Notes item={active} selected={selected} onChange={change} onClose={() => setDialog(null)} />}
    {dialog === 'cases' && <Modal title="Your diagnostic cases" onClose={() => setDialog(null)} wide>
      <p className="muted">Saved only in this browser, not synced. Export a case to move between desktop and phone. Import always creates a copy; manual images are not included.</p>
      <div className="case-actions"><button className="button primary" onClick={addCase}><Icon name="plus" />New blinker case</button><button className="button secondary" onClick={() => caseFile.current?.click()}><Icon name="upload" />Import case</button><button className="button secondary" onClick={() => handleExport()}><Icon name="download" />Export current case</button></div>
      <label className="case-title-label">Current case name<input maxLength={100} value={active.title} onChange={e => { if (e.target.value.trim()) change({ ...active, title: e.target.value, updatedAt: new Date().toISOString() }) }} /></label>
      {store.cases.map(item => <div className="case-row" key={item.id}><div><strong>{item.title}</strong><small>{Object.keys(item.answers).length} answers · {item.notes.length} notes · {new Date(item.updatedAt).toLocaleString()}</small></div><button className="button secondary small" onClick={() => { setStore(s => ({ ...s, activeId: item.id })); setDialog(null) }}>{item.id === active.id ? 'Continue' : 'Open'}</button><button className="icon-button" aria-label={`Export ${item.title}`} onClick={() => handleExport(item)}><Icon name="download" /></button><button className="icon-button" aria-label={`Delete ${item.title}`} onClick={() => setDeleteId(item.id)}><Icon name="close" /></button></div>)}
      {deleteId && <div className="inline-warning"><p>Delete this local case permanently? Export a backup first. Manual images will be kept.</p><button className="button danger" onClick={() => {
        const remaining = store.cases.filter(c => c.id !== deleteId)
        if (!remaining.length) remaining.push(newCase())
        setStore({ cases: remaining, activeId: remaining.some(c => c.id === active.id) ? active.id : remaining[0].id }); setDeleteId(null)
      }}>Delete case</button>{' '}<button className="button secondary" onClick={() => setDeleteId(null)}>Keep case</button></div>}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="footnote muted">Export → transfer JSON using your own method → open this app on the other device → Import case. Editing each copy does not merge them. Use case dates and notes to identify the latest copy.</p>
    </Modal>}
    {dialog === 'about' && <Modal title="Built for your garage" onClose={() => setDialog(null)}>
      <span className="eyebrow">THUNDERMENDER · FIRST EDITION</span><h3>Clear answers start with honest evidence.</h3><p>This release covers observation-led turn-signal triage for a 1967 Mercury Cougar, plus private browsing of your manual. Other systems are reference-only.</p>
      <h3>Private & local-first</h3><p>Images live in IndexedDB; cases live in localStorage. Nothing is uploaded. There is no analytics, account, remote image service, automatic sync, or external font. Clearing site data removes your local copies.</p>
      <h3>AI status: not connected</h3><p>The guide is deterministic, not a live model. Optional source-backed AI explanations and approved electrical test procedures are deferred. Do not enter API keys here; there is no backend or key storage.</p>
      <h3>Evidence boundaries</h3><p>Source regions were visually located in the supplied scans, with local OCR as a reading aid. Fingerprints protect page identity. Transcriptions are not expert-reviewed. No wire colors, pin tests, fuse ratings, operating-state paths, or sequence timing are inferred.</p>
      <h3>No running infrastructure cost</h3><p>This local app uses no paid services. A future static Azure hosting path can stay within the $50/month infrastructure ceiling; provisioning requires separate approval. AI tokens, if later enabled, are a separate budget.</p>
      <button className="button secondary" onClick={() => setDialog('library')}><Icon name="book" />Open source library</button>
    </Modal>}
  </div>
}
