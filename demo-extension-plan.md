# NPC.exe — Demo extension phase plan

Status: implementation authorized; extension not yet implemented or verified.

Execution: one agent, existing local `main` branch in `/Users/poudelsubhan/Projects/npc`. Preserve unrelated work, drawings, credentials and saved journeys. No delegation. Each phase closes with tests, integration and a local conventional commit. The project's explicit local-only exception applies: no remote exists, so no push or deployment. A failed check blocks the next phase.

## Target state

The demo tells one inspectable story: Pip prepares a shipment; the player queues damage at inspection; real stock changes; the exported manifest fails independent validation; Pip receives the actual discrepancy and repairs it on the same computer; only the corrected file lights up the village. An animated envelope connects those real events. Presentation mode foregrounds the drawings, computer and objective. Saved verified journeys can be replayed without Pine calls, clearly labeled as event-and-artifact playback.

Acceptance criteria:

- **AC1 — Real change:** one run-scoped change order reduces available stock at the first file inspection. An unchanged old file fails; no deliveries occur on rejection. Other world editing remains locked during a run.
- **AC2 — Real recovery:** at most one additional agent turn on the same computer and session, using verifier feedback and the updated workshop. Preserve both exact artifacts and their hashes, aggregate usage, and release the computer on every exit. Do not supply solved quantities or fabricate agent actions.
- **AC3 — Visible handoff:** received, checked, returned and accepted states come from recorded server events. The envelope opens an inspectable artifact and discrepancy. Existing drawings stay intact; reduced motion has equivalent static feedback.
- **AC4 — Honest presentation:** presentation mode emphasizes village, current objective and real desktop. Replay has a persistent “Replay of a verified run” label, original date, playback controls and an explicit notice that browser video was not recorded. Replay never starts Pine or changes the live world.
- **AC5 — Persistent evidence:** saved replay survives restart, validates retained artifact hashes and excludes credentials. Fresh and remembered trials stay comparable only when their actual challenge identities match. Recovery appears in Pip's journal.

Constraints: existing React/TypeScript/native HTTP/Pine SDK stack; no new dependency, cloud storage, service or generated artwork. One active run; bounded JSON; owner controls stay off the public workshop port. Offline tests use temporary directories. One bounded live recovery rehearsal supplies final evidence; no repeated paid trials without a new failure to investigate.

Out of scope: browser video recording, synthesized agent footage, multi-user deployment, general live world editing, unbounded retries, or claims that memory improves performance without measurement.

## Context and key findings

Verified from repository: `Game` owns live state and verifies exports; `PineJourney` currently creates one computer/session and one agent turn, then stops it. `ProfileStore` serializes atomic journal writes. Receipts already retain complete run events and accepted artifact metadata. Depot verification requires exact run/level identity and stock allocation. The workshop currently loads once. The owner server protects mutations separately from the public workshop. `App.tsx` has theater layout and a real desktop component; `World.tsx` and `DepotWorld.tsx` contain the drawings to preserve.

Required checks: `npm run check` runs formatting/lint, TypeScript, offline tests, licenses and production build; `npm audit --omit=dev` checks production dependencies. No CI or remote destination is configured. Existing tests cover domain, campaign, profile, lifecycle, Pine mocks, HTTP and journal behavior.

Design decisions: queue damage explicitly for inspection, so the initial export is genuinely made against the prior stock. Keep the original level alongside the revised level and assign the changed challenge a distinct identity. Store a bounded attempt history with exact artifact text, hash, timestamps and verifier result. Replay derives visible state from this history and existing events; it is not live computer playback. Validate same-session second-turn behavior in Phase 1 before relying on it.

## Summary

| Phase | Goal | Task | Frozen output | Gate |
|---|---|---|---|---|
| 1 | Define inspectable recovery | 1A | Change order, artifact attempt and replay contracts | Contract tests, SDK inspection, full check, commit |
| 2 | Perform and retain real recovery | 2A | Owner endpoints, bounded agent repair, verified saved replay | Lifecycle/HTTP/Pine tests, full check, commit |
| 3 | Make the story visible | 3A | Handoff, presentation and replay experience | Browser review, full check, commit |
| 4 | Completion | 4A | Rehearsed demo and truthful evidence | One live recovery, offline replay, docs, full check, commit |

