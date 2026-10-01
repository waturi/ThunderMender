import { describe, expect, it } from 'vitest'
import { exportCase, importCase, loadCases, newCase, saveCases, updateAnswer } from './cases'
import { getPage } from './data'
import { addTraceReport, invalidateTrace, latestReports, newTrace, routeStatus, setControl, setEndpoint, stepStatus, symptomText, traceAssessment, undoTraceReport, validateTrace, type TraceDraft } from './trace'
import { endpoints, getEndpoint, traceSteps, TRACE_REVISION } from './trace-data'

function configuredCase() {
  let item = newCase()
  for (const [id, value] of [['safety', 'clear'], ['vehicle', 'confirmed'], ['trim', 'standard'], ['configuration', 'factory'], ['side', 'left'], ['frontLeft', 'dark']] as const) item = updateAnswer(item, id, value)
  let trace = setEndpoint(item.trace, 'front-left')
  trace = setControl(trace, 'ignition', 'on')
  trace = setControl(trace, 'turn', 'left')
  trace = setControl(trace, 'brake', 'released')
  trace = setControl(trace, 'hazards', 'off')
  return { ...item, trace }
}
const present: TraceDraft = { kind: 'present', note: 'Prior observation reported by electrician; not independently verified.', reading: '', units: '', reference: '', load: '' }
const measured: TraceDraft = { kind: 'measurement', note: 'Historical meter report, not a new test.', reading: ' 12.1–12.6 ', units: 'V DC', reference: 'Prior reported reference: unknown', load: 'Disconnected, no load; prior observation' }

describe('source-backed endpoint paths', () => {
  it.each(endpoints)('keeps $id output and load identity distinct', endpoint => {
    const route = traceSteps(endpoint.id)
    expect(route.map(s => s.id)).toContain(`output-${endpoint.circuit}`)
    expect(route.find(s => s.kind === 'load')?.id).toBe(`lamp-${endpoint.id}`)
    expect(route.filter(s => s.kind === 'load')).toHaveLength(1)
    const output = route.find(s => s.id.startsWith('output-'))!
    expect(output.wire).toBe(endpoint.circuit)
    expect(output.citations[0].pageId).toBe('exterior-schematic')
    expect(route.find(s => s.id === 'feed-connector')?.wire).toBe('459')
    expect(route.find(s => s.id === 'motor-feed')?.wire).toBe('459')
    expect(route.find(s => s.id === 'motor-feed')?.link).toBe('continuation')
    expect(new Set(route.map(s => s.id)).size).toBe(route.length)
  })
  it('transcribes front 448 joins separately from six rear outputs', () => {
    expect(traceSteps('front-left').map(s => s.id)).toContain('harness-448')
    for (const e of endpoints.filter(e => e.position === 'rear')) {
      expect(traceSteps(e.id).some(s => s.id.startsWith('harness-'))).toBe(false)
      expect(traceSteps(e.id).find(s => s.kind === 'return')?.wire).toContain('not 14-series')
    }
    expect(new Set(endpoints.filter(e => e.position === 'rear').map(e => e.y)).size).toBe(6)
  })
  it('never completes battery, state-dependent or return gaps', () => {
    for (const endpoint of endpoints) {
      const route = traceSteps(endpoint.id)
      expect(route[0].id).toBe('supply-gap')
      expect(route.at(-1)?.id).toBe('return-gap')
      expect(route.find(s => s.id === 'motor-contacts')?.link).toBe('state-gap')
      expect(route.find(s => s.id === 'relay-contacts')?.link).toBe('state-gap')
      expect(route[1].link).toBe('source-gap')
      expect(route.filter(s => s.kind === 'gap').flatMap(s => s.lines)).toEqual([])
      expect(route.some(s => s.title === 'Battery' && s.link === 'drawn')).toBe(false)
    }
  })
  it('does not silently repair the printed right-front 449 / 499 discrepancy', () => {
    const route = traceSteps('front-right')
    expect(route.find(s => s.id === 'right-front-number-gap')?.kind).toBe('gap')
    expect(route.find(s => s.kind === 'load')?.link).toBe('source-gap')
    expect(route.find(s => s.kind === 'load')?.wire).toContain('499')
    expect(route.find(s => s.kind === 'load')?.lines).toEqual([])
    expect(traceSteps('front-left').some(s => s.id === 'right-front-number-gap')).toBe(false)
  })
  it('gives every point a bounded citation on the exact identified source; lines never use location drawings', () => {
    for (const endpoint of endpoints) for (const step of traceSteps(endpoint.id)) {
      expect(step.citations.length).toBeGreaterThan(0)
      for (const cite of step.citations) {
        expect(getPage(cite.pageId).kind).toBe('Schematic')
        expect(getPage(cite.pageId).sha256).toMatch(/^[a-f0-9]{64}$/)
        const { x, y, w, h } = cite.region
        expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0)
        expect(w).toBeGreaterThan(0); expect(h).toBeGreaterThan(0)
        expect(x + w).toBeLessThanOrEqual(1); expect(y + h).toBeLessThanOrEqual(1)
      }
      for (const line of step.lines) {
        expect(getPage(line.pageId).filename).toBe('Scan 6.jpeg')
        expect(step.citations.some(c => c.pageId === line.pageId)).toBe(true)
        expect(line.points.length).toBeGreaterThan(1)
        for (const point of line.points) for (const coordinate of point) {
          expect(coordinate).toBeGreaterThan(0); expect(coordinate).toBeLessThan(1)
        }
      }
    }
    expect(() => getEndpoint('imaginary')).toThrow()
  })
})

