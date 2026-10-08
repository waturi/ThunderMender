import { useEffect, useState } from 'react'
import { getPage, type Citation } from './data'
import { makeId, type DiagnosticCase } from './cases'
import { addTraceReport, activeReports, controls, invalidateTrace, latestReports, reportKinds, reportLabels, routeStatus, setControl, setEndpoint, stepStatus, symptomText, traceAssessment, undoTraceReport, type ControlState, type TraceDraft, type TraceState } from './trace'
import { endpoints, getEndpoint, traceBranches, traceSteps, type TraceStep } from './trace-data'
import { Icon, message } from './ui'

function SourceLinks({ citations, onSource, hasPage }: { citations: Citation[]; onSource: (citation: Citation) => void; hasPage: (pageId: string) => boolean }) {
  return <div className="trace-citations">{citations.map((c, i) => <button className="citation" key={i} onClick={() => onSource(c)}>
    <Icon name="book" size={16} /><span><strong>{getPage(c.pageId).filename} · {getPage(c.pageId).kind}</strong><small>{c.label}{hasPage(c.pageId) ? '' : ' · import needed'}</small></span><Icon name="arrow" size={14} />
  </button>)}</div>
}
function Recorder({ item, step, onChange }: { item: DiagnosticCase; step: TraceStep; onChange: (trace: TraceState) => void }) {
  const existing = latestReports(item.trace, item.answers).get(step.id)
  const [draft, setDraft] = useState<TraceDraft>(existing ?? { kind: 'unknown', note: '', reading: '', units: '', reference: '', load: '' })
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)
  useEffect(() => { setDraft(existing ?? { kind: 'unknown', note: '', reading: '', units: '', reference: '', load: '' }) }, [existing])
  const field = <K extends keyof TraceDraft>(key: K, value: TraceDraft[K]) => { setDraft(d => ({ ...d, [key]: value })); setSavedId(null) }
  return <form className="trace-recorder" onSubmit={event => {
    event.preventDefault(); setError('')
    try {
      const reportId = makeId()
      onChange(addTraceReport(item.trace, item.answers, draft, reportId, new Date().toISOString()))
      setSavedId(reportId)
    }
    catch (err) { setError(message(err)) }
  }}>
    <h4>{existing ? 'Edit this point’s report' : 'Record existing evidence'}</h4>
    <p>No probing instructions are approved. Record something already observed or previously measured; do not energize or probe wiring for this form.</p>
    <label>Report at this point<select value={draft.kind} onChange={e => field('kind', e.target.value as TraceDraft['kind'])}>{reportKinds.map(k => <option value={k} key={k}>{reportLabels[k]}</option>)}</select></label>
    <label>What was actually observed?<textarea maxLength={2000} rows={3} required={draft.kind !== 'unknown'} value={draft.note} onChange={e => field('note', e.target.value)} placeholder="Describe the evidence, who observed it, and any uncertainty." /></label>
    {draft.kind === 'measurement' && <fieldset><legend>Existing measurement only · no pass/fail inference</legend>
      <div className="trace-field-grid"><label>Raw reading<input maxLength={100} required value={draft.reading} onChange={e => field('reading', e.target.value)} /></label><label>Units<input maxLength={40} required value={draft.units} onChange={e => field('units', e.target.value)} placeholder="As recorded" /></label></div>
      <label>Measurement reference / comparison point<input maxLength={300} required value={draft.reference} onChange={e => field('reference', e.target.value)} placeholder="Describe the recorded reference, or state unknown" /></label>
      <label>Load / connection state<input maxLength={300} required value={draft.load} onChange={e => field('load', e.target.value)} placeholder="Connected, disconnected, or unknown; preserve the original context" /></label>
      <p>An unloaded voltage does not prove usable current. No numeric threshold or component verdict is applied.</p>
    </fieldset>}
    <p className="footnote">Saved with this endpoint, intake and control context. Editing appends a replacement report; the original stays in history.</p>
    <button className="button primary" type="submit">{existing ? 'Save revised report' : 'Save point report'}</button>
    {savedId && savedId === existing?.id && <p role="status">Point report saved locally. No electrical conclusion was inferred.</p>}
    {error && <p role="alert" className="error">{error}</p>}
  </form>
}

