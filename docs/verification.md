# Verification — October 17, 2026

## Live Pine evidence

Both successful runs used the actual Pine browser, actual exported JSON, server-side artifact retrieval and independent verification. The computer was released after each attempt.

| Run | Input | Result | Start → verified | Pine-reported charge |
|---|---|---|---|---|
| 801fa711-19de-419c-93e2-9ec0a7063c5d | Default rocks, amber | Eight tiles across row 0; Pip reached home | 27.629 s | USD 0.0115 |
| 280ff70b-c53b-4761-8eb6-088c36c1dba4 | New rock at (5,0), mint | Eight tiles across row 1; old route avoided; Pip reached home | 38.871 s | USD 0.0113 |

Exact files and receipts are retained in the local `data/` directory (gitignored). Baseline SHA-256: `917132102c75cd74e3befa8e70baa4779b443f8e84780b3edea98f957d9a2f18`. Changed-world SHA-256: `12500d0ddb20ea541590f2d001986d9921e74ee8f878497540fd8458cf87bd6e`.

Two earlier attempts with very low token allowances ended after inspecting the workshop and produced no artifact. Both released their computers and the game showed failure without creating a bridge. The second reported USD 0.0145; usage was not captured for the first. The successful allowances were increased to accommodate Pine’s repeated/cached context. These observations are not a reliability or latency guarantee.

## Local gates

26 tests pass, covering the parser and rule violations, changed obstacles, impossible worlds, stale capabilities, frozen scenes, concurrent and repeated imports, exact file persistence, failed/missing/oversize Pine artifacts, cleanup outcomes, owner-origin/Host checks and absence of owner routes on the public listener. Lint, strict TypeScript, dependency license review, production build and production dependency vulnerability audit pass (zero reported vulnerabilities at verification time).

Browser checks: desktop presentation layout, 390-pixel mobile width with no horizontal overflow, live view connection, two crossings, obstacle/color editing, proof display, manual drawing/export, keyboard tile activation, help dialog Escape dismissal and zero captured browser errors. A one-tile manual download was rejected; a completed eight-tile download was accepted as manual and crossed.

The Chrome automation extension refused file selection because its file-URL permission was disabled. Manual export was tested in the browser; those downloaded bytes were submitted through the local import API. The file-picker selection itself was not automated. No browser permission was changed.

The final resource and local race fixes were covered by offline tests after the live checks. No additional paid runs were made for presentation-only changes.
