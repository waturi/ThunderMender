# ThunderMender

**Classic car wiring. Clear answers.**

A local-first electrical diagnostic workbench for the **1967 Mercury Cougar**.
The first working scenario is "My blinkers aren't working": safe observation-led
triage, linked to the owner's actual manual, without guessing which side is
broken or whether the car still has its factory wiring.

## Start locally

Node.js **22.12+ (22.x)**, **24.x**, or **26+**, and npm:

```sh
npm ci
npm run dev
```

For a production preview at **http://127.0.0.1:4173**:

```sh
npm run build
npm run preview
```

Keep the terminal open. The app's terminal canvas can run this command
persistently; no detached shell or cloud service is needed. No secrets, API keys,
accounts, database servers, or environment configuration are required.

Use the **same address and port** to keep using the same local browser data.
`localhost`, `127.0.0.1`, a LAN address, and different ports are distinct origins.

## First session with your Cougar

1. Open **Manual library → Choose a folder**, or **Choose scans** and select the
   owner's JPEGs. Importing all 13 scans is supported. Nothing is uploaded.
2. Answer the guide's first safety question, then confirm year/model, trim and
   installed sequential mechanism. Choose **unknown** rather than guessing.
3. Record each front and rear side, individual rear-lamp behavior, brake/hazard
   observations, and previous work. Evidence buttons open exact source regions.
4. Use **Field notes & recheck** for observations, existing measurements, repair
   history, and post-repair checks. Changing an earlier answer invalidates later
   answers and rechecks; historical notes are retained.
5. **My cases → Export current case** makes a portable JSON backup.

The local scans inspected for this build are named **Scan 6.jpeg** for the
exterior/turn-signal schematic and **Scan 5.jpeg** for the exterior physical-location
drawing. The cover is **Scan.jpeg** and air conditioning is **Scan 12.jpeg**.
Earlier filename descriptions were inconsistent with the actual files.
The app matches **SHA-256 fingerprints**, not names, so renaming a file is safe.
Recompressed or different images are browse-only, without potentially incorrect
hotspots. See [source provenance](docs/SOURCES.md).

The source viewer supports dragging, pinch zoom, zoom buttons, reset, and
keyboard `+`, `-`, arrow keys, and `Home` when the viewport is focused.
Focus dims areas outside a selected component's source region. The stable
component map is an explanatory index, **not** a fabricated electrical schematic.

## Trace power to a blinker

Open **Trace power** in the diagram toolbar, **Trace power to a lamp** in the
guide, or the trace action below a selected component. Choose a front lamp or
one of the six individual rear lamp symbols. Rear "upper/middle/lower" means
position **on the schematic**, not a verified inboard/outboard position on the car.

The ordered companion traces a checked subset of **Scan 6.jpeg**:
the **459 feed continuation** at the indicator relay, its rear-harness join,
sequential motor/contact branches, the emergency/sequential-relay interface,
the selected numbered lamp output, front harness joins where applicable, and
the lamp's drawn return. Click a point for its circuit identity, source regions
and evidence form. Source buttons open the matching original page with focus
dimming and short, checked wire-run highlights. The source-view point selector
and **Trace & record** return button preserve your place.

