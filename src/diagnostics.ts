export type QuestionId =
  | 'safety' | 'vehicle' | 'trim' | 'configuration' | 'side'
  | 'frontLeft' | 'frontRight' | 'rearLeft' | 'rearLeftCount'
  | 'rearRight' | 'rearRightCount' | 'brakes' | 'hazards' | 'checked'
export type Answers = Partial<Record<QuestionId, string>>
export interface Question {
  id: QuestionId
  section: string
  title: string
  help: string
  options: { value: string; label: string }[]
  components: string[]
}
const options = (...items: [string, string][]) => items.map(([value, label]) => ({ value, label }))
const frontOptions = options(['flashes', 'Flashes'], ['steady', 'Stays on without flashing'], ['dark', 'Does not light'], ['intermittent', 'Works intermittently'], ['unknown', 'Not checked / unsure'])
const rearOptions = options(['sequence', 'All lamps light in a sequence'], ['together', 'All lamps flash together'], ['partial', 'Only some lamps light'], ['steady', 'All lamps stay on steadily'], ['dark', 'No lamps light'], ['intermittent', 'Changes / intermittent'], ['unknown', 'Not checked / unsure'])
const countOptions = options(['one', 'One lamp lights'], ['two', 'Two lamps light'], ['variable', 'The number changes'], ['unknown', 'Not sure'])
const parked = 'Observe only from a safe, stationary position, off the road, with the vehicle secured and engine off. Use the normal controls only if safe; do not reach into wiring. Otherwise choose not checked.'

export const questions: Question[] = [
  { id: 'safety', section: 'Before you begin', title: 'Any smoke, burning smell, or unusually hot wiring?', help: 'Do not energize the circuit to find out. Answer from what you already know.', options: options(['clear', 'No signs of heat or burning'], ['danger', 'Yes, or I noticed this recently'], ['unknown', 'I cannot establish that it is safe']), components: [] },
  { id: 'vehicle', section: 'Your vehicle', title: 'Are we working on a 1967 Mercury Cougar?', help: 'This guide is based on the supplied 1967 Cougar manual. A drawing is not proof of how your car is wired.', options: options(['confirmed', 'Yes, a 1967 Mercury Cougar'], ['mismatch', 'No, a different year or model'], ['unknown', 'I am not sure yet']), components: [] },
  { id: 'trim', section: 'Your vehicle', title: 'Which Cougar configuration do you have?', help: 'The library includes separate XR-7 chassis sheets. We will not assume those apply to your car.', options: options(['standard', 'Standard Cougar'], ['xr7', 'XR-7'], ['unknown', 'Not sure']), components: [] },
  { id: 'configuration', section: 'Your wiring', title: 'What runs the rear turn-signal sequence?', help: 'Use records or what you already know. Do not remove covers or touch wiring to answer.', options: options(['factory', 'Confirmed factory motor / relay mechanism'], ['modified', 'Electronic conversion or other modification'], ['unknown', 'Unknown / not inspected']), components: ['sequence-relay', 'sequence-motor'] },
  { id: 'side', section: 'Narrow the symptom', title: 'Which turn signal is giving you trouble?', help: 'Left and right mean the vehicle sides as you sit facing forward. We will record the lamps separately next.', options: options(['left', 'Left side'], ['right', 'Right side'], ['both', 'Both sides'], ['intermittent', 'Intermittent / changes sides'], ['unknown', 'Not sure yet']), components: ['turn-switch', 'rear-left', 'rear-right'] },
  { id: 'frontLeft', section: 'Front observations', title: 'With LEFT selected, what does the left front lamp do?', help: parked, options: frontOptions, components: ['front-left', 'turn-switch'] },
  { id: 'frontRight', section: 'Front observations', title: 'With RIGHT selected, what does the right front lamp do?', help: parked, options: frontOptions, components: ['front-right', 'turn-switch'] },
  { id: 'rearLeft', section: 'Rear observations', title: 'With LEFT selected, what do the left rear lamps do?', help: `${parked} Watch the whole bank; a dash indicator is not enough.`, options: rearOptions, components: ['rear-left', 'sequence-relay'] },
  { id: 'rearLeftCount', section: 'Left rear detail', title: 'How many left rear lamps light?', help: 'Record only what you observed. Add positions or changing behavior in the field notes; do not assume a dark lamp is a failed bulb.', options: countOptions, components: ['rear-left'] },
  { id: 'rearRight', section: 'Rear observations', title: 'With RIGHT selected, what do the right rear lamps do?', help: `${parked} Record this side even if you think only the left is affected.`, options: rearOptions, components: ['rear-right', 'sequence-relay'] },
  { id: 'rearRightCount', section: 'Right rear detail', title: 'How many right rear lamps light?', help: 'Record only what you observed. You can note individual positions below; no lamp has been diagnosed yet.', options: countOptions, components: ['rear-right'] },
  { id: 'brakes', section: 'Related observations', title: 'What do the rear brake lights do with signals off?', help: `${parked} Use a safely positioned helper or existing observations. Do not work around pedals or underneath the car.`, options: options(['all', 'All rear brake lamps light'], ['partial', 'Only some brake lamps light'], ['none', 'No brake lamps light'], ['unknown', 'Not checked / unsure']), components: ['stop-switch', 'rear-left', 'rear-right'] },
  { id: 'hazards', section: 'Related observations', title: 'What do the exterior lamps do with hazards selected?', help: `${parked} Record the hazard mode separately. Do not assume its pattern must match turn-signal sequencing.`, options: options(['all', 'All front and rear signal lamps flash'], ['partial', 'Only some lamps respond'], ['none', 'No lamps respond'], ['unknown', 'Not checked / unsure / not fitted']), components: ['emergency', 'rear-left', 'rear-right'] },
  { id: 'checked', section: 'Work so far', title: 'What has already been checked?', help: 'Choose the closest description and add details in field notes. Previous work is history, not proof that a part or connection is good. No new electrical test is requested.', options: options(['none', 'Nothing yet'], ['visual', 'Visual inspection only'], ['lamps', 'Bulbs or lamp sockets checked'], ['protection', 'Fuses or protection checked'], ['parts', 'Parts or wiring changed'], ['professional', 'Electrical tests by a qualified person'], ['unknown', 'Unknown / previous owner work']), components: ['turn-switch', 'sequence-relay', 'rear-left', 'rear-right'] },
]