export function TracePanel({ item, onChange, onSource, hasPage }: {
  item: DiagnosticCase
  onChange: (trace: TraceState) => void
  onSource: (citation: Citation) => void
  hasPage: (pageId: string) => boolean
}) {
  const trace = item.trace
  const steps = trace.endpointId ? traceSteps(trace.endpointId) : []
  const selected = steps.find(s => s.id === trace.selectedStepId)
  const latest = latestReports(trace, item.answers)
  const state = routeStatus(trace, item.answers)
  const [resetting, setResetting] = useState(false)
  return <section className="trace-panel" aria-label="Power trace">
    <div className="trace-heading"><span className="eyebrow">FOLLOW THE CONNECTIONS</span><h2>Trace power to the problem.</h2><p>A source-backed, <strong>partial</strong> factory connection path. No animated current or live measurements. Dashed breaks are gaps, not wires.</p></div>
    <label className="trace-endpoint">Which lamp are we tracing?<select value={trace.endpointId ?? ''} onChange={event => { if (event.target.value) onChange(setEndpoint(trace, event.target.value)) }}>
      <option value="" disabled>Choose a side and an individual lamp…</option>
      {endpoints.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
    </select></label>
    <p className="trace-symptom">{symptomText(trace, item.answers)}</p>
    <details className="trace-conditions" open={!trace.endpointId}>
      <summary>Observation conditions · {Object.values(trace.conditions).includes('unknown') ? 'not fully recorded' : 'recorded'}</summary>
      <p>Describe the state during an existing observation. These are not instructions to operate the car. Changes separate previous reports into history, even if you later switch back.</p>
      <div className="trace-field-grid">{(Object.keys(controls) as (keyof ControlState)[]).map(key => <label key={key}>{({ ignition: 'Ignition', turn: 'Turn switch', brake: 'Brake pedal', hazards: 'Hazards' })[key]}<select aria-label={`Trace ${key}`} value={trace.conditions[key]} onChange={e => onChange(setControl(trace, key, e.target.value as ControlState[typeof key]))}>
        {controls[key].map(value => <option key={value} value={value}>{value === 'unknown' ? 'Unknown / not recorded' : value[0].toUpperCase() + value.slice(1)}</option>)}
      </select></label>)}</div>
      <p>Sequence motor phase: <strong>unknown</strong>. No verified timing/contact truth table is available.</p>
    </details>
    <div className="trace-state" role="status"><strong>{state.status}</strong><p>{state.detail}</p></div>
    {trace.endpointId && <>
      <div className="trace-assessment"><span className="eyebrow">YOUR EVIDENCE, NOT A PARTS VERDICT</span><p>{traceAssessment(trace, item.answers)}</p></div>
      <div className="trace-layout">
        <nav aria-label="Ordered trace points"><ol className="trace-steps">{steps.map((step, index) => <li key={step.id} className={`trace-link-${step.link}`}>
          <button aria-current={selected?.id === step.id ? 'step' : undefined} onClick={() => onChange({ ...trace, selectedStepId: step.id })}>
            <span className="trace-number">{step.kind === 'gap' ? '?' : index + 1}</span><span><strong>{step.title}</strong><small>{stepStatus(step, latest.get(step.id))}</small></span>
          </button>
        </li>)}</ol></nav>
        {selected && <section className="trace-detail" aria-label="Selected trace point">
          <span className="eyebrow">{selected.kind === 'gap' ? 'DOCUMENTED LIMIT' : `POINT ${steps.indexOf(selected) + 1} · ${selected.kind.toUpperCase()}`}</span>
          <h3>{selected.title}</h3><p>{selected.detail}</p>
          <p className="trace-point-status">{stepStatus(selected, latest.get(selected.id))}</p>
          {selected.wire && <p className="trace-wire"><strong>Printed circuit:</strong> {selected.wire}<br /><strong>Wire identity:</strong> {selected.color}</p>}
          {selected.link === 'state-gap' && <p className="inline-warning">A user report does not resolve the missing factory contact-state rules.</p>}
          <SourceLinks citations={selected.citations} onSource={onSource} hasPage={hasPage} />
          <div className="trace-back-next"><button className="button secondary small" disabled={steps.indexOf(selected) === 0} onClick={() => onChange({ ...trace, selectedStepId: steps[steps.indexOf(selected) - 1].id })}>← Previous point</button><button className="button secondary small" disabled={steps.indexOf(selected) === steps.length - 1} onClick={() => onChange({ ...trace, selectedStepId: steps[steps.indexOf(selected) + 1].id })}>Next point →</button></div>
          {selected.kind !== 'gap' ? <Recorder key={`${item.id}-${trace.epoch}-${selected.id}`} item={item} step={selected} onChange={onChange} /> : <p className="inline-warning">This gap cannot be treated as a test point. The missing source/vehicle evidence must be resolved before claiming continuity.</p>}
        </section>}
      </div>
      <details className="trace-branches"><summary>Shared feeds, controls & parallel branches</summary>
        {traceBranches.map(branch => <article key={branch.title}><h4>{branch.title}</h4><p>{branch.detail}</p><SourceLinks citations={branch.citations} onSource={onSource} hasPage={hasPage} /></article>)}
        <p>Left rear: 442 / 443 / 444. Right rear: 447 / 446 / 445. Use the endpoint selector to inspect each separate lamp branch. Drawing order is not a verified physical lamp position.</p>
      </details>
    </>}
    <div className="trace-actions"><button className="button secondary small" disabled={!activeReports(trace, item.answers).length} onClick={() => onChange(undoTraceReport(trace, item.answers))}>Undo last point report</button>
      <button className="button secondary small" onClick={() => setResetting(true)}>Reset current trace evidence</button></div>
    {resetting && <div className="inline-warning"><p>Start a fresh comparison context? Raw reports, including withdrawn reports, remain in history and exports.</p><button className="button secondary small" onClick={() => { onChange(invalidateTrace(trace)); setResetting(false) }}>Keep history and reset</button>{' '}<button className="button secondary small" onClick={() => setResetting(false)}>Cancel reset</button></div>}
    <details className="trace-history"><summary>Trace history · {trace.reports.length} raw reports</summary>
      <p>Only the latest unwithdrawn report per point in the current context is compared. Intake, endpoint or condition edits retire earlier evidence. Nothing automatically transfers between sides or lamps.</p>
      {[...trace.reports].reverse().map(r => <article key={r.id}>
        <strong>{getEndpoint(r.endpointId).title} · {traceSteps(r.endpointId).find(s => s.id === r.stepId)!.title}</strong>
        <small>{new Date(r.at).toLocaleString()} · context {r.epoch} · {trace.withdrawn.includes(r.id) ? 'Withdrawn by undo' : latest.get(r.stepId)?.id === r.id ? 'Current report' : r.epoch === trace.epoch ? 'Superseded report' : 'Historical context'}</small>
        <p>{reportLabels[r.kind]}{r.note && ` — ${r.note}`}</p>
        {r.reading && <p>Raw reading: {r.reading} {r.units}. Reference: {r.reference}. Load: {r.load}.</p>}
        <p>Ignition {r.conditions.ignition}; turn {r.conditions.turn}; brake {r.conditions.brake}; hazards {r.conditions.hazards}; motor phase unknown.</p>
        <p>Vehicle {r.intake.vehicle ?? 'unknown'}; trim {r.intake.trim ?? 'unknown'}; wiring {r.intake.configuration ?? 'unknown'}. Original intake is preserved in the case export.</p>
      </article>)}
      {!trace.reports.length && <p>No trace-point evidence recorded yet.</p>}
    </details>
    <p className="footnote muted">Source-checked transcription, not expert verification. This is not a powered-testing procedure. Stop for smoke, burning or hot wiring. Unresolved exterior signal / brake failures are not roadworthy.</p>
  </section>
}
