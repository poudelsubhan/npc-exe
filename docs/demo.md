# NPC.exe — The Little Light Chronicles

## Start

From `~/Projects/npc`, run `npm run demo`, then open http://localhost:3210. The local game and restricted workshop tunnel start together. Only clicking **Give Pip a computer** spends Pine credits. Manual rehearsal is free and clearly labeled. Keep the process running throughout the presentation.

## The story

“Pip is a courier. The world gives his work meaning. The Director chooses the next challenge. Pip leaves the game, operates real software, and returns with a file that has to prove it works.”

## Suggested live sequence

1. Enter a judge-chosen seed (letters, numbers, hyphens or underscores). Start with **Crossing**, difficulty 1. Explain that the same seed, chapter, mission, difficulty and generator version recreate the same challenge. Pip’s actions can vary.
2. Send Pip. The real Pine screen opens. He chooses a route and exports a blueprint. The independent verifier checks the actual bytes before the bridge appears.
3. Open **Pip’s journal**. A successful live export leaves a field note with its receipt fingerprint, timing, cost and supplied-memory count. Future runs of the same mission can read up to three recent verified notes. Manual work stays visibly separate.
4. Use **Let the Director choose** after completion. A clean live success raises difficulty. An unfinished live attempt gets easier practice; a result requiring rejected exports keeps the same tier. Manual rehearsal does not raise mastery. The reason is visible. Every run still requires an explicit click.
5. Switch to **Delivery depot**, difficulty **3 · Combine**. This is the real-world reveal: synthetic order records, a downloadable orders CSV, an inventory shelf, duplicate order IDs and a stock shortage. Pip fills a dispatch worksheet and exports a real manifest.
6. Watch the town light up. Shipments and holds come from the accepted manifest. Open **Inspect the proof**: one entry per unique order, correct stock allocation, current journey/level, and exact file fingerprint.
7. To compare, replay the same level with **Bring the journal** off, then on. The journal comparison reports the latest live result in each condition. An experienced trial requires at least one supplied note. A single pair demonstrates the mechanism; it does not prove improvement.

## Existing verified demo evidence

Two live difficulty-3 depot trials are retained in the local journal under seed `little-light`, chapter 1. Both shipped 11 parcels and held 2 units. Fresh Pip took 37.903 seconds (USD 0.013606); with one prior note, 38.499 seconds (USD 0.014496). Both exported valid files and released their computers. These are real observations, not a pre-recorded success played as live activity.

For a quick walkthrough without spending again, open the journal and its comparison tab with the same level selected. The presentation screenshots in the task outputs show the verified town and measurements.

## Recovery

- A failed export cannot change the world. Read the verifier message, correct the manual worksheet or retry Pine.
- Cancel stops the attempt and releases its computer. Wait for cleanup before starting another run.
- A tunnel failure leaves the challenge intact. Restart the tunnel; the next run rereads its URL.
- Restart preserves the campaign and journal. Active execution/animation is not resumed. Select the same seeded level to inspect its historical comparison.
- **Replay this exact level** keeps its constraints. **Generate world** starts chapter 1 for the entered seed. Custom rock edits are preserved as custom challenges; they are not reproducible from the original seed alone.
- Journal write failures are visible. A malformed profile prevents startup rather than silently erasing history. Preserve `data/profile.json` and restore a valid backup.

## Honest framing

The art, dialogue and missions are authored. The Director is a transparent deterministic curriculum policy. Pine’s browser actions, exported artifacts, field notes and measured usage are real. The journal supplies procedural memory; it does not fine-tune model weights. The game validates shipments, not the truth of every written reflection. This is a local agent-testing environment with synthetic data, not a production logistics product.
