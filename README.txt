# NPC.exe — The Little Light Chronicles

**An AI courier uses a real computer to help his village. Only verified work changes the world.**

Pip reads orders, fills out a worksheet, and exports a shipping plan on a real Pine Computer. When inventory changes, his first file is rejected. He must reopen the task, correct his work, and produce a valid replacement before the village receives its deliveries.

Built for the Pine Computer hackathon, October 17, 2026.

## The point, in plain English

An agent saying “done” is not enough. Did it produce the right result? Can it recover when the situation changes?

NPC.exe makes those questions visible. A game provides the stakes, a real computer provides the workspace, and independent checks decide whether the work counts. The result is a small, inspectable testbed for computer-using agents.

There are three main parts:

- **Pip is the worker.** The agent operates the browser and solves the task.
- **The world shows the consequences.** Verified files become bridges or deliveries.
- **The Director sets the challenge.** Repeatable levels become harder or easier based on verified live outcomes.

## The recovery demo

1. Start a delivery-depot journey. Pip reads the orders and available stock.
2. Queue **Damage 2 at inspection** while he works.
3. Pip fills the worksheet and downloads a real dispatch manifest.
4. When that first file arrives, the queued damage changes inventory. The verifier returns the outdated file with an explanation.
5. Pip gets one repair turn on the same Pine computer. He reloads the workshop, reads the revised stock, corrects the worksheet, and exports again.
6. The verifier checks the new file. Only a valid result causes deliveries in the village.

In the recorded rehearsal, blanket stock fell from **7 to 5**. The first plan shipped 11 items and held 2; the corrected plan shipped **9 and held 4**. The second export passed after **47.491 seconds** from journey start. Both exact exports and their check results were retained locally.

The disruption, rules, and animations are authored. The browser work and repair were performed by the agent. The worksheet does not calculate shipping quantities for Pip.

## What the export files mean

An export is the actual result of the work, not a screenshot or a claim of success. Pip enters values into our workshop; its export button packages those values as JSON and downloads the file on his Pine computer. The server retrieves that artifact through Pine and checks it independently.

| Field | Meaning |
|---|---|
| `schemaVersion` | Version of the file format |
| `kind` | `dispatch` identifies a delivery manifest |
| `runId` | The journey that produced the file |
| `levelId` | The challenge and inventory revision it answers |
| `entries` | One shipping decision per unique order |
| `note` | Pip's note for a future journey |

An entry such as `{"orderId":"P113","ship":3,"hold":1}` means send three items for that order and leave one waiting for stock.

The verifier requires the current journey and level, each unique order exactly once, and exact quantities allocated in first-seen order. It rejects overshipping, incorrect holds, missing orders, and stale exports. A SHA-256 fingerprint identifies each retained file's contents; it is an integrity check, not a digital signature.

## Missions, memory, and replay

- **Crossing:** draw a bridge in the browser within an ink budget, avoid rocks, and export a connected route.
- **Delivery depot:** reconcile orders and inventory. Higher tiers add duplicate rows and shortages.
- **Seeded levels:** the same generator version, seed, chapter, mission, and tier recreate the same challenge. Agent actions can still differ.
- **Director:** deterministic rules choose among three difficulty tiers per mission using verified live results. Manual play does not establish mastery.
- **Persistent journal:** successful live journeys can supply notes to later tasks of the same kind. Turn **Bring the journal** off for a fresh comparison. This is saved context, not model retraining; a verified output does not prove every sentence in its note is true.
- **Presentation mode:** foregrounds the drawings, objective, computer, and artifact handoff.
- **Replay a journey:** reconstructs saved events and displays actual retained exports. It is clearly labeled, uses no Pine credits, and contains no recorded browser video. **Retry this exact level** instead prepares a new live attempt.

## Run locally

Requirements: Node.js **22.12+**, npm, a Pine API key for live runs, and the `cloudflared` executable for the temporary workshop tunnel. Manual play needs neither Pine credentials nor a tunnel.

```sh
git clone https://github.com/poudelsubhan/npc-exe.git
cd npc-exe
npm ci
cp .env.example .env
# Add PINE_SANDBOX_API_KEY to .env. Never put it in browser code.
npm run build
npm run demo
```

Open **http://localhost:3210**. `npm run demo` starts the game and a temporary tunnel to its restricted workshop on port 3211. It does not start a paid agent; live work begins when you click **Give Pip a computer**. Keep the terminal open; Ctrl+C stops both processes and initiates cleanup.

For manual play, use `npm start` instead of `npm run demo`, open the manual workshop, complete the task, export, and import the downloaded JSON into the game. Manual results are labeled.