Dependency graph: `1A → 2A → 3A → 4A`. A single task owns each phase because the work shares contracts, lifecycle and demo state. No concurrent writes or shared test accounts are needed.

## Phase 1 — Contracts and recovery boundary

Entry: current checked implementation, with the existing single-turn lifecycle and saved receipts.

### 1A. Define the bounded extension

- **Practices to load:** engineering-practices (typed boundaries, bounded agent execution); system-design-practices (state ownership and replay); backend-practices (contracts and idempotency).
- **Builds:** AC1–AC5 contract foundations and offline evidence fixtures.
- **Mechanism:** inspect installed SDK and current mocks for multiple sequential `session.agent.run` calls. Define a strict command `{runId: UUID, sku: lantern|blanket|tea, quantity: integer 1..2}`. Record one queued/applied change with before/after stock and original level. Add defaulted run fields so historical receipts still parse: original level, optional change order and bounded artifact attempts. Each attempt records number, exact UTF-8 JSON text, SHA-256, byte size, receive/check times, accepted flag and reason. Generate revised level identity from original identity plus stock change. Use a pure timeline projection to expose only events/artifacts available at the chosen playback position.
- **Consumes / produces:** existing level/depot/run schemas → frozen extension contracts and projection helpers.
- **Files:** `shared/contracts.ts`, new `shared/demo.ts`, new `tests/demo.test.ts`.
- **Verify:** old receipts decode with defaults; timeline never reveals success or an artifact before its timestamp; reject malformed changes and oversized records; inspect SDK types for same-session follow-up support. If unsupported, revise the recovery design before Phase 2.

Interfaces frozen: owner `POST /api/change-order` accepts the strict command and returns `StateSchema`; owner `GET /api/replay?id=<UUID>` returns a sanitized `RunSchema` only for a saved, verified Pine journey. Run history carries the typed attempts and change order above. No credential or desktop delegation is stored in replay output.

Gate: `npm run check`, then local `feat: define demo recovery and replay contracts`. Exit: compatible, tested contracts ready for server and UI. Single owner; no sibling dependency.

## Phase 2 — Real change, repair and saved evidence

Entry: Phase 1 contracts and validated SDK capability.

### 2A. Implement the authoritative lifecycle

- **Practices to load:** engineering-practices (failure tests, cost bounds); system-design-practices (failure/recovery ownership); backend-practices (authorization, revision guards, bounded work).
- **Builds:** AC1, AC2 and AC5.
- **Mechanism:** accept a change only for the current active depot run, once, with enough stock; identical retries are harmless and conflicting retries fail. Apply it when the first artifact arrives, before independent verification. Preserve original level, revise stock and identity, and make the updated workshop available on reload. Retain rejected exact bytes before displaying rejection. Keep delivery effects behind successful verification. On rejection, send the actual verifier reason and instruction to reload/review/export to a second agent turn on the existing session. Do not insert the computed answer. Ignore already inspected artifact IDs. Cap at two turns total within the existing overall timeout and a shared token budget; aggregate usage and always release in `finally`. Recovery journal notes include the verified rejection/retry fact alongside Pip's note. Persist sanitized run evidence. Read replay only for UUIDs in the owner's successful Pine journal; validate receipt/hash/exact artifact and rerun domain verification. Missing, corrupt or mismatched records return a recoverable error.
- **Consumes / produces:** Phase 1 schemas → owner API and durable attempt history for animation/replay.
- **Files:** `server/game.ts`, `server/pine.ts`, `server/http.ts`, `shared/depot.ts`, `tests/game.test.ts`, `tests/pine.test.ts`, `tests/http.test.ts`, new `tests/replay.test.ts`, `CLAUDE.md` scoped inventory-change invariant.
- **Verify:** valid original manifest is rejected after damage; revised manifest succeeds; no delivery on rejected input; one computer/session across both turns; repeated rejection stops after one repair; cancellation and cleanup; exact usage aggregation; stale run/double change/public port rejected; replay tamper and unknown UUID rejected; replay creates zero Pine calls. All tests isolate profile storage and server ports.

Gate: `npm run check`, then local `feat: recover rejected shipments and retain verified replays`. Exit: complete real server flow, no UI fiction. Single owner; no sibling dependency.

## Phase 3 — Demo choreography

Entry: Phase 2 authoritative endpoints and recorded stages.