export function questionPath(answers: Answers): Question[] {
  const path = [questions[0]]
  if (!answers.safety || answers.safety !== 'clear') return path
  path.push(questions[1])
  if (!answers.vehicle || answers.vehicle !== 'confirmed') return path
  for (const question of questions.slice(2)) {
    if (question.id === 'rearLeftCount' && answers.rearLeft !== 'partial') continue
    if (question.id === 'rearRightCount' && answers.rearRight !== 'partial') continue
    path.push(question)
  }
  return path
}

export function nextQuestion(answers: Answers): Question | undefined {
  return questionPath(answers).find(question => !answers[question.id])
}

export function answerQuestion(answers: Answers, id: QuestionId, value: string): Answers {
  const path = questionPath(answers)
  const index = path.findIndex(question => question.id === id)
  const question = path[index]
  if (!question || !question.options.some(option => option.value === value)) throw new Error('Invalid diagnostic answer.')
  if (path.slice(0, index).some(previous => !answers[previous.id])) throw new Error('Complete earlier questions first.')
  if (answers[id] === value) return answers
  const updated: Answers = {}
  for (const previous of path.slice(0, index)) updated[previous.id] = answers[previous.id]
  updated[id] = value
  return updated
}

export interface Finding {
  title: string
  text: string
  components: string[]
  kind: 'hypothesis' | 'missing' | 'observation' | 'stop'
}
export interface Assessment {
  title: string
  summary: string
  findings: Finding[]
  stopped: boolean
}