For a separately managed tunnel, run `npm start` and `npm run tunnel` in separate terminals, or set `WORKSHOP_PUBLIC_URL` to an existing tunnel targeting port 3211. Install `cloudflared` using the [official instructions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/).

| Configuration | Purpose |
|---|---|
| `PINE_SANDBOX_API_KEY` | Server-side Pine credential; required for live play |
| `PINE_SANDBOX_ENDPOINT` | Pine API endpoint; default is in `.env.example` |
| `WORKSHOP_PUBLIC_URL` | Optional stable workshop URL; otherwise use the temporary tunnel |
| `PORT` | Local owner interface, default `3210` |
| `WORKSHOP_PORT` | Restricted workshop listener, default `3211` |

**Never tunnel port 3210.** Owner controls and credentials stay on the local side. Only the restricted workshop is designed for public reachability.

A fresh clone starts with an empty journal and no saved live replays. Private `data/`, `.env`, and `.tunnel-url` are excluded from this repository. Complete a successful live journey to create your own replay.

## How it works

```text
Seed + level settings --> Director / challenge generator
                                    |
                                    v
Pip on Pine Computer --> workshop --> exported JSON
                                         |
                                  independent verifier
                                    /             \
                             returned           accepted
                                |                   |
                      feedback + one repair    world animation
                                                    |
                                             journal + receipt
                                                    |
                                             labeled replay
```

React renders the game, original SVG drawings, workshop, and embedded Pine desktop. A Node/TypeScript server owns the run lifecycle and uses the official Pine SDK. Shared Zod schemas validate incoming data. The verifier uses deterministic task rules rather than asking the agent whether it succeeded.

| Directory | Responsibility |
|---|---|
| `src/` | Game, drawings, workshops, live desktop, presentation and replay |
| `shared/` | Schemas, seeded generation, Director rules, and independent checks |
| `server/` | Owner/workshop HTTP boundaries, Pine integration, lifecycle, persistence |
| `tests/` | Offline rules, recovery, replay, lifecycle, and boundary tests |
| `docs/` | Demo guide, system design, verification evidence, dependency notices |
| `data/` | Local-only journal, exact artifacts, and receipts; created at runtime |

Campaign and journal writes are atomic. Active execution stays in memory and does not resume after restart. Each journey has one computer, at most two agent turns, a shared token budget, time limits, and cleanup. Saved receipts retain rejected and accepted export contents, timestamps, checks, and reported usage. Replay validates retained hashes and results before showing them.

## Verification and limits

```sh
npm run check
npm audit --omit=dev
```

The verified hackathon build passed **46 offline tests across 10 files**, strict TypeScript, Biome, dependency license checks, and the production build. Default tests use temporary data and make no paid Pine calls.

The live recovery rehearsal demonstrated one genuine rejected export followed by a valid correction on the same computer. It does not establish broad reliability. An earlier fresh-versus-journal comparison did not show a performance improvement; memory plumbing works, but improvement is not claimed.

The depot uses synthetic orders in a purpose-built website. There is no production warehouse integration. This is a single-owner local demo, not a hosted multi-user service. Longer-running production work would need durable jobs, stronger operational controls, and evaluation across many tasks.

See the [demo guide](docs/demo.md), [system design](docs/system-design.md), [verification record](docs/verification.md), and [third-party notices](docs/third-party-notices.md). Pine integration documentation is available [here](https://console.pinecomputer.io/docs/integration).

## Where this could go

The same pattern could test agents handling inventory, invoices, scheduling, or other office workflows: give them repeatable tasks, introduce changed information, validate the actual output, and measure recovery. These are potential applications, not integrations already built.

## Key concepts

| Concept | Simple explanation |
|---|---|
| Pip | The AI worker operating a computer |
| World | The visible consequences of verified work |
| Director | The deterministic challenge setter |
| Seed | A repeatable starting point for a level |
| Pine Computer | Pip's real cloud computer, browser, and files |
| Workshop | The task website we built for Pip to operate |
| Artifact | The actual exported result of the work |
| Schema | The agreed structure of an artifact |
| Verifier | Code that checks the result against current facts |
| Change order | An explicit change to stock while the task is underway |
| Recovery | Correcting work after receiving a failed check |
| Journal | Saved lessons supplied as context to future runs |
| Replay | A labeled reconstruction of saved events and real files |

## Keywords

`ai-agents` · `computer-use` · `pine-computer` · `agent-evaluation` · `agent-reliability` · `agent-memory` · `browser-automation` · `artifact-verification` · `error-recovery` · `procedural-generation` · `seeded-levels` · `deterministic-simulation` · `game-development` · `interactive-demo` · `replay` · `typescript` · `react` · `nodejs` · `vite` · `hackathon`
