# NPC.exe — The Little Light Chronicles

## Start

From `~/Projects/npc`, run `npm run demo`, then open http://localhost:3210. The local game and restricted workshop tunnel start together. Only clicking **Give Pip a computer** spends Pine credits. Manual rehearsal is free and clearly labeled. Keep the process running throughout the presentation.

## The story

“Pip is a courier. The world gives his work meaning. The Director chooses the next challenge. Pip leaves the game, operates real software, and returns with a file that has to prove it works.”

## Main demo: a shipment that survives a change

1. Select **Delivery depot**, difficulty **3 · Combine**, seed `little-light`. **Generate world** restores the original seeded stock if you previously changed it. Click **Present**.
2. Say: “Pip has a goal, a real computer, and a journal. The world only accepts files that pass independent checks.” Click **Give Pip a computer**.
3. While Pip works, choose **blanket**, then **Damage 2 at inspection**. Explain that damage is queued for inspection, not applied invisibly at an arbitrary earlier time.
4. The downloaded file arrives. Stock really drops from 7 blankets to 5. The file is returned; no parcels leave the depot. Open **export 1 · returned** to inspect the actual file and discrepancy.
5. Pip receives verifier feedback, reloads the dispatch desk and repairs the manifest on the same computer. The model must work out new quantities; the server never fills its worksheet.
6. The corrected export passes. The envelope travels home and the village lights up: **9 parcels shipped, 4 held**. Open **export 2 · accepted** and **Inspect the proof**. The journal keeps Pip's actual recovery note and the recorded outcome.
7. Say: “This is a small test environment for real workflow reliability: changed inputs, independent validation, bounded recovery, and evidence you can replay.” The Director retains the tier after recovery, rather than crediting a flawless first attempt.

The drawings and authored character dialogue make the consequences visible. Browser actions, downloaded files, stock checks and measured usage are real. Depot orders remain synthetic.

## Replay fallback: no new computer, no credits

Click **Replay a journey**, then select the latest **1 returned export** entry. A persistent **Replay of a verified run** banner gives the original date. Play, pause, restart or seek; default speed is 2×. The recorded rejection is near 0:32 and acceptance near 0:47 in the retained recovery run. It is an event-and-artifact replay, not a browser recording. The screen says that explicitly. Live mutation controls are absent; **Back to live world** returns without changing the game.

Replay was verified in a fresh server process with the Pine key disabled. Keep the local server running; no Pine connection or workshop tunnel is needed to view saved evidence.

## Optional wider story

Use the crossing mission to show an exported bridge becoming traversable. Open Pip's journal to inspect procedural notes and same-level fresh/remembered measurements. Let the Director choose the next challenge. A judge-chosen seed changes the problem deterministically; it does not script the agent's actions.

## Existing verified demo evidence

Two live difficulty-3 depot trials are retained in the local journal under seed `little-light`, chapter 1. Both shipped 11 parcels and held 2 units. Fresh Pip took 37.903 seconds (USD 0.013606); with one prior note, 38.499 seconds (USD 0.014496). Both exported valid files and released their computers. These are real observations, not a pre-recorded success played as live activity.

A third live depot journey now demonstrates actual recovery: one rejection, one repair, 47.491 seconds to verification, USD 0.01896438 reported agent usage, and a released computer. Use **Replay a journey** to walk through it without spending again. The earlier comparison remains in the journal for its original, unchanged level identity. The presentation screenshots in the task outputs show the verified town and measurements.

## Recovery

- A failed export cannot create deliveries. Pine gets one repair turn on the same computer; a second rejected export ends the attempt. Manual rehearsal can correct and import a new file within the bounded attempt limit.
- Cancel stops the attempt and releases its computer. Wait for cleanup before starting another run.
- A tunnel failure leaves the challenge intact. Restart the tunnel; the next run rereads its URL.
- Restart preserves the campaign and journal. Active execution is not resumed. **Replay a journey** loads retained verified events and artifacts; it never resumes the old computer.
- **Retry this exact level** keeps its constraints. **Generate world** starts chapter 1 for the entered seed. Custom rock edits are preserved as custom challenges; they are not reproducible from the original seed alone.
- Journal write failures are visible. A malformed profile prevents startup rather than silently erasing history. Preserve `data/profile.json` and restore a valid backup.

## Honest framing

The art, dialogue and missions are authored. The Director is a transparent deterministic curriculum policy. Pine’s browser actions, exported artifacts, field notes and measured usage are real. The journal supplies procedural memory; it does not fine-tune model weights. The game validates shipments, not the truth of every written reflection. This is a local agent-testing environment with synthetic data, not a production logistics product.
