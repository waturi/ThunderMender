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

There are **no transcribed wire-color assertions, pin assignments, protection
ratings, expected readings, operating-state contact truth tables or sequence
timings**. The app intentionally draws no electrical connections or animations
in its simplified component index. The original image remains the reference
for circuit tracing by a qualified reader.

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

Before enabling invasive tests or current-path explanations, obtain qualified
review of exact vehicle applicability, operating state, source revision,
terminal identification, protection requirements, safe isolation procedure,
equipment and pass/fail criteria. Preserve citations and explicit review status.
Do not let future model output create or override approved procedures.