describe('conditions and evidence interpretation', () => {
  it('never claims an expected-active route even for selected-turn conditions', () => {
    const { trace, answers } = configuredCase()
    expect(routeStatus(trace, answers).status).toContain('contacts unresolved')
    expect(routeStatus(trace, answers).detail).toContain('Actual energization is unknown')
    expect(routeStatus(setControl(trace, 'turn', 'unknown'), answers).status).toContain('unconfirmed')
    for (const conditions of [
      setControl(trace, 'turn', 'right'), setControl(trace, 'brake', 'applied'),
      setControl(trace, 'hazards', 'on'), setControl(trace, 'ignition', 'off'),
    ]) expect(routeStatus(conditions, answers).applicable).toBe(false)
  })
  it.each(['unknown', 'modified'])('keeps %s configuration reference-only', value => {
    const item = updateAnswer(configuredCase(), 'configuration', value)
    expect(routeStatus(item.trace, item.answers).status).toBe('Factory reference only')
  })
  it('stops at safety or vehicle mismatch and does not adopt an individual rear symptom from a bank', () => {
    const item = configuredCase()
    expect(routeStatus(item.trace, { safety: 'danger' }).status).toContain('Stopped')
    expect(routeStatus(item.trace, { safety: 'clear', vehicle: 'mismatch' }).applicable).toBe(false)
    expect(symptomText(item.trace, item.answers)).toContain('Does not light')
    expect(symptomText(setEndpoint(item.trace, 'rear-left-442'), { ...item.answers, rearLeft: 'partial' })).toContain('does not identify this individual bulb')
  })
  it('bounds a candidate review interval only from explicit responding / absent reports', () => {
    const item = configuredCase()
    let trace = addTraceReport(item.trace, item.answers, present, 'r1', item.createdAt)
    trace = { ...trace, selectedStepId: 'lamp-front-left' }
    trace = addTraceReport(trace, item.answers, { ...present, kind: 'absent', note: 'Lamp reported dark during the recorded turn condition.' }, 'r2', item.createdAt)
    expect(traceAssessment(trace, item.answers)).toContain('Known boundary: circuit 459 → Left front')
    expect(traceAssessment(trace, item.answers)).toContain('load/return')
    expect(stepStatus(traceSteps('front-left')[1], latestReports(trace, item.answers).get('feed-459'))).toBe('Reported responding / present')
    expect(traceAssessment(trace, { ...item.answers, configuration: 'unknown' })).not.toContain('Candidate review interval')
  })
  it('preserves raw readings without converting voltage into good / bad evidence', () => {
    const item = configuredCase()
    const trace = addTraceReport(item.trace, item.answers, measured, 'r1', item.createdAt)
    expect(trace.reports[0].reading).toBe(' 12.1–12.6 ')
    expect(traceAssessment(trace, item.answers)).toContain('unloaded voltage')
    expect(traceAssessment(trace, item.answers)).not.toContain('Candidate review interval')
  })
})

