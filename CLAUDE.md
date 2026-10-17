# NPC.exe
A local single-player game: a courier uses a real Pine computer to draw and export a bridge. Only independently verified artifacts can change the world.

## Invariants
- Never fabricate Pine activity or show manual play as autonomous.
- No API key, computer credential, or owner control route on the public workshop listener.
- Blueprint is bounded JSON data; never execute imported content. Verify run, scene revision, bounds, obstacles, ink and connectivity.
- One active run. Scene is frozen while running. All Pine computers must be stopped in finally and on shutdown.
- Default tests are offline. Live smoke tests are explicit and limited.
- Do not log secrets or read .env into tool output.

## Deliberate exceptions
- Node/TypeScript instead of FastAPI: official Pine TS SDK and shared schemas remove a runtime and duplicated contracts.
- In-memory run state plus local artifact receipts instead of Postgres: disposable, single-owner hackathon demo. Restart loses active state; Pine TTL bounds orphan lifetime. Add durable jobs/storage before multi-user hosting.
- Native HTTP + periodic read-only polling instead of additional server/query frameworks: one current run, no cache invalidation or realtime event bus needed.
- Initial implementation exceeds 400 lines because this is a complete greenfield game; split into domain, Pine adapter, HTTP boundary, world and workshop.
- Local-only project: no deployment or git remote was requested. Commit locally after checks; push only once a destination exists.

## Checks
npm run check
npm audit --omit=dev
npm start (after npm run build); npm run tunnel in a separate terminal for Pine reachability.
