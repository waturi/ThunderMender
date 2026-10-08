import { getComponent, type Citation } from './data'

export const TRACE_REVISION = 'cougar-1967-trace-1'
export interface TraceLine { pageId: string; points: [number, number][] }
export interface TraceStep {
  id: string
  title: string
  detail: string
  kind: 'boundary' | 'connector' | 'device' | 'wire' | 'load' | 'return' | 'gap'
  link: 'start' | 'drawn' | 'continuation' | 'state-gap' | 'source-gap'
  citations: Citation[]
  lines: TraceLine[]
  wire?: string
  color?: string
}
export interface TraceEndpoint {
  id: string
  componentId: string
  title: string
  side: 'left' | 'right'
  position: 'front' | 'rear'
  circuit: string
  color: string
  y: number
}
export const endpoints: TraceEndpoint[] = [
  { id: 'front-left', componentId: 'front-left', title: 'Left front turn lamp', side: 'left', position: 'front', circuit: '448', color: 'Green / white stripe', y: .602 },
  { id: 'front-right', componentId: 'front-right', title: 'Right front turn lamp', side: 'right', position: 'front', circuit: '449', color: 'White / blue stripe (449 only; lamp says 499)', y: .356 },
  { id: 'rear-left-442', componentId: 'rear-left', title: 'Left rear · upper symbol (442)', side: 'left', position: 'rear', circuit: '442', color: 'Green / orange stripe', y: 1497 / 2550 },
  { id: 'rear-left-443', componentId: 'rear-left', title: 'Left rear · middle symbol (443)', side: 'left', position: 'rear', circuit: '443', color: 'Green / red stripe', y: 1647 / 2550 },
  { id: 'rear-left-444', componentId: 'rear-left', title: 'Left rear · lower symbol (444)', side: 'left', position: 'rear', circuit: '444', color: 'Green / black stripe', y: 1785 / 2550 },
  { id: 'rear-right-447', componentId: 'rear-right', title: 'Right rear · upper symbol (447)', side: 'right', position: 'rear', circuit: '447', color: 'Orange / red stripe', y: 582 / 2550 },
  { id: 'rear-right-446', componentId: 'rear-right', title: 'Right rear · middle symbol (446)', side: 'right', position: 'rear', circuit: '446', color: 'Orange / white stripe', y: 765 / 2550 },
  { id: 'rear-right-445', componentId: 'rear-right', title: 'Right rear · lower symbol (445)', side: 'right', position: 'rear', circuit: '445', color: 'Legend partly faint; color not transcribed', y: 939 / 2550 },
]
export function getEndpoint(id: string): TraceEndpoint {
  const endpoint = endpoints.find(e => e.id === id)
  if (!endpoint) throw new Error('Unknown trace endpoint.')
  return endpoint
}
function cite(x: number, y: number, w: number, h: number, label: string): Citation {
  return { pageId: 'exterior-schematic', region: { x, y, w, h }, label }
}
const wireLegend = cite(.28, .17, .215, .28, 'Printed circuit-number / wire-color legend')
// Visible runs on the 3300 x 2550 fingerprinted original; never harness outlines.
const line = (...pixels: [number, number][]): TraceLine => ({ pageId: 'exterior-schematic', points: pixels.map(([x, y]) => [x / 3300, y / 2550]) })
const lampLines: Record<string, TraceLine[]> = {
  '442': [line([2748, 1497], [2765, 1497], [2765, 1532], [2784, 1532])],
  '443': [line([2755, 1647], [2770, 1647])],
  '444': [line([2753, 1785], [2768, 1785])],
  '447': [line([2740, 582], [2755, 582])],
  '446': [line([2745, 765], [2760, 766])],
  '445': [line([2747, 939], [2761, 939])],
  '448': [line([454, 1535], [597, 1535], [597, 1572], [652, 1572])],
}
const common: TraceStep[] = [
  {
    id: 'supply-gap', title: 'Battery / protection: missing connection', kind: 'gap', link: 'start',
    detail: 'Scan 4 shows a battery and supply wiring, but a checked connection from those supplies or a specific fuse/breaker to circuit 459 has not been established. No protection rating or battery-to-459 edge is invented.',
    citations: [{ pageId: 'ignition-schematic', region: { x: .15, y: .17, w: .28, h: .2 }, label: 'Battery and starting relay: upstream context only, NOT a joined trace' }, cite(.40, .67, .13, .13, '459 at indicator relay: the known continuation boundary')],
    lines: [],
  },
  {
    id: 'feed-459', title: 'Known boundary: circuit 459', kind: 'boundary', link: 'source-gap', wire: '459', color: 'Orange / green stripe',
    detail: '459 is identified at the turn signal indicator relay and the rear-harness connector. This is a numbered feed continuation, not a verified battery source or proof of power. Indicator-relay internal supply/contact behavior is not provided here.',
    citations: [cite(.401, .672, .112, .123, 'Indicator relay and 459 / 458 / 694 continuations'), wireLegend],
    lines: [],
  },
  {
    id: 'feed-connector', title: '459 crosses the rear-harness connector', kind: 'connector', link: 'continuation', wire: '459', color: 'Orange / green stripe',
    detail: 'The lower three-way connector shows 459 on both mating sides, between the 14401 and rear assembly labels. The other positions are labeled 140 / 140A and 475. Assembly numbers vary in print between 13449 and 13A449; no physical cavity number is assigned.',
    citations: [cite(.639, .705, .162, .122, 'Lower three-way harness connector: matching 459 on both sides')],
    lines: [line([2176, 1930], [2176, 1985]), line([2180, 2028], [2180, 2067], [2218, 2069])],
  },
  {
    id: 'motor-feed', title: '459 enters the sequential motor assembly', kind: 'wire', link: 'continuation', wire: '459', color: 'Orange / green stripe',
    detail: 'The motor connector labels its lower lead 459. The drawn line reaches the motor/contact-common area. No voltage, timing, or operating motor condition is inferred.',
    citations: [cite(.686, .631, .126, .087, 'Motor connector and 459 lead')],
    lines: [line([2506, 1760], [2478, 1760], [2478, 1676], [2364, 1676])],
  },
  {
    id: 'motor-contacts', title: 'Motor contacts: phase is unknown', kind: 'device', link: 'state-gap',
    detail: '436, 437 and 438 are separate motor contact leads. The page does not supply a phase/timing truth table. They are branches, NOT three devices in series, and are not asserted active together.',
    citations: [cite(.687, .633, .125, .078, 'Mechanical contacts and 436 / 437 / 438 leads'), wireLegend], lines: [],
  },
  {
    id: 'sequence-branches', title: '437 direct; 436 / 438 via emergency relay', kind: 'wire', link: 'continuation',
    detail: '437 is labeled at both the motor and sequential-relay input connector. 436 and 438 appear at the emergency relay, with 436A and 438A continuing to the sequential-relay connector. No internal emergency-relay contact connection is assumed.',
    citations: [cite(.69, .636, .126, .074, 'Motor outputs: 436, 437, 438'), cite(.72, .409, .095, .079, 'Emergency relay: 436 / 438 and 436A / 438A'), cite(.729, .581, .083, .054, 'Sequential-relay input connector: 436A, 437, 438A')],
    lines: [line([2636, 1707], [2660, 1707]), line([2637, 1514], [2665, 1515])],
  },
  {
    id: 'relay-contacts', title: 'Sequential relay: selected contacts unresolved', kind: 'device', link: 'state-gap',
    detail: 'The relay has motor inputs, turn-control leads, a separate 475 branch and individual lamp outputs. There is no reviewed turn/brake/hazard/phase contact-state table. The trace deliberately breaks here instead of choosing an energized path.',
    citations: [cite(.65, .488, .163, .151, 'Relay contacts, upper lamp connector and lower input/front-lamp connector')], lines: [],
  },
]

