# Recovery, handoff and presentation verification

Verified on 2026-10-17. Extension checks: 46 offline tests across ten files, strict TypeScript, Biome, 168-package license review, production build, and zero production dependency vulnerabilities. No dependency was added.

## Actual recovery rehearsal

One paid journey, two agent turns on the same computer/session. No additional paid trials were needed.

- Run: `f33198dc-b6f4-42a6-85d3-91c7763b731b`.
- Original task: `v1:little-light:1:depot:3`; changed identity adds `:damage:blanket:2`.
- Stock: blankets 7 → 5, explicitly queued by the player and applied when the first file arrived.
- Original file: 744 bytes, SHA-256 `673a74a792c4320acdd6ba54abf911f76fa663df24a357dcbee33e53e2949844`. Independently checked: correct under original stock; invalid under the revised challenge.
- Repaired file: 794 bytes, SHA-256 `645d15428f00c7ff7cafb8f1d98030baf5d5356274eb85dcb7214ff882562919`. Independently checked against revised stock: 9 shipped, 4 held; all orders reconciled.
- Start → accepted: **47.491 seconds**. Reported aggregate agent usage: **212,356 tokens**, **USD 0.01896438**. This is reported agent usage, not a claim about all possible provider infrastructure charges.
- One rejected export, one successful repair. The Pine computer was released.
- Pip's exported note explicitly discussed reloading after stock changes and checking a different discrepancy against fresh source data. The journal adds the factual recovery outcome.

## Extension checks

- Offline tests prove correct-old → reject-after-change → accept-repaired, exact retained bytes, one queued change, idempotent queue retries, stale/late changes rejected, one computer across two turns, shared token allowance, aggregated usage, bounded failed repair and cleanup, refusal to retry without reported usage, and preservation of rejected UTF-8 byte-order marks.
- Replay compatibility accepts old receipts. Projection hides future artifacts/results; seeking backward restores the uncompleted state. Unknown IDs and corrupted retained files are rejected. Owner change/replay routes are unavailable on the public workshop listener.
- Browser: actual live desktop, queued/applied damage, returned/accepted envelope, both artifact dialogs, final deliveries, presentation entry/exit, replay play/pause/restart and keyboard seeking. Escape closes the artifact dialog and restores focus to its opener.
- Saved recovery replay loaded in a fresh local server process on port 3310 with `PINE_SANDBOX_API_KEY` explicitly empty. Live start was disabled, but saved accepted/rejected artifacts and events replayed successfully. The process created no active run. The temporary server was then stopped; normal demo remains on 3210.
- At 390×844, page width was exactly 390; no horizontal overflow. Temporary viewport reset. Desktop presentation was also inspected. A component-key collision and collapsed drawing height found during review were corrected.
- Reduced-motion CSS retains all status information and uses static envelope placement; no full assistive-technology audit or OS-level reduced-motion walkthrough is claimed.

The replay is explicitly an event-and-artifact reconstruction. Browser video was not recorded. One successful recovery proves this exercised case, not broad agent reliability. Source files and private evidence are retained in the local project.

---

# Director, journal and depot verification

Verified locally on 2026-10-17. All records below distinguish offline tests, real browser inspection and paid provider runs.

## Automated checks

`npm run check`: formatting/lint, strict TypeScript, 46 tests across ten files, license review of 168 locked packages and production Vite build passed.

- Generator sweep: 500 seeds at each of three tiers; identical generation for repeated identities; every generated bridge solvable; requested rock counts attained. Generated depot allocations conserve stock and tier-3 shortages total two units.
- Verifiers: original bridge cases plus current ink limit, manifest schemas, stale run/level, duplicate/missing orders, overshipment, incorrect holds and extra executable fields.
- Director: live clean success advances; manual work does not; rejected export keeps tier; failed hard attempt backs off; hardest clean success changes mission.
- Journal: atomic serialized updates, schema rejection, corrupt-file preservation, 0600 permissions, restart restoration, idempotent artifact import, actual note retention, source filtering, memory-off withholding and retained history.
- Existing lifecycle/Pine mocks: no completion without artifacts, exact artifact bytes, failed turns, size/type constraints and cleanup. These tests make no paid calls.
- Real loopback HTTP tests: owner/public separation including campaign route, origin/header/Host guards and capability expiry. Temporary profile directories prevent tests touching the user’s journal.
- Manual upload transport regression: sends the original File body unchanged, preserving whitespace for SHA-256 receipts.

## Real Pine depot comparison

Same challenge: `v1:little-light:1:depot:3` (generator v1). Five unique orders, six incoming rows including one duplicate, 11 units available and two units unavailable. Each valid manifest shipped 11 and held 2.

| Observation | Fresh Pip | Journal supplied |
|---|---:|---:|
| Result | Verified | Verified |
| Prior notes supplied | 0 | 1 |
| Time start → verified | 37.903s | 38.499s |
| Provider tokens (including cached/repeated context) | 149,496 | 193,799 |
| Reported cost, USD | 0.013605888 | 0.014495676 |
| Rejected exports | 0 | 0 |
| Cleanup | Released | Released |

Two paid calls for the earlier Director/journal upgrade, USD 0.028101564 reported combined. The second was slightly slower and cost more. These trials verify delivery and memory plumbing; they do not demonstrate a performance improvement or generalization.

Fresh run: `79bd30c4-352b-4a7a-ae75-1b8edba3d67a`.
Journal run: `58d21f65-5881-4eaa-824c-ef862466929c`.

The first exported note warned to process first-seen orders and recheck stock, with a limitation about repeated IDs representing the same shipment. It was supplied to the second run’s browser workspace. Both new notes and receipts survive in the local profile. Exact downloaded manifests and per-run records are retained in `data/`.

## Browser checks

- Desktop: seeded controls, mission/difficulty selection, fresh/journal toggle, actual Pine desktop, live success, lit houses, visible holds, journal notes, comparison table and receipt action.
- Director button after live tier-3 depot success selected chapter 2, bridge tier 1, with the reason displayed.
- Journal opened as a native modal; Escape dismissed it and restored focus to its launcher.
- Phone viewport 390×844: document width stayed 390 pixels with no horizontal overflow. Temporary viewport reset afterward.
- Browser console had no captured errors or warnings during the live flow.
- Actual server/tunnel restart restored the depot seed, tier, memory setting, two live notes and the manual rehearsal entry. The live comparison remained available for the same level.
- Seeded manual bridge regression: painted eight row-4 water tiles using the actual browser controls, added a note and downloaded the JSON. Imported those exact downloaded bytes through the local owner API; status succeeded, source remained manual, fingerprint matched. Pip crossed the route.
- Manual file-picker interaction was not re-automated: the earlier test environment lacked Chrome extension file-URL access. File-body preservation has a dedicated transport test, and the exact downloaded file was verified through the real import endpoint. No browser permissions were changed.

## Limits

No new live Pine bridge run in this upgrade; the original project already had two successful live bridge runs, and this change checks the seeded bridge through offline rules plus actual manual UI/export/import. No broad paid multi-seed benchmark, screen-reader audit, production load test or durable in-flight recovery claim. The Director has three authored difficulty tiers per mission. Notes are procedural context, not weight training, and their prose is not independently truth-verified.
