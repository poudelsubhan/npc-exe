# Director & delivery depot — implementation plan

Execution: one agent, existing main branch; local commits after verification. No remote exists. Project CLAUDE.md's local-only exception applies; no delegation or publication. User has authorized the full implementation, including the proposed seeded curriculum, journal, comparisons and depot mission.

## Target and acceptance
AC1: Versioned seeds recreate identical bridge/depot challenges; generation always produces legal, solvable inputs.
AC2: A deterministic Director chooses a new challenge from verified live outcomes; failures receive practice, manual rehearsal does not inflate ability. Reasons are visible. No automatic paid runs.
AC3: Persistent journal retains verified procedures, provenance and run metrics across restarts, is actually supplied to later Pine runs, and can be withheld for a fresh-Pip comparison without deleting history.
AC4: Depot has downloadable orders CSV, inventory, editable dispatch manifest, duplicate/shortage rules and server verification of exact exported bytes. Successful deliveries animate from the verified manifest.
AC5: Existing bridge play, public/owner isolation, cancellation and cleanup remain intact. Responsive, keyboard-accessible UI, recovery and demo guide.

## Findings and decisions
Existing React/Vite/TS app, native HTTP listeners, official Pine SDK, Zod contracts, 26 offline tests. The owner listener controls Game; the public workshop exposes only scoped read capabilities. Preserve this boundary and existing receipt mechanism. No dependencies or database needed: bounded, schema-validated, atomically replaced local profile, one process. Journal stores reusable observed procedure text with receipt references; it is not model training or proof of improved generalization. Versioned pure generator and independent verifiers remain authoritative. Benchmark runs are explicitly started, with memory on/off, and report observations without invented action counts.

## Sequence
| Phase | Task | Depends on | Verification |
|---|---|---|---|
| 1 | Seeded domains, Director policy, depot verifier, persistence | current app | generation sweeps, invalid manifests, restart/atomic persistence tests |
| 2 | Integrate Game, Pine context, HTTP, campaign/depot UI | 1 | regression suite, typecheck/build, real HTTP boundary checks |
| 3 | Full demo, bounded live checks, docs, review | 2 | browser flows, 1–2 paid runs initially, full npm run check |

### Phase 1
Practices: engineering §4–5; system-design §1,5,11; backend §2,7.
Files: shared/campaign.ts, shared/depot.ts, server/profile.ts; domain.ts ink-budget extension; targeted tests.
Mechanism: seed hash + deterministic PRNG, versioned level identity (seed/episode/mission/tier); bounded rock placement accepted only by reachability; tier-specific ink. Synthetic depot orders use bounded integer counts, duplicates by order ID, inventory shortages allocated in first-seen unique-order order. Manifest requires one entry per unique order, correct dispatch/hold quantities, current run and level. Profile uses strict schema, bounded history, atomic temp-write/rename and serialized updates; malformed profile reports a recoverable error rather than silently overwriting history.
Outputs: typed Level, JournalEntry, Manifest; pure generateLevel, chooseNext, verifyManifest and profile store. Gate: domain tests/typecheck then local commit at integrated phase boundary; no remote push per project exception.

### Phase 2
Practices: all above; frontend §3–5,7; product-design §4–10.
Files: contracts, game, pine, http, index, App, Workshop, World, new Campaign/Depot components, styles.
Mechanism: owner-only campaign mutation freezes during run/cleanup/import; run snapshots level and selected journal context. Public scoped workshop receives that snapshot, never owner controls. Pine reads journal and workspace, exports JSON; verifier controls world effects. Add typed metrics from provider usage, duration and rejection count. Journal records outcome once; manual sources stay distinct. Seed controls, chapter selection, Director recommendation, journal drawer, memory toggle and same-level comparison visible. Depot town SVG follows verified deliveries; data tools are a functional browser app. Gate: full npm run check + HTTP tests then local commit.

### Completion
Practices: engineering §5,12; product-design §11; system-design §11.
Files: docs, README, final fixes.
Verify seeded replay, restart, fresh-vs-journal context, bridge regression, depot rejection/success, mobile and keyboard, real Pine export and cleanup. Start at most two live runs; broaden only for observed failure. Final check, review diff/secrets, local commit. Record unverified limitations.

## Measures
1. 500 seeds × supported tiers: all generated bridge scenes solvable; same identity gives equal challenge; depot oracle manifests pass. Zero violations.
2. All malformed/stale/oversubscribed manifests rejected; journal persists once and memory-off sends no entries. Offline tests on temporary directories, no paid calls.
3. Live mission produces accepted artifact and released computer; report measured time/cost, not an improvement claim. Compare identical level identity when both modes have evidence.

## Completion record
All requested phases implemented. Phase 1 checkpoint: 5107b5f. Phase 2 checkpoint: 8e4fbd2. Final evidence is in docs/verification.md: 36 offline tests, 500-seed sweep at each tier, two verified live depot runs with released computers, exact-byte manual bridge regression, responsive and keyboard checks. No remote was created or pushed.