export const traceBranches: { title: string; detail: string; citations: Citation[] }[] = [
  {
    title: 'Turn-switch control branch: 440 / 441',
    detail: '440 and 441 appear at the turn-switch connector, upper body-harness joins and the sequential relay. These are control connections, not a generic flasher-in-series assumption. Their active state is not transcribed.',
    citations: [cite(.6, .366, .112, .106, 'Turn-switch connector, 440 / 441 / 441A'), cite(.666, .172, .125, .223, 'Matching 440 / 441 through body-harness connectors'), cite(.737, .49, .074, .042, '440 / 441 at sequential relay')],
  },
  {
    title: 'Separate brake branch: 475 and stop-lamp switch',
    detail: '475 is labeled at the stop-lamp switch, lower rear-harness connector and sequential relay. 10 is the other stop-switch lead. This shared brake branch is not collapsed into the turn-mode feed; its supply origin and relay state remain unresolved.',
    citations: [cite(.524, .465, .079, .076, '475 / 10 at stop-lamp switch'), cite(.728, .582, .084, .052, '475 at sequential relay'), cite(.637, .718, .151, .11, '475 through lower rear-harness connector')],
  },
  {
    title: 'Shared lamps, not interchangeable operating modes',
    detail: 'The rear symbols are stop / turn lamps with separate numbered turn leads and 14-series parking leads. The drawn case-ground symbol is the return; a black wire color alone does not establish ground. Front 448 / 449 branches share the relay assembly, not a guarantee of working rear outputs.',
    citations: [cite(.817, .213, .093, .527, 'Separate rear turn / parking leads and local ground symbols'), cite(.727, .579, .09, .058, '448 / 449 at lower relay connector')],
  },
]

