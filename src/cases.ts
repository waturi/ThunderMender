import { DATASET_ID, components } from './data'
import { answerQuestion, questionPath, type Answers, type QuestionId } from './diagnostics'
import { invalidateTrace, newTrace, validateTrace, type TraceState } from './trace'
import { date, fields, id, invalid, record, text, validateAnswers } from './validation'

export interface Note {
  id: string
  at: string
  kind: 'observation' | 'measurement' | 'repair'
  text: string
  componentId: string
  context: string
}
export type VerificationKey = 'left' | 'right' | 'brakes' | 'hazards'
export type Verification = Partial<Record<VerificationKey, 'pass' | 'fail' | 'unknown'>>
export interface DiagnosticCase {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  answers: Answers
  notes: Note[]
  verification: Verification
  trace: TraceState
}
export interface CaseStore { activeId: string; cases: DiagnosticCase[] }
export const STORAGE_KEY = 'thundermender.cases.v1'
export const MAX_CASES = 40
export const MAX_NOTES = 200
export const MAX_IMPORT_BYTES = 2_000_000

export function makeId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('')
}
export function newCase(): DiagnosticCase {
  const now = new Date().toISOString()
  return { id: makeId(), title: 'My blinkers aren’t working', createdAt: now, updatedAt: now, answers: {}, notes: [], verification: {}, trace: newTrace() }
}
export function updateAnswer(item: DiagnosticCase, id: QuestionId, value: string): DiagnosticCase {
  const answers = answerQuestion(item.answers, id, value)
  return answers === item.answers ? item : { ...item, answers, verification: {}, trace: invalidateTrace(item.trace), updatedAt: new Date().toISOString() }
}
export function validateCase(value: unknown): DiagnosticCase {
  const v = record(value)
  fields(v, ['id', 'title', 'createdAt', 'updatedAt', 'answers', 'notes', 'verification', 'trace'])
  const answers = validateAnswers(v.answers)
  if (!Array.isArray(v.notes) || v.notes.length > MAX_NOTES) invalid('note count')
  const notes: Note[] = (v.notes as unknown[]).map(item => {
    const n = record(item)
    fields(n, ['id', 'at', 'kind', 'text', 'componentId', 'context'])
    if (!['observation', 'measurement', 'repair'].includes(String(n.kind))) return invalid('note kind')
    const componentId = text(n.componentId, 80, 'component')
    if (!components.some(c => c.id === componentId)) invalid('unknown source component')
    return { id: id(n.id), at: date(n.at), kind: n.kind as Note['kind'], text: text(n.text, 2000, 'note length'), componentId, context: text(n.context, 200, 'note context') }
  })
  if (new Set(notes.map(n => n.id)).size !== notes.length) invalid('duplicate notes')
  const rawVerification = record(v.verification)
  fields(rawVerification, ['left', 'right', 'brakes', 'hazards'])
  const verification: Verification = {}
  for (const key of ['left', 'right', 'brakes', 'hazards'] as const) {
    const state = rawVerification[key]
    if (state === undefined) continue
    if (state !== 'pass' && state !== 'fail' && state !== 'unknown') return invalid('verification state')
    verification[key] = state
  }
  if (Object.keys(verification).length && (answers.safety !== 'clear' || answers.vehicle !== 'confirmed' || questionPath(answers).some(q => !answers[q.id]))) invalid('premature verification')
  const createdAt = date(v.createdAt)
  const updatedAt = date(v.updatedAt)
  if (updatedAt < createdAt) invalid('case chronology')
  return { id: id(v.id), title: text(v.title, 100, 'title'), createdAt, updatedAt, answers, notes, verification, trace: validateTrace(v.trace, answers) }
}
export function exportCase(item: DiagnosticCase): string {
  return JSON.stringify({ schemaVersion: 1, datasetId: DATASET_ID, case: validateCase(item) }, null, 2)
}
export function importCase(contents: string): DiagnosticCase {
  if (new TextEncoder().encode(contents).byteLength > MAX_IMPORT_BYTES) return invalid('file is larger than 2 MB')
  let parsed: unknown
  try { parsed = JSON.parse(contents) } catch { return invalid('not valid JSON') }
  const envelope = record(parsed)
  fields(envelope, ['schemaVersion', 'datasetId', 'case'])
  if (envelope.schemaVersion !== 1 || envelope.datasetId !== DATASET_ID) invalid('unsupported version or source dataset')
  const item = validateCase(envelope.case)
  // Imported handoffs are copies, never silent overwrites of a newer local case.
  return { ...item, id: makeId(), title: `${item.title.slice(0, 89)} (imported)`, updatedAt: new Date().toISOString() > item.updatedAt ? new Date().toISOString() : item.updatedAt }
}
export function loadCases(storage: Pick<Storage, 'getItem'> = localStorage): CaseStore {
  const contents = storage.getItem(STORAGE_KEY)
  if (contents === null) {
    const item = newCase()
    return { activeId: item.id, cases: [item] }
  }
  let parsed: unknown
  try { parsed = JSON.parse(contents) } catch { throw new Error('Saved cases could not be read. Your saved data has not been overwritten. Download a recovery copy or explicitly start fresh.') }
  const raw = record(parsed)
  fields(raw, ['schemaVersion', 'activeId', 'cases'])
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.cases) || raw.cases.length < 1 || raw.cases.length > MAX_CASES) invalid('saved collection')
  const cases = (raw.cases as unknown[]).map(validateCase)
  if (new Set(cases.map(c => c.id)).size !== cases.length || !cases.some(c => c.id === raw.activeId)) invalid('saved case identity')
  return { activeId: String(raw.activeId), cases }
}
export function saveCases(store: CaseStore, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, ...store }))
}
