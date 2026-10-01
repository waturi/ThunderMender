import { describe, expect, it } from 'vitest'
import { exportCase, importCase, loadCases, newCase, saveCases, updateAnswer, validateCase } from './cases'
import { questionPath, questions } from './diagnostics'

function completeCase() {
  let item = newCase()
  for (const q of questions) {
    if (!questionPath(item.answers).some(p => p.id === q.id)) continue
    item = updateAnswer(item, q.id, q.id === 'safety' ? 'clear' : q.id === 'vehicle' ? 'confirmed' : 'unknown')
  }
  return item
}
describe('case persistence and portability', () => {
  it('saves and reloads answers, notes and verification', () => {
    const item = completeCase()
    item.notes.push({ id: 'note1', at: item.createdAt, kind: 'measurement', text: 'Prior reading, documented by electrician; conditions recorded.', componentId: 'turn-switch', context: 'Historical measurement' })
    item.verification = { left: 'pass', right: 'fail', brakes: 'unknown' }
    let saved = ''
    saveCases({ activeId: item.id, cases: [item] }, { setItem: (_key, value) => { saved = value } })
    expect(loadCases({ getItem: () => saved }).cases[0]).toEqual(item)
  })
  it('exports and imports as an independent copy without manual blobs', () => {
    const item = completeCase()
    const contents = exportCase(item)
    const imported = importCase(contents)
    expect(imported.id).not.toBe(item.id)
    expect(imported.answers).toEqual(item.answers)
    expect(contents).not.toContain('blob')
  })
  it('invalidates rechecks but retains historical notes on edited intake', () => {
    const item = completeCase()
    item.verification = { left: 'pass', right: 'pass', brakes: 'pass', hazards: 'pass' }
    item.notes.push({ id: 'n1', at: item.createdAt, text: 'Old observation', kind: 'observation', componentId: 'rear-left', context: 'Earlier intake' })
    const changed = updateAnswer(item, 'side', 'left')
    expect(changed.verification).toEqual({})
    expect(changed.notes).toEqual(item.notes)
    expect(changed.answers.frontLeft).toBeUndefined()
  })
  it.each(['not-json', '{}', '[]', '{"schemaVersion":99}', '{"__proto__":{"polluted":true}}'])('rejects malformed envelope %s', contents => {
    expect(() => importCase(contents)).toThrow()
  })
  it('rejects wrong source dataset, extra fields and large input', () => {
    const envelope = JSON.parse(exportCase(newCase()))
    expect(() => importCase(JSON.stringify({ ...envelope, datasetId: 'invented' }))).toThrow()
    expect(() => importCase(JSON.stringify({ ...envelope, html: '<script>alert(1)</script>' }))).toThrow()
    expect(() => importCase('x'.repeat(2_000_001))).toThrow()
  })
  it('rejects forged conclusions, stale answers, invalid source links and timestamps', () => {
    const item = completeCase()
    expect(() => validateCase({ ...item, diagnosis: 'failed motor' })).toThrow()
    expect(() => validateCase({ ...item, answers: { ...item.answers, safety: 'danger' } })).toThrow()
    expect(() => validateCase({ ...item, answers: { safety: 'clear', frontLeft: 'dark' } })).toThrow()
    expect(() => validateCase({ ...item, answers: { ...item.answers, rearLeftCount: 'one' } })).toThrow()
    expect(() => validateCase({ ...item, createdAt: '2026-02-30T00:00:00.000Z' })).toThrow()
    expect(() => validateCase({ ...item, notes: [{ id: 'n1', at: item.createdAt, text: 'hi', kind: 'observation', componentId: 'evil-source', context: 'now' }] })).toThrow()
    expect(() => validateCase({ ...newCase(), verification: { left: 'pass' } })).toThrow()
  })
  it('keeps user-entered markup as plain text data', () => {
    const item = completeCase()
    item.notes.push({ id: 'n1', at: item.createdAt, text: '<img src=x onerror=alert(1)>', kind: 'observation', componentId: 'rear-left', context: 'Historical' })
    expect(importCase(exportCase(item)).notes[0].text).toBe('<img src=x onerror=alert(1)>')
  })
  it('does not silently replace corrupt saved data or hide storage failures', () => {
    expect(() => loadCases({ getItem: () => 'broken' })).toThrow(/not been overwritten/)
    expect(() => loadCases({ getItem: () => '{"schemaVersion":1,"activeId":"x","cases":[]}' })).toThrow()
    const item = newCase()
    expect(() => saveCases({ activeId: item.id, cases: [item] }, { setItem: () => { throw new Error('quota') } })).toThrow('quota')
  })
})