export function traceSteps(endpointId: string): TraceStep[] {
  const e = getEndpoint(endpointId)
  const steps: TraceStep[] = common.map(step => ({ ...step }))
  steps.push({
    id: `output-${e.circuit}`, title: `${e.circuit}: ${e.position === 'front' ? 'front branch' : 'individual rear output'}`,
    kind: 'wire', link: 'drawn', wire: e.circuit, color: e.color,
    detail: `${e.circuit} is printed at the ${e.position === 'front' ? 'lower' : 'upper'} sequential-relay connector. ${e.position === 'rear' ? 'Each rear lamp has its own numbered output; no inboard/outboard position is inferred from the drawing order.' : 'The front feed continues through body and front-harness connectors.'} The relay output is not assumed live.`,
    citations: [cite(.731, e.position === 'front' ? .584 : .49, .082, e.position === 'front' ? .052 : .091, `${e.circuit} at the sequential-relay connector`), wireLegend], lines: [],
  })
  if (e.position === 'front') steps.push({
    id: `harness-${e.circuit}`, title: `${e.circuit}: body → front harness joins`, kind: 'connector', link: 'continuation', wire: e.circuit, color: e.color,
    detail: `${e.circuit} appears at the 13449 / 14405 join, the 14405 / 14401 join and the 14401 / 14290 front-harness connector. These are matching printed circuit continuations, not a wire drawn through the heavy harness-outline lines.`,
    citations: [cite(.668, .179, .119, .218, '448 / 449 at the two upper body-harness connectors'), cite(.283, .469, .182, .058, '448 / 449 across the front-harness connector')], lines: [],
  })
  if (e.id === 'front-right') steps.push({
    id: 'right-front-number-gap', title: 'Source discrepancy: 449 versus 499', kind: 'gap', link: 'source-gap',
    detail: 'The harness and legend identify 449; the right-front lamp connector lead reads 499 in this scan. No equivalence is assumed. A corrected legible source or qualified circuit identification is required to join this interval.',
    citations: [cite(.183, .323, .077, .055, 'Right-front connector printed 499'), cite(.302, .477, .167, .041, 'Front-harness connector printed 449'), wireLegend], lines: [],
  })
  steps.push({
    id: `lamp-${e.id}`, title: e.title, kind: 'load', link: e.id === 'front-right' ? 'source-gap' : 'continuation',
    wire: e.id === 'front-right' ? '499 as printed · unresolved' : e.circuit, color: e.id === 'front-right' ? 'Unknown for 499' : e.color,
    detail: e.position === 'rear' ? `The ${e.circuit} lead terminates at this rear stop / turn lamp symbol. "Upper / middle / lower" describes this page only; the car's physical lamp position is unconfirmed.` : 'The source shows a distinct turn lead, parking lead and return at the lamp connector. Parking-light operation does not verify the turn function.',
    citations: e.position === 'rear' ? [cite(.814, e.y - .012, .107, .059, `${e.circuit} rear lamp lead and ground symbol`)] : [getComponent(e.componentId).citations[0]],
    lines: lampLines[e.circuit] ?? [],
  }, {
    id: `return-${e.id}`, title: e.position === 'rear' ? 'Lamp case → drawn ground symbol' : `Lamp return → ${e.side === 'left' ? '57 / 57A' : '57C'} continuation`,
    kind: 'return', link: 'drawn', wire: e.position === 'rear' ? 'Ground symbol · not 14-series parking feed' : e.side === 'left' ? '57 / 57A' : '57C',
    color: e.position === 'rear' ? 'No separate wire color asserted' : '57: black in legend; suffix routing requires source review',
    detail: e.position === 'rear' ? 'The ground symbol is drawn below this lamp case. It does not establish a clean socket, ground attachment or battery-negative return on the car.' : 'The lamp return is drawn into its connector and a numbered harness continuation. A chassis attachment or battery-negative bond is not traced on this section.',
    citations: e.position === 'rear' ? [cite(.836, e.y, .065, .035, 'Local lamp case and ground glyph')] : [getComponent(e.componentId).citations[0]], lines: [],
  }, {
    id: 'return-gap', title: 'Return bond to battery negative: not established', kind: 'gap', link: 'source-gap',
    detail: 'A local ground glyph or harness-return number is not a checked chassis-to-battery-negative path. The physical return attachments and their condition need vehicle-specific evidence. This trace is intentionally incomplete.',
    citations: [getComponent(e.componentId).citations[0], { pageId: 'ignition-schematic', region: { x: .155, y: .282, w: .037, h: .078 }, label: 'Battery return depiction: context only, no joined lamp-return route' }], lines: [],
  })
  return steps
}
