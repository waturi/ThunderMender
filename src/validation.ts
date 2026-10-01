import { answerQuestion, questions, type Answers } from './diagnostics'

export const invalid = (detail: string): never => { throw new Error(`Invalid case data: ${detail}. Nothing was imported.`) }
export function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return invalid('expected an object')
  return v as Record<string, unknown>
}
export function fields(v: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(v).some(k => !allowed.includes(k))) invalid('unexpected fields')
}
export function text(v: unknown, max: number, label: string): string {
  if (typeof v !== 'string' || !v.trim() || v.length > max) return invalid(label)
  return v
}
export function id(v: unknown): string {
  const value = text(v, 80, 'identifier')
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) invalid('identifier characters')
  return value
}
export function date(v: unknown): string {
  const value = text(v, 30, 'date')
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) invalid('date format')
  return value
}
export function validateAnswers(value: unknown): Answers {
  const raw = record(value)
  fields(raw, questions.map(q => q.id))
  let answers: Answers = {}
  for (const question of questions) {
    if (raw[question.id] === undefined) continue
    const answer = text(raw[question.id], 30, 'answer')
    try { answers = answerQuestion(answers, question.id, answer) }
    catch { return invalid('out-of-order, unsupported, or stale answers') }
  }
  if (Object.keys(answers).length !== Object.keys(raw).length) invalid('stale answers')
  return answers
}