### 3A. Connect the visible story

- **Practices to load:** frontend-practices (server ownership, request races, keyboard controls); product-design-practices (honest waiting, motion, failure and recovery); engineering-practices (simple components).
- **Builds:** AC3 and AC4, exposes AC1/AC2/AC5.
- **Mechanism:** a run-scoped change-order card lets the player select stocked items and queue damage at inspection. Show queued/applied/returned/repairing states in plain language. Workshop reload gets new stock without automatically solving the worksheet. The envelope progresses from computer to inspection to town using the stored attempt timestamps/results; opening it shows real parsed rows, hash and reason. Quick polling may receive several stages at once: replay their already-recorded transitions as presentation, never invent unfinished work. Keep world success gated on the accepted result. Presentation mode hides setup clutter while preserving an obvious exit, objective, damage control, real desktop and the original SVG village. Replay selection uses successful saved journal entries; play/pause/restart and elapsed time drive the pure projection. A persistent replay label and “Saved events and artifacts; no browser video recorded” replaces live desktop. Suppress all live mutations while viewing replay. Exit restores the current live view without changing server state. Handle empty history and invalid saved evidence visibly.
- **Consumes / produces:** server state and historical run → completed interactive demo.
- **Files:** `src/App.tsx`, `src/api.ts`, new `src/Demo.tsx`, `src/styles.css`, `src/DepotWorkshop.tsx`, `src/Workshop.tsx`; preserve SVG art in existing world components.
- **Verify:** inspect idle, working, changed, rejected, repaired, failed and replay states; keyboard access/focus, narrow viewport and reduced motion; live/replay identity stays visible; reload does not discard evidence; switching modes cannot send commands against a replayed run.

Gate: `npm run check` plus browser walkthrough, then local `feat: present the artifact handoff and honest demo replay`. Exit: integrated visual story. Single owner; no sibling dependency.

## Phase 4 — Completion and rehearsal

Entry: complete extension with passing offline checks.

### 4A. Prove and package the demo

- **Practices to load:** engineering-practices (meaningful verification and bounded live tests); product-design-practices (honest claims and journey review); system-design-practices (failure evidence).
- **Builds:** final evidence for AC1–AC5 and updated demo instructions.
- **Mechanism:** preserve user profile; inspect idle state before restarting. Run one real depot journey, queue one stock change, observe first rejection and a second export on the same Pine computer, then inspect exact artifacts and final receipt. Record actual results, usage and cleanup. Replay that saved journey with no Pine activity and after server restart. If the agent fails its single repair, keep the failed evidence, fix any demonstrated implementation issue, and clearly distinguish deterministic test coverage from live results. Do not label recovery verified without a real success. Update guide with a short judge-facing flow and the explicit replay fallback.
- **Consumes / produces:** Phase 3 app → verified running demo, screenshots and evidence summary.
- **Files:** existing repository docs plus user-facing copies in `outputs/npc-demo-guide.md`, `outputs/npc-verification.md`, screenshots under `outputs/`.
- **Verify:** `npm run check`, `npm audit --omit=dev`, one bounded live run, exact artifact reconciliation, computer release, persisted offline replay, final desktop/mobile visual inspection.

Gate: passing checks and documented live outcome, then local `docs: record the recovery demo evidence`. No push destination exists. Exit: all features integrated and actual limitations reported.

## Measurement

1. **Recovery integrity:** original accepted-under-old-stock file must fail under changed stock; corrected file must reconcile every row. One computer, at most two turns, zero delivery effects before acceptance. Baseline: current flow terminates on rejection. Evidence: Phase 2 tests and Phase 4 live artifacts.
2. **Replay integrity:** 100% of displayed shipment stages trace to retained records; hashes match exact accepted/rejected bytes; zero provider calls during replay. Baseline: receipts exist but have no playback UI. Evidence: Phase 1 projection tests, Phase 2 replay tests and Phase 4 offline walkthrough.
3. **Presentation integrity:** visible live/replay identification in every mode; all core controls keyboard reachable; no overflow at the inspected desktop and mobile sizes; reduced motion retains every status. Evidence: Phase 3/4 screenshots and walkthrough. These are completion checks, not claims about audience conversion or winning odds.

Evidence belongs in existing private run records and the verification guide. No production telemetry service or alerting is needed for this single-owner local demo.
