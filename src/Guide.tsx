import { useState } from 'react'
import { assess, answerLabel, nextQuestion, questionPath, type QuestionId } from './diagnostics'
import type { DiagnosticCase } from './cases'
import { getComponent } from './data'
import { Icon } from './ui'

export function Guide({ item, onAnswer, onEvidence, onEditFocus, onNotes, onTrace }: {
  item: DiagnosticCase
  onAnswer: (id: QuestionId, value: string) => void
  onEvidence: (id: string) => void
  onEditFocus: (id: string) => void
  onNotes: () => void
  onTrace: () => void
}) {
  const [editing, setEditing] = useState<QuestionId | null>(null)
  const [history, setHistory] = useState(false)
  const path = questionPath(item.answers)
  const next = nextQuestion(item.answers)
  const question = editing ? path.find(q => q.id === editing) ?? next : next
  const answered = path.filter(q => item.answers[q.id])
  const assessment = assess(item.answers)
  const index = question ? path.indexOf(question) : path.length
  function edit(id: QuestionId) {
    setEditing(id)
    const component = path.find(q => q.id === id)?.components[0]
    if (component) onEditFocus(component)
  }
  return <aside className="guide" id="diagnostic-guide" aria-label="Diagnostic guide">
    <div className="guide-title"><span className="guide-icon"><Icon name="bolt" /></span><div><span className="eyebrow">LET’S FIGURE IT OUT</span><h2>My blinkers aren’t working</h2></div><span className="badge">Guided</span></div>
    <div className="guide-intro"><span className="local-dot" />Deterministic guide · no AI or keys needed</div>
    <div className="guide-content">
      <button className="button secondary small guide-trace-entry" onClick={onTrace}><Icon name="circuit" size={16} />Trace power to a lamp</button>
      {question ? <section className="question-card" aria-label="Current diagnostic question">
        <div className="question-meta"><span>{question.section}</span><span>{answered.length} recorded</span></div>
        <div className="progress-track"><span style={{ width: `${Math.max(5, (answered.length / 16) * 100)}%` }} /></div>
        <h3>{question.title}</h3>
        <p className="question-help">{question.help}</p>
        {editing && <p className="edit-warning">Changing this answer clears later answers and repair rechecks. Field notes remain as history.</p>}
        <div className="answer-options">{question.options.map(option => <button className={item.answers[question.id] === option.value ? 'chosen' : ''} key={option.value} aria-pressed={item.answers[question.id] === option.value}
          onClick={() => {
            const unchanged = item.answers[question.id] === option.value
            onAnswer(question.id, option.value)
            setEditing(unchanged && editing ? path[index + 1]?.id ?? null : null)
          }}><span className="option-marker">{item.answers[question.id] === option.value ? <Icon name="check" size={13} /> : ''}</span>{option.label}<Icon name="chevron" size={14} /></button>)}</div>
        {!!question.components.length && <div className="step-evidence"><span className="eyebrow">ON THE DIAGRAM</span>{question.components.map(id => <button key={id} className="text-link" onClick={() => onEvidence(id)}><Icon name="focus" size={14} />{getComponent(id).shortName}<Icon name="arrow" size={13} /></button>)}</div>}
        <div className="question-footer"><button className="text-link" disabled={index === 0} onClick={() => edit(path[index - 1].id)}>← Back</button><button className="text-link" onClick={onNotes}><Icon name="note" size={14} />Add field note</button></div>
      </section> : <section className={`assessment-lead ${assessment.stopped ? 'stopped' : ''}`}><Icon name={assessment.stopped ? 'shield' : 'focus'} size={26} /><h3>{assessment.title}</h3><p>{assessment.summary}</p>
        {answered.length > 0 && <button className="button secondary small" onClick={() => edit(assessment.stopped ? path[path.length - 1].id : answered[answered.length - 1].id)}>Review / edit answers</button>}
      </section>}
      {!assessment.stopped && assessment.findings.length > 0 && <div className="findings"><span className="eyebrow">WHAT THE EVIDENCE SAYS</span>{assessment.findings.map(finding => <article className={`finding ${finding.kind}`} key={finding.title}>
        <span className="finding-label">{finding.kind === 'hypothesis' ? '? Possible area · not a diagnosis' : finding.kind === 'missing' ? '… Missing evidence' : '○ Your observation'}</span><h4>{finding.title}</h4><p>{finding.text}</p>
        <div className="finding-links">{finding.components.map(id => <button className="text-link" key={id} onClick={() => onEvidence(id)}>{getComponent(id).shortName} ↗</button>)}</div>
      </article>)}</div>}
      {!question && !assessment.stopped && <p className="inline-warning"><strong>No probing procedure is approved here.</strong> Take these observations and the matching manual to a qualified automotive electrician before electrical testing or part replacement.</p>}
      {answered.length > 0 && <section className="answer-history"><button className="disclosure" aria-expanded={history} onClick={() => setHistory(!history)}><Icon name="note" />Answer history <span>{answered.length}</span><Icon name="chevron" size={16} /></button>
        {history && <ol>{answered.map(q => <li key={q.id}><button onClick={() => edit(q.id)}><span>{q.title}</span><strong>{answerLabel(q.id, item.answers[q.id]!)}</strong><small>Edit answer</small></button></li>)}</ol>}
      </section>}
      <p className="guide-footnote">A factory diagram describes a design, not your car’s current condition. All source transcriptions await expert review.</p>
    </div>
  </aside>
}