export function assess(a: Answers): Assessment {
  if (a.safety === 'danger' || a.safety === 'unknown') return {
    title: 'Stop here. Establish safety first.', stopped: true,
    summary: 'Do not operate the switches or energize the wiring. Keep clear of hot or damaged wiring. If there is active smoke or fire, move away and contact emergency services. Arrange qualified inspection before continuing.',
    findings: [{ kind: 'stop', title: 'Observation workflow paused', text: 'No further lamp checks or electrical tests are prescribed. Edit the safety answer only after the hazard has been professionally resolved or safety established.', components: [] }],
  }
  if (a.vehicle && a.vehicle !== 'confirmed') return {
    title: 'We need the right vehicle evidence.', stopped: true,
    summary: 'The 1967 Cougar guide cannot establish a circuit for a different or unidentified vehicle. Confirm the year and model and obtain the appropriate documentation before diagnosis.',
    findings: [{ kind: 'missing', title: 'Source applicability is unconfirmed', text: 'The manual remains browsable for reference, not as evidence of your car. Factory-specific diagnostic suggestions are paused.', components: [] }],
  }
  const findings: Finding[] = []
  if (!a.vehicle) return { title: 'Let’s establish the basics.', summary: 'A few observations will separate what you know from what still needs checking. No failed part is assumed.', stopped: false, findings }
  if (a.configuration && a.configuration !== 'factory') findings.push({
    kind: 'missing', title: a.configuration === 'modified' ? 'Conversion documentation needed' : 'Installed mechanism is unknown',
    text: 'Continue with exterior observations. Factory motor and relay tests or sequence expectations do not apply until the installed system is identified. Obtain the conversion maker’s documentation or qualified identification.',
    components: ['sequence-motor', 'sequence-relay'],
  })
  const bad = (v?: string) => !!v && !['unknown', 'flashes', 'sequence'].includes(v)
  if (a.brakes === 'none' || a.brakes === 'partial') findings.push({
    kind: 'observation', title: 'Brake-light failure also reported',
    text: 'Prioritize the unresolved brake lights along with the signals. Separate stop-lamp observations from turn mode; shared symptoms do not prove a failed switch. Do not drive the car with unresolved exterior signal or brake-light failures.',
    components: ['stop-switch', 'rear-left', 'rear-right'],
  })
  for (const [label, front, rear, frontId, rearId] of [
    ['Left', a.frontLeft, a.rearLeft, 'front-left', 'rear-left'],
    ['Right', a.frontRight, a.rearRight, 'front-right', 'rear-right'],
  ]) {
    if (rear === 'partial') findings.push({
      kind: 'hypothesis', title: `${label} rear: separate the individual lamps`,
      text: 'Some lamps respond and others do not. Lamp, socket, local wiring, and control-output differences remain possible. Record exactly which lamps respond in turn, brake, and hazard modes before a qualified person selects a test. Do not replace a part from this symptom alone.',
      components: [rearId!, ...(a.configuration === 'factory' ? ['sequence-relay'] : [])],
    })
    else if (front === 'flashes' && bad(rear)) findings.push({
      kind: 'hypothesis', title: `${label} front responds; rear differs`,
      text: a.configuration === 'factory'
        ? 'The exterior observations focus attention on the rear lamps, their wiring, and factory sequencing controls. A flashing front lamp does not prove the rear supply or motor is healthy. No particular component is established as faulty.'
        : 'Keep the front/rear distinction. Rear lamps, wiring, and the installed controller remain areas to investigate using the correct documentation, not assumed factory motor behavior.',
      components: [rearId!, ...(a.configuration === 'factory' ? ['sequence-relay', 'sequence-motor'] : [])],
    })
    if (bad(front) && rear === 'sequence') findings.push({
      kind: 'hypothesis', title: `${label} rear responds; front differs`,
      text: 'Preserve the front-lamp symptom separately. The lamp, socket, local wiring and turn-control connections remain possible areas; rear activity does not identify a failed front bulb.',
      components: [frontId!, 'turn-switch'],
    })
  }
  if (a.frontLeft === 'dark' && a.frontRight === 'dark' && a.rearLeft === 'dark' && a.rearRight === 'dark') findings.push({
    kind: 'hypothesis', title: 'No exterior turn lamps respond',
    text: 'A shared supply or control issue is plausible, but multiple local faults are not excluded. Keep protection, controls and installed wiring in scope for qualified inspection; the scan alone supplies no approved terminal test or fuse rating.',
    components: ['turn-switch', 'emergency', ...(a.configuration === 'factory' ? ['sequence-relay'] : [])],
  })
  if (a.hazards === 'all' && [a.frontLeft, a.frontRight, a.rearLeft, a.rearRight].some(v => bad(v))) findings.push({
    kind: 'observation', title: 'Hazard mode differs from turn mode',
    text: 'You report all lamps flashing in hazard mode. That is useful comparison evidence, not proof that every turn-signal connection or switch contact is good.',
    components: ['emergency', 'turn-switch'],
  })
  if (a.side === 'intermittent' || [a.frontLeft, a.frontRight, a.rearLeft, a.rearRight].includes('intermittent')) findings.push({
    kind: 'missing', title: 'Capture the intermittent conditions',
    text: 'Note which side, lamp bank, switch mode and circumstances coincide with the symptom. A fault that is absent now is not verified repaired. Do not provoke it by moving live wiring.',
    components: ['turn-switch', 'rear-left', 'rear-right'],
  })
  const missing = questionPath(a).filter(q => a[q.id] === 'unknown').map(q => q.section)
  if (missing.length) findings.push({
    kind: 'missing', title: 'Some evidence is still unknown',
    text: `Not checked or uncertain: ${[...new Set(missing)].join(', ')}. Unknown is not a pass. Revisit an answer when you have a safe observation.`,
    components: [],
  })
  if (!nextQuestion(a) && !findings.some(f => f.kind === 'hypothesis')) findings.push({
    kind: 'missing', title: 'No specific fault area established',
    text: 'These observations do not isolate a failed part. If the symptom is currently absent, record when it occurs; otherwise take the case and correct documentation to a qualified automotive electrician. There is no approved electrical test procedure in this release.',
    components: ['turn-switch', 'rear-left', 'rear-right'],
  })
  return {
    title: nextQuestion(a) ? 'Building an evidence picture.' : 'Your next step, not a parts guess.',
    summary: 'These are observation-based triage suggestions, not an expert diagnosis. Source links identify components; they do not validate the condition of your car.',
    stopped: false, findings,
  }
}

export function answerLabel(id: QuestionId, value: string): string {
  return questions.find(q => q.id === id)?.options.find(o => o.value === value)?.label ?? 'Unrecognized answer'
}
