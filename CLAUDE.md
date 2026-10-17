# NPC.exe
A local single-player game: Pip uses a real Pine computer to solve seeded bridge/depot challenges. A deterministic Director selects the next task; verified field notes persist. Only independently verified artifacts can change the world.

## Invariants
- Never fabricate Pine activity or show manual play as autonomous.
- No API key, computer credential, or owner control route on the public workshop listener.
- Artifacts are bounded JSON data; never execute imported content. Bridges require current run/revision, bounds, rocks, ink and connectivity. Depot manifests require current run/level and exact order/stock reconciliation.
- Profile writes are serialized and atomic. Never overwrite unreadable history or present manual outcomes as live mastery. Fresh-Pip mode withholds all journal context.
- Tests must use temporary profile directories; never mutate the user’s data/profile.json.
- One active run. Scene is frozen while running, except one explicit run-scoped depot stock change queued by the owner and applied at first artifact inspection. Preserve original and revised levels and independently verify the repaired export. All Pine computers must be stopped in finally and on shutdown.
- Default tests are offline. Live smoke tests are explicit and limited.
- Do not log secrets or read .env into tool output.

## Deliberate exceptions
- Node/TypeScript instead of FastAPI: official Pine TS SDK and shared schemas remove a runtime and duplicated contracts.
- In-memory execution plus atomic local campaign/journal and artifact receipts instead of Postgres: single-owner demo. Restart preserves campaign/journal but loses active execution; Pine TTL bounds orphan lifetime. Add durable transactional jobs/storage before multi-user hosting.
- Native HTTP + periodic read-only polling instead of additional server/query frameworks: one current run, no cache invalidation or realtime event bus needed.
- Initial implementation exceeds 400 lines because this is a complete greenfield game; split into domain, Pine adapter, HTTP boundary, world and workshop.
- Local-only project: no deployment or git remote was requested. Commit locally after checks; push only once a destination exists.

## Checks
npm run check
npm audit --omit=dev
npm start (after npm run build); npm run tunnel in a separate terminal for Pine reachability.
