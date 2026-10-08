import { useState, type FormEvent } from 'react'
import { components, getComponent } from './data'
import { assess, nextQuestion } from './diagnostics'
import { makeId, MAX_NOTES, type DiagnosticCase, type Note, type VerificationKey } from './cases'
import { Icon, Modal } from './ui'

const verificationLabels: Record<VerificationKey, string> = {
  left: 'Left front and all left rear turn lamps',
  right: 'Right front and all right rear turn lamps',
  brakes: 'All rear brake lamps, signals off',
  hazards: 'Front and rear hazard lamps',
}
export function Notes({ item, selected, onChange, onClose }: { item: DiagnosticCase; selected: string; onChange: (item: DiagnosticCase) => void; onClose: () => void }) {
  const [kind, setKind] = useState<Note['kind']>('observation')
  const [text, setText] = useState('')
  const [componentId, setComponentId] = useState(selected)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const assessment = assess(item.answers)
  const canVerify = !nextQuestion(item.answers) && !assessment.stopped && item.answers.vehicle === 'confirmed'
  const complete = Object.keys(verificationLabels).every(key => item.verification[key as VerificationKey] === 'pass')
  function add(event: FormEvent) {
    event.preventDefault()
    if (!text.trim() || item.notes.length >= MAX_NOTES) return
    const question = nextQuestion(item.answers)
    const note: Note = { id: makeId(), at: new Date().toISOString(), kind, text: text.trim(), componentId, context: question ? `Recorded during: ${question.section}` : 'Recorded after intake; historical evidence, not a fresh recheck' }
    onChange({ ...item, notes: [...item.notes, note], updatedAt: note.at })
    setText(''); setSaved(true)
  }
  return <Modal title="Field notes & repair recheck" onClose={onClose} wide>
    <p className="muted">Your observations are evidence. Suggestions in the guide are hypotheses. Notes remain in history when intake answers change.</p>
    <form className="note-form" onSubmit={add}>
      <div className="form-row"><label>Type<select value={kind} onChange={e => setKind(e.target.value as Note['kind'])}><option value="observation">Observation</option><option value="measurement">Existing measurement</option><option value="repair">Repair history</option></select></label>
        <label>Related component<select value={componentId} onChange={e => setComponentId(e.target.value)}>{components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
      {kind === 'measurement' && <p className="inline-warning">Record only readings already obtained safely by a qualified person. Include value, units, location, switch mode, and conditions. This app prescribes no electrical tests; never measure continuity on a live circuit, bridge unknown terminals, or bypass protection.</p>}
      {kind === 'repair' && <p className="notice">Describe who did the work, what changed, and when. A replaced part is not a verified repair until the affected lights are rechecked.</p>}
      <label htmlFor="field-note">Note<textarea id="field-note" required maxLength={2000} rows={4} value={text} placeholder={kind === 'measurement' ? 'Reading, units, exact location, conditions, who measured…' : 'What did you actually see? Which lamps, side, and switch position?'} onChange={e => { setText(e.target.value); setSaved(false) }} /></label>
      <div className="form-footer"><span className="muted">{text.length}/2000 · {item.notes.length}/{MAX_NOTES} notes</span><button className="button primary" disabled={!text.trim() || item.notes.length >= MAX_NOTES}><Icon name="plus" />Save note</button></div>
      {item.notes.length >= MAX_NOTES && <p role="alert" className="error">This case has reached its note limit. Export it before deleting notes or starting another case.</p>}
      {saved && <p role="status" className="notice">Note added to this case.</p>}
    </form>
    <section className="verification"><span className="eyebrow">AFTER THE REPAIR</span><h3>Recheck the whole lighting picture.</h3><p>Only when safe, use normal controls with the car secured, stationary, and off the road. Compare with the documented behavior of the installed system. No roadworthiness certification is provided.</p>
      {!canVerify ? <p className="inline-warning">Complete the applicable, safe intake before recording a repair recheck.</p> : <>
        {complete && <p className="notice"><Icon name="check" />User-reported recheck complete. This is not an independent inspection or roadworthiness approval.</p>}
        {Object.entries(verificationLabels).map(([key, label]) => <label className="verification-row" key={key}><span>{label}</span><select aria-label={`Recheck ${label}`} value={item.verification[key as VerificationKey] ?? 'unknown'} onChange={e => onChange({ ...item, verification: { ...item.verification, [key]: e.target.value }, updatedAt: new Date().toISOString() })}><option value="unknown">Not verified</option><option value="pass">Observed working as documented</option><option value="fail">Still failing / uncertain behavior</option></select></label>)}
        <p className="muted footnote">Changing an intake answer invalidates these rechecks. Unresolved signal or brake-light failures mean the car should not be driven.</p>
      </>}
    </section>
    <section className="notes-history"><h3>Observation history <span className="badge subtle">{item.notes.length}</span></h3>
      {!item.notes.length && <p className="muted">No notes yet. Your case starts with what you observe—not a guessed diagnosis.</p>}
      {[...item.notes].reverse().map(note => <article className="saved-note" key={note.id}><header><span className={`badge ${note.kind}`}>{note.kind}</span><time dateTime={note.at}>{new Date(note.at).toLocaleString()}</time><button className="icon-button" aria-label="Delete note" onClick={() => setConfirmDelete(note.id)}><Icon name="close" size={15} /></button></header><strong>{getComponent(note.componentId).name}</strong><p>{note.text}</p><small>{note.context}</small>
        {confirmDelete === note.id && <div className="delete-confirm">Delete this historical note? <button className="button small danger" onClick={() => { onChange({ ...item, notes: item.notes.filter(n => n.id !== note.id), updatedAt: new Date().toISOString() }); setConfirmDelete(null) }}>Delete</button> <button className="button small secondary" onClick={() => setConfirmDelete(null)}>Keep</button></div>}
      </article>)}
    </section>
  </Modal>
}
