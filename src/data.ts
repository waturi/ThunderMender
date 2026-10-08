export const DATASET_ID = 'cougar-1967-observation-v1'
export const REVIEW_STATUS = 'Source transcription · not expert-reviewed'

export type PageKind = 'Schematic' | 'Physical location' | 'Mixed drawing' | 'Cover'
export interface SourcePage {
  id: string
  filename: string
  title: string
  kind: PageKind
  sha256: string
}

export const pages: SourcePage[] = [
  { id: 'cover', filename: 'Scan.jpeg', title: '1967 Cougar wiring manual', kind: 'Cover', sha256: '44b3dee60af9fe2f605e58ab99ab6e13ce89da4e1b10e2541ff8800b7d2a3615' },
  { id: 'instrument-location', filename: 'Scan 1.jpeg', title: 'Instrument panel', kind: 'Physical location', sha256: 'a733578d4d928129791f1d49e8c5b5b46c6b9db90b05629f2cf0fc67ce5040c9' },
  { id: 'instrument-schematic', filename: 'Scan 2.jpeg', title: 'Instrument cluster', kind: 'Schematic', sha256: 'e6253d0efca420c5e39f2918a369c0fac73a50f704b6daba8aae418096bd5d61' },
  { id: 'ignition-location', filename: 'Scan 3.jpeg', title: 'Ignition, charging & starting', kind: 'Physical location', sha256: '9b10bc61e4df6e038561349c115b9159236bcf559cb967f6b46f62348154f022' },
  { id: 'ignition-schematic', filename: 'Scan 4.jpeg', title: 'Ignition, charging & starting', kind: 'Schematic', sha256: 'd9a14be96f73088d7c6162eb78f03aa2aa14d9771d219733e702631a11e7f6fc' },
  { id: 'exterior-location', filename: 'Scan 5.jpeg', title: 'Exterior lights', kind: 'Physical location', sha256: '5be7272c64a46027d4a8840b62937c293e2a16f1e0f3ad0f62de34794930c625' },
  { id: 'exterior-schematic', filename: 'Scan 6.jpeg', title: 'Exterior lighting, horns & turn signals', kind: 'Schematic', sha256: '4ac062957f5fc0055ceb0ee6fb16b8175ae48f15164beed6010395eae37b0c02' },
  { id: 'xr7-front', filename: 'Scan 7.jpeg', title: 'XR-7 chassis wiring · front half', kind: 'Schematic', sha256: '4d4726c626459a686b88cca6a29c3761f32d80c2a74ba63eee653da2237bb4fe' },
  { id: 'xr7-rear', filename: 'Scan 8.jpeg', title: 'XR-7 chassis wiring · rear half', kind: 'Schematic', sha256: 'd54475556f009f0d386352b1b51600ba25dba78b260f3136908f801db3ef62b3' },
  { id: 'wipers', filename: 'Scan 9.jpeg', title: 'Windshield wiper & washer', kind: 'Mixed drawing', sha256: 'bd2c0148f8795c2f77ce91c46b33a8e1c9a0f6b174ec3e6ac0642811c137428d' },
  { id: 'interior', filename: 'Scan 10.jpeg', title: 'Interior lighting', kind: 'Schematic', sha256: '68a0cc0bb99b448e6117810a4b43b464d16ebaae0c5279efd3615a94e66ee233' },
  { id: 'convenience', filename: 'Scan 11.jpeg', title: 'Safety convenience systems', kind: 'Mixed drawing', sha256: '250af851a9282dccae74a287dc1e35f4e1472593363171daa2bbcbdef561bcba' },
  { id: 'air-conditioning', filename: 'Scan 12.jpeg', title: 'Air conditioner', kind: 'Mixed drawing', sha256: '846070b6f061997be8bf1d4b8388f29d14bc463d13169d30e3828cf391f29752' },
]

export interface Citation {
  pageId: string
  // Normalized bounds on the exact fingerprinted scan, from its top-left.
  region: { x: number; y: number; w: number; h: number }
  label: string
}
export interface Component {
  id: string
  name: string
  shortName: string
  group: 'Driver controls' | 'Factory sequencing' | 'Exterior lamps'
  fact: string
  uncertainty: string
  citations: Citation[]
}
const schematic = (x: number, y: number, w: number, h: number, label: string): Citation =>
  ({ pageId: 'exterior-schematic', region: { x, y, w, h }, label })
const location = (x: number, y: number, w: number, h: number, label: string): Citation =>
  ({ pageId: 'exterior-location', region: { x, y, w, h }, label })

