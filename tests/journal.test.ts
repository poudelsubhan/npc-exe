import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ dataDir: "" }));
vi.mock("../server/config", () => ({
  configuration: () => ({ apiKey: "", workshopUrl: "", dataDir: fixture.dataDir }),
}));

import { Game } from "../server/game";
import { lessonFor } from "../shared/campaign";
import { StateSchema, WorkshopSchema } from "../shared/contracts";
import { allocate } from "../shared/depot";

beforeEach(async () => {
  fixture.dataDir = await mkdtemp(join(tmpdir(), "npc-journal-"));
});
afterEach(async () => {
  await rm(fixture.dataDir, { recursive: true, force: true });
});
it("finishes depot via exact bytes, stores one journal entry, and restores campaign on restart", async () => {
  const game = new Game();
  await game.initialize();
  await game.campaign({ action: "new", seed: "test-depot", mission: "depot", tier: 3 });
  const level = game.state().campaign.level;
  if (!level.depot) throw new Error("Missing depot");
  const run = game.start("manual");
  const ticket = new URL(run.workshopUrl, "http://localhost").searchParams.get("ticket");
  expect(WorkshopSchema.parse(game.workshop(ticket)).level?.id).toBe(level.id);
  const manifest = {
    schemaVersion: 1,
    kind: "dispatch",
    runId: run.id,
    levelId: level.id,
    note: "Never count a duplicate order twice. Track stock by item.",
    entries: allocate(level.depot),
  };
  expect(await game.import(Buffer.from(JSON.stringify({ ...manifest, entries: [] })), "bad.json")).toBe(
    false,
  );
  expect(game.run?.manifest).toBeNull();
  await expect(game.campaign({ action: "next" })).rejects.toThrow(/Finish/);
  const bytes = Buffer.from(JSON.stringify(manifest));
  expect(await game.import(bytes, "../../bad-name.json")).toBe(true);
  expect(await game.import(bytes, "retry.json")).toBe(true);
  expect(await readFile(join(fixture.dataDir, `dispatch-${run.id}.json`))).toEqual(bytes);
  expect(game.profile.value.entries).toHaveLength(1);
  expect(game.profile.value.entries[0]?.lesson).toBe(manifest.note);
  expect(game.profile.value.entries[0]?.rejections).toBe(1);
  expect(StateSchema.safeParse(game.state()).success).toBe(true);
  const restored = new Game();
  await restored.initialize();
  expect(restored.state().campaign.level).toEqual(level);
  expect(restored.state().journal).toEqual(game.state().journal);
  await restored.campaign({ action: "replay" });
  expect(restored.state().campaign.level).toEqual(level);
  await restored.campaign({ action: "next" });
  expect(restored.state().campaign.level.tier).toBe(3); // Manual does not establish mastery.
  await game.shutdown();
  await restored.shutdown();
});
it("supplies only live verified notes; memory-off withholds them without deleting history", async () => {
  const game = new Game();
  await game.initialize();
  const level = game.profile.value.campaign.level;
  await game.profile.update((p) => ({
    ...p,
    entries: [
      {
        runId: "5adc7a09-efb1-4642-9b90-6301b111ee83",
        at: new Date().toISOString(),
        level,
        source: "pine",
        outcome: "succeeded",
        memoryEnabled: true,
        memoryIds: [],
        lesson: lessonFor(level),
        receiptHash: "test-receipt",
        durationMs: 2000,
        rejections: 0,
        usage: null,
      },
    ],
  }));
  const withNotes = game.start("manual");
  expect(withNotes.memories).toHaveLength(1);
  game.cancel();
  await game.profile.flush();
  await game.campaign({ action: "memory", memoryEnabled: false });
  const fresh = game.start("manual");
  expect(fresh.memories).toEqual([]);
  const ticket = new URL(fresh.workshopUrl, "http://localhost").searchParams.get("ticket");
  expect(game.workshop(ticket)?.memories).toEqual([]);
  expect(game.profile.value.entries.some((e) => e.receiptHash === "test-receipt")).toBe(true);
  await game.shutdown();
});