**This is an honest partial connection trace, not a complete battery circuit or
simulation.** Battery/protection-to-459 continuity, internal relay/motor contact
states and the full return bond to battery negative are not established.
The right-front lamp lead is printed **499**, while the relevant harness and
legend identify **449**; the app does not silently join them. See the exact
[trace evidence and gaps](docs/SOURCES.md#power-trace-subset).

Record the ignition, turn, brake and hazard conditions of an **existing**
observation. Then record a point as unknown, reportedly responding, reportedly
not responding, or previously measured. Existing measurements retain the raw
reading, units, reference, load state, notes and condition snapshot; no numeric
threshold diagnoses a part or treats an unloaded reading as a good supply.
Reports can bound a **candidate review interval**, not a verified fault boundary.
Bank-level intake observations never establish an individual rear bulb's state.

Changing endpoint, conditions or an intake answer retires earlier comparisons,
including when switching back. History is retained in local saves and JSON
handoffs. Edits append replacement reports; **Undo last point report** withdraws
a report without deleting it. **Reset current trace evidence** starts a fresh
comparison while retaining all history. No new probing or powered-testing
procedure is authorized by any trace point.

## Phone companion and handoff

The responsive guide works on a phone. For a private, trusted home LAN preview:

```sh
npm run preview -- --host 0.0.0.0
```

Open `http://YOUR-COMPUTER-LAN-IP:4173` on the phone, on the same network. This
exposes the static app to your LAN, not your browser's stored cases or scans.
Do not port-forward the development or preview server to the Internet.
Use HTTPS on any eventual public host. The computer and server must stay on.

Export the desktop case, transfer the JSON with your chosen method, then select
**My cases → Import case** on the phone. Import creates a **new copy**, never an
overwrite. There is **no automatic sync or merge**. Manual images are not in the
export; import your own copies on each device. This is not an installable
offline PWA: the page must initially load from a running server.

## What works, and what does not

| Available now | Explicitly outside this release |
| --- | --- |
| Searchable components and all 13 manual page records | General coverage of other vehicles |
| Private JPEG/PNG import, IndexedDB storage, source regions, pan/zoom | Included or publicly redistributed manual scans |
| Branching deterministic intake, unknown/mismatch/heat stops | Electrical probing procedures, pinouts, fuse ratings or repair prescriptions |
| Front/rear asymmetry, partial rear lamps, brake/hazard comparisons | Proof that a particular component has failed |
| Source-backed partial power traces for eight lamp endpoints, source-run highlights and condition-specific reports | Complete battery-to-return route, verified relay states, timing or energized-flow simulation |
| Multiple local cases, JSON handoff, notes and repair rechecks | Accounts, automatic device sync, cloud backup |
| Usable without keys, no inference charges | Live AI explanations or simulated current flow |

Source transcriptions and authored triage rules are **not expert-reviewed**.
Source citations establish which components the manual shows, not the wiring
or condition of a particular car. Tests establish software behavior, not
automotive correctness. Unknown or modified mechanisms never receive factory
motor test instructions. The guide produces plausible areas and missing
observations, not a diagnosis or a parts shopping list.

**Safety:** do not energize suspect overheated/burning wiring. Stop for smoke,
heat or a burning smell and seek qualified help. The app prescribes no invasive
tests: no live continuity checks, unknown-terminal jumps, protection bypasses,
or fuse substitutions. Exterior signal/brake failures must be resolved before
driving. User-reported rechecks are not a roadworthiness certification.

## Local data and privacy

- Cases: `localStorage`, key `thundermender.cases.v1`.
- Manual images: `IndexedDB`, database `thundermender-manuals-v1`.
- No application API, analytics, remote fonts, external image service, model
  requests, or image uploads. Browser-side search and diagram controls are free.
- Imports are bounded and validated: 2 MB case JSON, 40 local cases, 200 notes
  and 200 trace reports per case, 2,000 characters per note; 30 images/200 MiB per batch, 25 MiB and
  50 megapixels per image. Genuine JPEG/PNG signatures and decoding are checked.
  SVG/HTML and arbitrary source URLs are not accepted.
- User-entered text is rendered as text, never executable markup. Imported
  answers must be a valid ordered path through the current deterministic guide.
  Saved conclusions are never trusted/imported: guidance is recomputed.
- Older schema-v1 cases without traces load with an empty trace. New exports
  include a separately versioned trace dataset; use the same current app build
  on both devices. Active report contexts and source-point IDs are validated.
- Corrupt saved case data is not silently overwritten. Recovery download and
  an explicit replacement action are available. Save/quota failures are visible.
- Clearing site data, private browsing expiry or browser eviction can remove
  local data. **Export cases and keep the original scans.** This is not a backup
  service. Avoid editing the same origin's cases in multiple tabs simultaneously.

Manuals and local screenshots are gitignored. Do not put scans into `public/`,
commit them, or include them in a public deployment without rights confirmation.
Only authored code and factual source metadata are shipped.

## Validation

```sh
npm run check                 # unit tests, TypeScript, production build
npx playwright install chromium
npm run test:browser          # desktop and phone-sized Chromium
```

To exercise the **actual private manual**, not a mock, point the optional browser
test at your own local folder (no absolute user path is embedded in the app):

```sh
THUNDERMENDER_MANUAL_DIR="/path/to/your/manual-folder" npm run test:browser
```

That test imports scans through the UI, verifies all 13 fingerprints and
clickable regions, and reloads the browser to check persistence. It is skipped
without the variable; synthetic image tests still run. Browser artifacts may
contain private scans: `test-results/` and `playwright-report/` are gitignored.
Do not publish those artifacts from a private-manual run.

Unit coverage includes safe/mismatch/unknown branches, both sides, individual
rear lamps, modified wiring, downstream invalidation, malformed imports,
case/storage failures, endpoint-specific connections, explicit source gaps,
condition applicability, trace context invalidation and source-link identities. Browser coverage exercises
the real guide, edits, notes, handoff, image import, source focus, persistence,
panel controls, trace recording/edit/undo, original-scan overlays and responsive layouts.

## Architecture

React + TypeScript + Vite. Runtime dependencies are React and a small local
SHA-256 implementation (also usable on a private HTTP LAN). No graph service
or general-purpose CAD framework.

- `src/data.ts`: source identities, component facts, normalized region citations.
- `src/diagnostics.ts`: pure question-path, invalidation and triage rules.
- `src/cases.ts`: strict portable case schema and local persistence.
- `src/validation.ts`: shared strict case/answer validation.
- `src/trace-data.ts`: bounded, cited connection subset and explicit source gaps.
- `src/trace.ts`, `src/TracePanel.tsx`: context-specific trace evidence and UI.
- `src/manuals.ts`: byte validation, fingerprints and IndexedDB transactions.
- `src/Diagram.tsx`: stable component map and original-image viewer.
- `src/Guide.tsx`, `src/Notes.tsx`, `src/Library.tsx`: task-specific UI.

## Cost-conscious Azure path (not deployed)

**Current infrastructure spend: $0. No Azure resources are created.**
Keep the $50/month infrastructure ceiling separate from future AI-token spend.
For light traffic, the target is **$10–25/month or less**, not a service commitment
or current pricing quote:

- Start with a static host, such as Azure Static Web Apps' free tier if its
  current quotas/terms suit the project. Serve only `dist/`; user manuals remain
  browser-local. No database or search service is needed.
- If server features become necessary, add a **scale-to-zero consumption API**
  and only then minimal Blob/Table storage. Account for storage, requests,
  egress and log retention; cap telemetry retention and set budget alerts.
- No Azure AI Search, AKS/GPU, always-on relational database, paid plan or custom
  domain is needed for this version.
- Optional Azure OpenAI explanations would require a separately approved
  backend, server-side credentials/managed identity, authorization, bounded
  source retrieval, request/token limits and a separate token budget. Models
  must not override approved diagnostic rules. No such endpoint is implemented.

Before provisioning: approve region, account, current price estimate, access
policy and budget alerts. Alerts are **not** hard spending caps. Manual/image
upload and redistribution require separate approval and rights confirmation.
