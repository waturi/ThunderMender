import { answerLabel, questions, type Answers } from './diagnostics'
import { endpoints, getEndpoint, traceSteps, TRACE_REVISION, type TraceStep } from './trace-data'
import { date, fields, id, invalid, record, text, validateAnswers } from './validation'

export const controls = {
  ignition: ['unknown', 'off', 'on'],
  turn: ['unknown', 'off', 'left', 'right'],
  brake: ['unknown', 'released', 'applied'],
  hazards: ['unknown', 'off', 'on'],
} as const
export type ControlState = { [K in keyof typeof controls]: (typeof controls)[K][number] }
export const reportKinds = ['present', 'absent', 'measurement', 'unknown'] as const
export type ReportKind = typeof reportKinds[number]
export const reportLabels: Record<ReportKind, string> = {
  present: 'Reported responding / present',
  absent: 'Reported not responding / absent',
  measurement: 'Reported measured · not interpreted',
  unknown: 'Unknown / not checked',
}
export const MAX_TRACE_REPORTS = 200
export interface TraceReport {
  id: string
  at: string
  epoch: number
  endpointId: string
  stepId: string
  kind: ReportKind
  note: string
  reading: string
  units: string
  reference: string
  load: string
  conditions: ControlState
  intake: Answers
}
export type TraceDraft = Pick<TraceReport, 'kind' | 'note' | 'reading' | 'units' | 'reference' | 'load'>
export interface TraceState {
  revision: typeof TRACE_REVISION
  endpointId: string | null
  selectedStepId: string | null
  epoch: number
  conditions: ControlState
  reports: TraceReport[]
  withdrawn: string[]
}
export function newTrace(): TraceState {
  return { revision: TRACE_REVISION, endpointId: null, selectedStepId: null, epoch: 0, conditions: { ignition: 'unknown', turn: 'unknown', brake: 'unknown', hazards: 'unknown' }, reports: [], withdrawn: [] }
}
export function invalidateTrace(trace: TraceState): TraceState {
  return { ...trace, epoch: trace.epoch + 1 }
}
export function setEndpoint(trace: TraceState, endpointId: string): TraceState {
  getEndpoint(endpointId)
  return trace.endpointId === endpointId ? trace : { ...invalidateTrace(trace), endpointId, selectedStepId: 'feed-459' }
}
export function setControl<K extends keyof ControlState>(trace: TraceState, key: K, value: ControlState[K]): TraceState {
  if (!(controls[key] as readonly string[]).includes(value)) throw new Error('Unsupported trace condition.')
  return trace.conditions[key] === value ? trace : { ...invalidateTrace(trace), conditions: { ...trace.conditions, [key]: value } }
}
function intakeKey(answers: Answers) { return questions.map(q => `${q.id}:${answers[q.id] ?? ''}`).join('|') }
function sameControls(a: ControlState, b: ControlState) { return Object.keys(controls).every(key => a[key as keyof ControlState] === b[key as keyof ControlState]) }
export function activeReports(trace: TraceState, answers: Answers): TraceReport[] {
  return trace.reports.filter(r => r.epoch === trace.epoch && r.endpointId === trace.endpointId && sameControls(r.conditions, trace.conditions) && intakeKey(r.intake) === intakeKey(answers) && !trace.withdrawn.includes(r.id))
}
export function latestReports(trace: TraceState, answers: Answers): Map<string, TraceReport> {
  return new Map(activeReports(trace, answers).map(r => [r.stepId, r]))
}
export function addTraceReport(trace: TraceState, answers: Answers, draft: TraceDraft, reportId: string, at: string): TraceState {
  if (!trace.endpointId || !trace.selectedStepId) throw new Error('Choose a lamp and trace point first.')
  if (trace.reports.length >= MAX_TRACE_REPORTS) throw new Error('This case has 200 trace reports. Export it and start a new case to retain your history.')
  const step = traceSteps(trace.endpointId).find(s => s.id === trace.selectedStepId)
  if (!step || step.kind === 'gap') throw new Error('A source gap is not a test point. Select a documented connection.')
  const next = { ...trace, reports: [...trace.reports, { ...draft, id: reportId, at, epoch: trace.epoch, endpointId: trace.endpointId, stepId: trace.selectedStepId, conditions: { ...trace.conditions }, intake: { ...answers } }] }
  return validateTrace(next, answers)
}
export function undoTraceReport(trace: TraceState, answers: Answers): TraceState {
  const last = activeReports(trace, answers).at(-1)
  return last ? { ...trace, withdrawn: [...trace.withdrawn, last.id] } : trace
}
export function routeStatus(trace: TraceState, answers: Answers): { status: string; detail: string; applicable: boolean } {
  if (answers.safety !== 'clear') return { status: 'Stopped / safety unconfirmed', detail: 'Do not energize the wiring. Record existing information only; establish safety in the guide.', applicable: false }
  if (answers.vehicle !== 'confirmed' || answers.configuration !== 'factory') return { status: 'Factory reference only', detail: 'Confirm the 1967 Cougar and installed factory mechanism in the guide. Modified or unknown wiring cannot inherit this factory route.', applicable: false }
  if (!trace.endpointId) return { status: 'Choose a lamp', detail: 'No side or failing lamp is assumed.', applicable: false }
  const e = getEndpoint(trace.endpointId)
  const c = trace.conditions
  if (Object.values(c).includes('unknown')) return { status: 'Control conditions unconfirmed', detail: 'Use settings that describe the existing observation, not instructions to energize the car. Motor phase remains unknown even after these settings are recorded.', applicable: false }
  if (c.turn !== e.side || c.ignition !== 'on' || c.brake !== 'released' || c.hazards !== 'off') return { status: 'Mixed / different operating condition', detail: 'These settings are not the selected-side, ignition-on, brake-released, hazards-off comparison. Brake and hazard behavior cannot be substituted for turn operation; no active route is claimed.', applicable: false }
  return { status: 'Requested turn state · contacts unresolved', detail: 'Expected intent: the selected lamp signals a turn. Actual energization is unknown. Motor phase, relay contacts, supply and return gaps prevent an expected-active electrical path claim.', applicable: true }
}
export function symptomText(trace: TraceState, answers: Answers): string {
  if (!trace.endpointId) return 'Choose the actual affected lamp; no symptom is assumed.'
  const e = getEndpoint(trace.endpointId)
  const key = e.position === 'front' ? e.side === 'left' ? 'frontLeft' : 'frontRight' : e.side === 'left' ? 'rearLeft' : 'rearRight'
  const value = answers[key]
  return value ? `Guide reports ${e.position === 'rear' ? 'this rear bank' : 'this lamp'}: ${answerLabel(key, value)}.${e.position === 'rear' ? ' A bank observation does not identify this individual bulb or prove its feed.' : ''}` : 'No matching lamp observation is recorded in the guide.'
}
export function traceAssessment(trace: TraceState, answers: Answers): string {
  if (!trace.endpointId) return 'Select an endpoint to relate your reports to the documented connections.'
  const state = routeStatus(trace, answers)
  if (!state.applicable) return `${state.status}: reports remain visible, but no comparable fault interval is inferred. ${state.detail}`
  const steps = traceSteps(trace.endpointId)
  const latest = latestReports(trace, answers)
  const absentIndex = steps.findIndex(step => latest.get(step.id)?.kind === 'absent')
  const prior = steps.slice(0, absentIndex).findLast(step => latest.get(step.id)?.kind === 'present')
  if (absentIndex >= 0) {
    const end = steps[absentIndex]
    return prior
      ? `Candidate review interval: ${prior.title} → ${end.title}, between your latest responding and non-responding reports. These are user reports, not verified continuity or a measured fault boundary. Sequence phase and timing comparability are unknown. Include intervening connectors, contact-state gaps and the load/return; neither a failed part nor a cleared upstream path is established.`
      : `Reported absence at ${end.title}. No preceding responding point bounds this interval. Supply, switching, connection, load and return remain unresolved; absence alone does not identify a failed part.`
  }
  if ([...latest.values()].some(r => r.kind === 'measurement')) return 'Existing readings are preserved without a pass/fail threshold. An unloaded voltage reading does not prove usable current, continuity under load, or a failed component.'
  return 'No report-bounded interval yet. A lamp or point responding in one observation does not clear the entire upstream route, other branches, or intermittent faults.'
}
export function stepStatus(step: TraceStep, report?: TraceReport): string {
  if (step.kind === 'gap') return 'Source uncertain · connection not established'
  return report ? reportLabels[report.kind] : step.link === 'state-gap' ? 'Source uncertain · contact state unknown' : 'Unknown · untested'
}
function validateControls(value: unknown): ControlState {
  const v = record(value)
  fields(v, Object.keys(controls))
  for (const key of Object.keys(controls) as (keyof ControlState)[]) if (!(controls[key] as readonly unknown[]).includes(v[key])) invalid('trace control state')
  return v as ControlState
}
function epoch(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000) return invalid('trace context revision')
  return value
}
function rawText(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) return invalid('trace text length')
  return value
}
export function validateTrace(value: unknown, answers: Answers): TraceState {
  if (value === undefined) return newTrace()
  const v = record(value)
  fields(v, ['revision', 'endpointId', 'selectedStepId', 'epoch', 'conditions', 'reports', 'withdrawn'])
  if (v.revision !== TRACE_REVISION) invalid('unsupported trace dataset')
  const endpointId = v.endpointId === null ? null : text(v.endpointId, 80, 'trace endpoint')
  if (endpointId !== null && !endpoints.some(e => e.id === endpointId)) invalid('unknown trace endpoint')
  const selectedStepId = v.selectedStepId === null ? null : text(v.selectedStepId, 80, 'trace step')
  if (selectedStepId !== null && (!endpointId || !traceSteps(endpointId).some(s => s.id === selectedStepId))) invalid('trace step identity')
  const currentEpoch = epoch(v.epoch)
  const conditions = validateControls(v.conditions)
  if (!Array.isArray(v.reports) || v.reports.length > MAX_TRACE_REPORTS) invalid('trace report count')
  const reports: TraceReport[] = (v.reports as unknown[]).map(value => {
    const r = record(value)
    fields(r, ['id', 'at', 'epoch', 'endpointId', 'stepId', 'kind', 'note', 'reading', 'units', 'reference', 'load', 'conditions', 'intake'])
    const reportEndpoint = text(r.endpointId, 80, 'report endpoint')
    if (!endpoints.some(e => e.id === reportEndpoint)) invalid('report endpoint identity')
    const stepId = text(r.stepId, 80, 'report step')
    if (!traceSteps(reportEndpoint).some(s => s.id === stepId && s.kind !== 'gap')) invalid('report source point identity')
    if (!(reportKinds as readonly unknown[]).includes(r.kind)) invalid('trace report kind')
    const reportEpoch = epoch(r.epoch)
    if (reportEpoch > currentEpoch) invalid('future trace context')
    const report: TraceReport = {
      id: id(r.id), at: date(r.at), epoch: reportEpoch, endpointId: reportEndpoint, stepId, kind: r.kind as ReportKind,
      note: rawText(r.note, 2000), reading: rawText(r.reading, 100), units: rawText(r.units, 40), reference: rawText(r.reference, 300), load: rawText(r.load, 300),
      conditions: validateControls(r.conditions), intake: validateAnswers(r.intake),
    }
    if (report.kind === 'measurement' && [report.reading, report.units, report.reference, report.load].some(v => !v.trim())) invalid('measurement needs raw reading, units, reference and load context (unknown may be stated)')
    if (report.kind !== 'unknown' && !report.note.trim()) invalid('trace report needs an observation description')
    if (reportEpoch === currentEpoch && (reportEndpoint !== endpointId || !sameControls(report.conditions, conditions) || intakeKey(report.intake) !== intakeKey(answers))) invalid('stale active trace context')
    return report
  })
  if (new Set(reports.map(r => r.id)).size !== reports.length) invalid('duplicate trace reports')
  if (!Array.isArray(v.withdrawn) || v.withdrawn.length > reports.length || v.withdrawn.some(x => typeof x !== 'string' || !reports.some(r => r.id === x)) || new Set(v.withdrawn).size !== v.withdrawn.length) invalid('withdrawn report identity')
  return { revision: TRACE_REVISION, endpointId, selectedStepId, epoch: currentEpoch, conditions, reports, withdrawn: v.withdrawn as string[] }
}
