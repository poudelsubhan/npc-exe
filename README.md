# NPC.exe — The Little Light Chronicles

Pip borrows a real computer, solves seeded challenges and brings verified files back into his world. A Director adapts the next challenge. Pip’s journal persists. A delivery-depot mission turns real orders CSVs and dispatch manifests into visible consequences.

## Run

Requires Node 22.12+ and a Pine project key. The project has been installed and built locally. For this configured copy, run `npm run demo` to start both the game and its temporary workshop tunnel.

```sh
cd ~/Projects/npc
npm install
cp .env.example .env # only on a fresh checkout; do not overwrite your existing key
# Set PINE_SANDBOX_API_KEY in .env, never in client code.
npm run build
npm start
```

In another terminal, expose only the restricted workshop:

```sh
cd ~/Projects/npc
npm run tunnel
```

Open **http://localhost:3210**. The tunnel helper uses the installed `cloudflared` command and writes its temporary URL to `.tunnel-url`. Keep both terminals open for live play. Ctrl+C stops them; the game cancels its agent and releases its computer on graceful shutdown. For a stable tunnel, set `WORKSHOP_PUBLIC_URL` in `.env` instead. The app rereads configuration before each run, so adding a key or starting a tunnel does not require a restart.

Manual rehearsal works without a Pine key or tunnel: open the workshop, draw, export, then import the downloaded JSON file. Manual play is always labeled.

## Play

- Enter a seed to create a reproducible world. Choose Crossing or Delivery depot and one of three difficulty tiers.
- **Give Pip a computer** starts a real Pine browser. Artifacts must pass independent checks before they affect the game.
- **Let the Director choose** selects the next level from verified live results. Manual work remains labeled and does not establish mastery.
- **Pip’s journal** retains field notes, evidence and measurements across restarts. Only verified live notes are recalled for future tasks of the same kind.
- Toggle **Bring the journal** and replay the same level to compare a fresh trial with one receiving prior notes. Each trial requires an explicit start.
- Depot difficulty 3 includes duplicate order rows and limited stock. Pip fills a dispatch worksheet; its verified export determines actual shipments and holds in Little Light village.

See [the demo script](docs/demo.md), [system design](docs/system-design.md), and [verification evidence](docs/verification.md).

## What is real, what is authored

Art, dialogue and missions are authored. The Director is deterministic. Pine’s browser actions, exported data, field notes and provider usage are real. Independent rules decide success. Journal memory supplies prior procedures; model weights do not change. A valid artifact proves a task outcome, not the accuracy of every reflection. One comparison pair does not prove improvement. Depot records are synthetic; no production logistics service is connected.

## Checks

```sh
npm run check
npm audit --omit=dev
```

The default suite is offline: domain edge cases, lifecycle, mocked Pine failure/cleanup cases, and real local HTTP boundary checks. It never calls Pine. Live play is explicitly triggered from the UI and uses credits. Runtime is ephemeral, one computer at a time, with a 120-second idle lease, a four-minute agent wall limit, a six-minute outer deadline and cleanup in `finally`. The token allowance includes Pine’s large repeated/cached context; a very small cap can end a run before the first edit. Exact provider usage appears in the activity log when available.

## Files and recovery

- `src/`: game, original SVG world, workshop and live desktop.
- `shared/`: parsed contracts, puzzle rules and independent verifier.
- `server/`: two HTTP listeners, run lifecycle and official Pine SDK adapter.
- `data/bridge-<run>.json` or `data/dispatch-<run>.json`: exact verified download.
- `data/profile.json`: private, atomically replaced campaign and last 200 journey entries.
- `data/receipt-<run>.json`: journey record, checks, fingerprint and provider activity.
- `tests/`: no-cost default verification.

The campaign and journal persist in `data/profile.json`. Active execution stays in memory and is not resumed after restart. Evidence files remain in `data/`. An interrupted or failed run cannot change the world. Cancel and Retry retain the current challenge. Never tunnel port 3210: only port 3211 is designed for public reachability. The project is a single-owner local demo, not a hosted multiplayer service.

## Dependencies

Pine server SDK 0.3.3 and browser SDK 0.3.7 (Apache-2.0); React, Vite, TypeScript, tsx, Vitest, Zod and Biome (see the dependency notices for all licenses, including MPL-2.0 and CC-BY-4.0 transitive components). `package-lock.json` pins the full dependency graph. React handles the game, journal and both workspaces; Zod parses untrusted JSON; the Pine SDK handles lifecycle/transport; Vite builds and lazily loads the live desktop. No database, background queue, agent framework or UI component library is needed.

Official integration reference: https://console.pinecomputer.io/docs/integration
