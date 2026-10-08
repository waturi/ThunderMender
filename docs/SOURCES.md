# Source provenance and review boundary

## Collection

Owner-supplied local collection of 13 JPEG scans titled **1967 Cougar Wiring
Diagram Manual**. Publisher, publication rights and permission to redistribute
have not been established. **No source image or bulk manual transcription is
included in this repository.** Owners import their own local files.

All 13 scans were visually inspected for this implementation on 2026-10-01 UTC.
Local macOS Vision OCR was used as a reading aid and to verify filename/title
mapping; no images were sent to any external OCR, research or model service.
The checked-in metadata is a small factual index and authored explanatory text.

The inspected folder's actual ordering differs from an earlier verbal inventory:

| Original filename | Identified subject | Drawing type |
| --- | --- | --- |
| Scan.jpeg | 1967 Cougar manual cover | Cover |
| Scan 1.jpeg | Instrument panel | Physical location |
| Scan 2.jpeg | Instrument cluster | Electrical schematic |
| Scan 3.jpeg | Ignition, charging and starting | Physical location |
| Scan 4.jpeg | Ignition, charging and starting | Electrical schematic |
| Scan 5.jpeg | Exterior lights | Physical location |
| Scan 6.jpeg | Exterior lighting, horns and turn signals | Electrical schematic |
| Scan 7.jpeg | XR-7 chassis, front half | Electrical schematic |
| Scan 8.jpeg | XR-7 chassis, rear half | Electrical schematic |
| Scan 9.jpeg | Windshield wiper and washer | Mixed location/schematic |
| Scan 10.jpeg | Interior lighting | Electrical schematic |
| Scan 11.jpeg | Safety convenience systems | Mixed location/schematic |
| Scan 12.jpeg | Air conditioner | Mixed location/schematic |

## Identity and citations

`src/data.ts` is the authoritative metadata. Each source page has:

- A stable semantic ID, title, original filename and drawing kind.
- Its full SHA-256 byte fingerprint, computed from the inspected source.
- Component citations with explicit page identity and normalized rectangle
  `{x, y, w, h}` measured from the top-left of the full image.

The exterior schematic's fingerprint is
`4ac062957f5fc0055ceb0ee6fb16b8175ae48f15164beed6010395eae37b0c02`.
The exterior location drawing's fingerprint is
`5be7272c64a46027d4a8840b62937c293e2a16f1e0f3ad0f62de34794930c625`.

Renaming a file preserves identity. Cropping, recompressing, rotating or replacing
its bytes does not. Such images can be viewed but cannot receive the authored
regions without a new visual review and metadata update. A filename match is
never sufficient. Regions are approximate component/label bounds, **not**
terminal coordinates or instructions to probe.

## What was transcribed

The first blinker component set identifies the turn-signal switch, stop-lamp
switch, emergency warning relays, turn-signal indicator relay, sequential
turn-signal relay and motor, front parking/turn lamps, and separate left/right
banks of three rear stop/turn lamp symbols. These labels are visible on the
exterior electrical schematic. The exterior location page provides a separate
physical-context reference where its callouts are legible.

The component index remains a non-electrical grouping. The separate **Trace
power** view now transcribes the limited factual connection subset below.
There are still **no pin/cavity assignments, protection ratings, expected
meter readings, operating-state contact truth tables or sequence timings**.
Nothing depicts simulated or measured live current.

## Power trace subset

`src/trace-data.ts`, revision `cougar-1967-trace-1`, is the connection source.
Scan 6 was re-inspected at full resolution with local crops; source-run
coordinates were checked using local overlays against the original pixels.
Scan 5 remains a **physical-location reference only**, not a continuity proof.
Scan 4, the two XR-7 sheets and Scan 10 were also inspected for possible
upstream context. None was used to fabricate a missing battery-to-459 edge.

