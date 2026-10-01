import { describe, expect, it } from 'vitest'
import { answerQuestion, assess, nextQuestion, questionPath, questions, type Answers } from './diagnostics'

function intake(overrides: Answers = {}): Answers {
  let a: Answers = {}
  for (const q of questions) {
    if (!questionPath(a).some(item => item.id === q.id)) continue
    a = answerQuestion(a, q.id, overrides[q.id] ?? ({ safety: 'clear', vehicle: 'confirmed', trim: 'unknown', configuration: 'factory', side: 'both', frontLeft: 'flashes', frontRight: 'flashes', rearLeft: 'sequence', rearRight: 'sequence', brakes: 'all', hazards: 'all', checked: 'none' } as Answers)[q.id] ?? 'unknown')
  }
  return a
}

describe('one-question-at-a-time intake', () => {
  it('starts with safety, not assumed symptoms', () => {
    expect(nextQuestion({})?.id).toBe('safety')
    expect(() => answerQuestion({}, 'side', 'left')).toThrow()
  })
  it.each(['danger', 'unknown'])('stops when safety is %s', safety => {
    const a = intake({ safety })
    expect(Object.keys(a)).toEqual(['safety'])
    expect(nextQuestion(a)).toBeUndefined()
    expect(assess(a).stopped).toBe(true)
    expect(assess(a).findings.some(f => f.kind === 'hypothesis')).toBe(false)
  })
  it.each(['mismatch', 'unknown'])('pauses for vehicle %s', vehicle => {
    const a = intake({ vehicle })
    expect(Object.keys(a)).toEqual(['safety', 'vehicle'])
    expect(assess(a).title).toContain('right vehicle')
    expect(assess(a).stopped).toBe(true)
  })
  it('branches into individual rear-lamp detail only when relevant', () => {
    const a = intake({ rearLeft: 'partial', rearLeftCount: 'two' })
    expect(a.rearLeftCount).toBe('two')
    expect(a.rearRightCount).toBeUndefined()
    expect(assess(a).findings.some(f => f.title.includes('Left rear: separate'))).toBe(true)
  })
  it('invalidates all downstream answers when an earlier answer changes', () => {
    const a = intake()
    const changed = answerQuestion(a, 'configuration', 'modified')
    expect(Object.keys(changed)).toEqual(['safety', 'vehicle', 'trim', 'configuration'])
    expect(nextQuestion(changed)?.id).toBe('side')
    expect(assess(changed).findings.every(f => f.kind !== 'hypothesis')).toBe(true)
  })
  it('preserves downstream answers when an answer has not changed', () => {
    const a = intake()
    expect(answerQuestion(a, 'side', 'both')).toBe(a)
  })
  it('rejects unexpected values and skipped questions', () => {
    expect(() => answerQuestion({}, 'safety', 'probably')).toThrow()
    expect(() => answerQuestion({ safety: 'clear', vehicle: 'confirmed' }, 'hazards', 'all')).toThrow()
  })
})

describe('defensible observation-led triage', () => {
  it.each(['modified', 'unknown'])('avoids factory diagnosis for %s mechanisms', configuration => {
    const result = assess(intake({ configuration, rearLeft: 'dark', rearRight: 'together' }))
    expect(result.findings.some(f => f.kind === 'missing' && /documentation|mechanism/.test(f.title))).toBe(true)
    const hypotheses = result.findings.filter(f => f.kind === 'hypothesis')
    expect(hypotheses.every(f => !f.components.includes('sequence-motor'))).toBe(true)
  })
  it.each(['left', 'right', 'both', 'intermittent', 'unknown'])('records each side independently for %s intake', side => {
    const a = intake({ side })
    expect(a.frontLeft).toBeDefined()
    expect(a.frontRight).toBeDefined()
    expect(a.rearLeft).toBeDefined()
    expect(a.rearRight).toBeDefined()
  })
  it('keeps broad controls in scope for an all-dark symptom', () => {
    const result = assess(intake({ frontLeft: 'dark', frontRight: 'dark', rearLeft: 'dark', rearRight: 'dark' }))
    expect(result.findings.some(f => f.title === 'No exterior turn lamps respond')).toBe(true)
    expect(result.findings.some(f => f.title === 'Hazard mode differs from turn mode')).toBe(true)
  })
  it('identifies front/rear asymmetry without declaring a failed part', () => {
    const result = assess(intake({ rearLeft: 'dark', frontRight: 'dark' }))
    expect(result.findings.map(f => f.title)).toContain('Left front responds; rear differs')
    expect(result.findings.map(f => f.title)).toContain('Right rear responds; front differs')
    expect(result.findings.filter(f => f.kind === 'hypothesis').every(f => /not|remain/.test(f.text))).toBe(true)
  })
  it('prioritizes reported brake failure', () => {
    const result = assess(intake({ brakes: 'none', trim: 'standard' }))
    expect(result.findings[0].title).toBe('Brake-light failure also reported')
  })
  it('does not infer passes from unknown observations', () => {
    const result = assess(intake({ frontLeft: 'unknown', frontRight: 'unknown', rearLeft: 'unknown', rearRight: 'unknown', brakes: 'unknown', hazards: 'unknown' }))
    expect(result.findings.some(f => f.title === 'No specific fault area established')).toBe(true)
    expect(result.findings.filter(f => f.kind === 'hypothesis')).toHaveLength(0)
  })
})