export const components: Component[] = [
  {
    id: 'turn-switch', name: 'Turn signal switch', shortName: 'Turn switch', group: 'Driver controls',
    fact: 'The exterior schematic labels a turn signal switch separately from the sequential relay and motor.',
    uncertainty: 'The drawing does not establish the condition, installed replacement, or contact behavior of your switch.',
    citations: [schematic(.55, .525, .12, .146, 'Switch symbol and label, lower center'), location(.431, .357, .075, .094, 'Steering-column area in the location drawing')],
  },
  {
    id: 'stop-switch', name: 'Stop-lamp switch', shortName: 'Brake switch', group: 'Driver controls',
    fact: 'A stop-lamp switch is identified on the same sheet as the rear stop and turn lamps.',
    uncertainty: 'Shared page context is not proof that the switch causes a reported turn-signal fault.',
    citations: [schematic(.532, .47, .071, .066, 'Stop-lamp switch, above the turn switch')],
  },
  {
    id: 'emergency', name: 'Emergency warning relays', shortName: 'Hazard relays', group: 'Driver controls',
    fact: 'The sheet identifies emergency warning relays and an emergency relay near the rear-lamp section.',
    uncertainty: 'Hazard operation and turn-signal operation must be recorded separately; no relay state has been verified.',
    citations: [schematic(.372, .382, .106, .121, 'Emergency warning relays, center left'), schematic(.72, .39, .091, .102, 'Emergency relay, upper right')],
  },
  {
    id: 'indicator-relay', name: 'Turn signal indicator relay', shortName: 'Indicator relay', group: 'Driver controls',
    fact: 'The manual labels a turn signal indicator relay separately from the sequential turn signal relay.',
    uncertainty: 'A dash indication alone does not establish whether exterior lamps are working.',
    citations: [schematic(.402, .69, .074, .095, 'Turn signal indicator relay, lower left-center')],
  },
  {
    id: 'sequence-relay', name: 'Sequential turn signal relay', shortName: 'Sequential relay', group: 'Factory sequencing',
    fact: 'A sequential turn signal relay and its connector symbols are drawn beside the rear-lamp section.',
    uncertainty: 'This factory component may have been replaced or bypassed by a conversion. No operating states are transcribed.',
    citations: [schematic(.652, .489, .12, .11, 'Sequential relay, right of the switch'), location(.728, .352, .073, .068, 'Rear assembly area, relay callout')],
  },
  {
    id: 'sequence-motor', name: 'Sequential turn signal motor', shortName: 'Sequential motor', group: 'Factory sequencing',
    fact: 'The factory schematic explicitly identifies a sequential turn signal motor below the sequential relay.',
    uncertainty: 'No sequence timing, motor voltage, terminal test, or failure criterion is established by this transcription.',
    citations: [schematic(.685, .633, .118, .077, 'Sequential motor, below the relay')],
  },
  {
    id: 'front-left', name: 'Left front parking / turn lamp', shortName: 'Left front', group: 'Exterior lamps',
    fact: 'The left-hand parking and turn signal lamp is labeled on the exterior schematic.',
    uncertainty: 'A working parking light does not by itself verify turn-signal operation.',
    citations: [schematic(.093, .581, .152, .07, 'Left parking and turn lamp, left edge')],
  },
  {
    id: 'front-right', name: 'Right front parking / turn lamp', shortName: 'Right front', group: 'Exterior lamps',
    fact: 'The right-hand parking and turn signal lamp is labeled on the exterior schematic.',
    uncertainty: 'Record the exterior lamp directly, rather than inferring its state from the dash indicator.',
    citations: [schematic(.091, .327, .15, .086, 'Right parking and turn lamp, left edge')],
  },
  {
    id: 'rear-left', name: 'Left rear stop / turn lamps', shortName: 'Left rear bank', group: 'Exterior lamps',
    fact: 'Three left-hand rear stop and turn lamp symbols are shown as separate lamps.',
    uncertainty: 'The drawing alone does not identify which lamp on your car is dark or confirm its physical position.',
    citations: [schematic(.815, .57, .106, .178, 'Three left rear stop / turn lamps, lower right'), location(.69, .302, .108, .106, 'Left rear lamp bank in the physical drawing')],
  },
  {
    id: 'rear-right', name: 'Right rear stop / turn lamps', shortName: 'Right rear bank', group: 'Exterior lamps',
    fact: 'Three right-hand rear stop and turn lamp symbols are shown as separate lamps.',
    uncertainty: 'Record all three individually when possible. No lamp, socket, ground, or feed has been ruled out.',
    citations: [schematic(.815, .215, .106, .204, 'Three right rear stop / turn lamps, upper right'), location(.592, .283, .094, .073, 'Right rear lamp bank in the physical drawing')],
  },
]

export function getComponent(id: string): Component {
  const result = components.find(component => component.id === id)
  if (!result) throw new Error(`Unknown component: ${id}`)
  return result
}
export function getPage(id: string): SourcePage {
  const result = pages.find(page => page.id === id)
  if (!result) throw new Error(`Unknown source page: ${id}`)
  return result
}