| Checked printed evidence on Scan 6 | Interpretation limit |
| --- | --- |
| 459 at the indicator relay; 459 on both sides of the lower rear-harness connector; 459 at the sequential motor connector | Known feed continuation boundary, not a verified battery source. Indicator-relay internals/supply are unresolved. |
| Motor common/contact drawing and separate 436, 437, 438 leads | No motor phase, sequence order, timing or guaranteed closed contact is asserted. These are parallel branches, not series devices. |
| 437 at motor and sequential-relay input; 436/438 and 436A/438A at emergency relay, A-suffixed leads at sequential relay | Matching labels establish the external continuations; emergency-relay internal contact behavior remains unknown. |
| Sequential-relay individual outputs 442/443/444 (left rear), 447/446/445 (right rear) | Each ends at the corresponding numbered lamp symbol. Drawing order does not establish physical lamp position or sequence order. |
| Front 448/449 at sequential relay and body/front-harness joins; 448 at left-front lamp | Same-number connector continuations, not invented wires following the heavy harness outlines. |
| Right-front lamp lead printed **499**, compared with 449 in harness/legend | Explicit discrepancy: no 449-to-499 continuity asserted. A corrected source or qualified vehicle-specific identification is needed. |
| Local ground symbols at rear lamp cases; 57/57A or 57C at front lamp return connectors | Not proof of a sound socket/chassis attachment or a checked return bond to battery negative. The 14-series leads are separate parking feeds, not presumed grounds. |
| Control branches 440/441 at switch/relay and body joins; separate 475 branch at stop switch, lower rear-harness connector and relay | Discoverable parallel/control context, not an assertion that brake/hazard and turn modes share an identical active path. |

The rear assembly identifier is reproduced contextually as printed: **13449**
on some schematic labels and **13A449** elsewhere. It is not normalized into a
claimed physical connector cavity or replacement-part identification.
Selected legible wire-color legend entries are transcribed alongside their
printed circuit numbers. The faint 445 legend is left **not transcribed**.
Selection/report styling is never a replacement for actual wire-color identity.

Every ordered point has page/region evidence. A point's incoming link is
explicitly a drawn run, matching-number continuation, unresolved contact state
or source gap. Short highlighted segments follow visible ink runs, excluding
numbered text and harness outlines; they do not claim that the whole route is
drawn or known. Highlights apply only to the fingerprint-matched original.
Normalized coordinates refer to the full **3300 × 2550** Scan 6.

The remaining evidence needed for a complete active-route explanation is:
the battery/protection-to-459 connection and indicator-relay internals; a
reviewed motor/emergency/sequential-relay operating-state table covering
turn selection, motor phase, ignition, brake and hazard conditions; resolution
of 449/499; actual rear lamp position mapping; and vehicle-specific return
attachments/battery-negative bonds. No power-probing procedure is established.

Trace reports are user evidence, separate from this transcription. A voltage
value does not become a pass/fail result. A responding/nonresponding pair may
identify a candidate **review** interval, but does not establish a measured
fault boundary, rule out the return, or account for unknown sequence phase.
Changing conditions, endpoint or intake invalidates that comparison while
preserving the raw readings and their original contexts.

## Review status

**Source transcription: not expert-reviewed.**
**Diagnostic rules: authored observation-led triage, not expert-reviewed.**

Component facts are linked to source regions. Triage suggestions are separate
authored reasoning, labeled as observations, plausible areas or missing
evidence—not claimed to be factory diagnostic instructions. Software tests
verify rule behavior and source identity; they do not certify electrical
accuracy, safe repair procedures or vehicle roadworthiness.

The car's year/model, trim, modifications, installed parts and wiring condition
must come from the owner, not from the fact that a factory drawing exists.
XR-7 sheets are browseable references, not automatically applied to a
standard/unknown car. For unknown or modified sequencing mechanisms, obtain
the actual installed system's documentation before selecting electrical tests.

## Requirements for adding procedures

Before enabling invasive tests or expected-active current-path explanations, obtain qualified
review of exact vehicle applicability, operating state, source revision,
terminal identification, protection requirements, safe isolation procedure,
equipment and pass/fail criteria. Preserve citations and explicit review status.
Do not let future model output create or override approved procedures.