describe('persistent trace contexts and strict handoffs', () => {
  it('round-trips source-linked reports, conditions and raw readings through disk and portable handoff', () => {
    const item = configuredCase()
    item.trace = addTraceReport(item.trace, item.answers, measured, 'r1', item.createdAt)
    let disk = ''
    saveCases({ activeId: item.id, cases: [item] }, { setItem: (_key, value) => { disk = value } })
    expect(loadCases({ getItem: () => disk }).cases[0]).toEqual(item)
    expect(importCase(exportCase(item)).trace).toEqual(item.trace)
    expect(JSON.parse(exportCase(item)).case.trace.revision).toBe(TRACE_REVISION)
  })
  it('loads old schema-v1 cases without trace data', () => {
    const old = JSON.parse(exportCase(newCase()))
    delete old.case.trace
    expect(importCase(JSON.stringify(old)).trace).toEqual(newTrace())
  })
  it('separates endpoint, controls, intake and reset contexts without losing or reviving raw reports', () => {
    const item = configuredCase()
    item.trace = addTraceReport(item.trace, item.answers, measured, 'r1', item.createdAt)
    const cases = [
      setEndpoint(item.trace, 'rear-left-442'),
      setControl(item.trace, 'brake', 'applied'),
      invalidateTrace(item.trace),
      updateAnswer(item, 'frontLeft', 'flashes').trace,
    ]
    for (const changed of cases) {
      expect(changed.reports).toEqual(item.trace.reports)
      expect(latestReports(changed, item.answers).size).toBe(0)
    }
    expect(latestReports(setEndpoint(cases[0], 'front-left'), item.answers).size).toBe(0)
    expect(latestReports(setControl(cases[1], 'brake', 'released'), item.answers).size).toBe(0)
    expect(updateAnswer(item, 'frontLeft', 'dark')).toBe(item)
  })
  it('edits append replacements and undo withdraws them without deleting history', () => {
    const item = configuredCase()
    let trace = addTraceReport(item.trace, item.answers, present, 'r1', item.createdAt)
    trace = addTraceReport(trace, item.answers, { ...present, kind: 'unknown' }, 'r2', item.createdAt)
    expect(latestReports(trace, item.answers).get('feed-459')?.kind).toBe('unknown')
    trace = undoTraceReport(trace, item.answers)
    expect(trace.reports).toHaveLength(2)
    expect(trace.withdrawn).toEqual(['r2'])
    expect(latestReports(trace, item.answers).get('feed-459')?.kind).toBe('present')
  })
  it('rejects invented source points, state conclusions, malformed measurements and stale current contexts', () => {
    const item = configuredCase()
    const trace = addTraceReport(item.trace, item.answers, measured, 'r1', item.createdAt)
    const report = trace.reports[0]
    for (const bad of [
      { ...trace, revision: 'unknown' }, { ...trace, epoch: -1 }, { ...trace, epoch: 0.5 },
      { ...trace, endpointId: 'battery-direct' }, { ...trace, selectedStepId: 'evil' },
      { ...trace, diagnosis: 'motor failed' }, { ...trace, conditions: { ...trace.conditions, ignition: 'maybe' } },
      { ...trace, reports: [report, report] }, { ...trace, withdrawn: ['nonexistent'] },
      ...[{ stepId: 'supply-gap' }, { units: '' }, { reading: 12 }, { load: '' }, { reference: '' }, { note: 'x'.repeat(2001) }, { epoch: 999 }, { kind: 'verified-good' }, { endpointId: 'front-right' }, { intake: { safety: 'clear', side: 'left' } }, { at: 'yesterday' }, { sourceUrl: 'https://evil.invalid' }].map(change => ({ ...trace, reports: [{ ...report, ...change }] })),
    ]) expect(() => validateTrace(bad, item.answers)).toThrow(/Invalid case data/)
    expect(() => addTraceReport({ ...trace, selectedStepId: 'return-gap' }, item.answers, present, 'r2', item.createdAt)).toThrow(/not a test point/)
  })
})
