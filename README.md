# NPC.exe — A way home

A tiny courier borrows a real computer, draws a bridge in a browser, exports a file, and walks across that exact artifact inside his game.

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

## Demo

1. **Give Pip a computer.** The view-only screen is his actual Pine browser. Activity comes from Pine, not a prewritten sequence.
2. Watch him paint and export. The server retrieves the downloaded artifact and independently checks it. Only a valid file creates a bridge.
3. **Inspect the proof.** Show the original file’s SHA-256 fingerprint and all six checks.
4. **Place a rock** on the previous bridge, optionally change its color, save the world, and send Pip again. No solution is supplied to him.

See [the demo script](docs/demo.md), [system design](docs/system-design.md), and [verification evidence](docs/verification.md).

## What is real, what is authored

The character, goal, dialogue, world art and walking animation are authored. Pine chooses the route and operates the workshop. The downloaded data determines the bridge and the walkable path. A deterministic verifier, not the model’s claim, decides success. This puzzle could be solved with a conventional pathfinder; the idea is an NPC using software beyond its game, not a new pathfinding algorithm. There is no claim of consciousness or learning across runs.

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
- `data/bridge-<run>.json`: exact verified download; never rewritten.
- `data/receipt-<run>.json`: journey record, checks, fingerprint and provider activity.
- `tests/`: no-cost default verification.

The world and active run live in process memory. Restarting resets the world; saved evidence remains in `data/`. An interrupted or failed run does not create a bridge. Cancel and Retry retain the current challenge. Never tunnel port 3210: only port 3211 is designed for public reachability. The project is a single-owner local demo, not a hosted multiplayer service.

## Dependencies

Pine server SDK 0.3.3 and browser SDK 0.3.7 (Apache-2.0); React, Vite, TypeScript, tsx, Vitest, Zod and Biome (see the dependency notices for all licenses, including MPL-2.0 and CC-BY-4.0 transitive components). `package-lock.json` pins the full dependency graph. React handles the two interactive screens; Zod parses untrusted JSON; the Pine SDK handles lifecycle/transport; Vite builds and lazily loads the live desktop. No database, background queue, agent framework or UI component library is needed.

Official integration reference: https://console.pinecomputer.io/docs/integration
