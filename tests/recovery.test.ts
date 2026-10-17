import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { Game } from "../server/game";
import { allocate, verifyManifest } from "../shared/depot";

let directory = "";
let game: Game;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "npc-recovery-"));
  game = new Game(directory);
  await game.initialize();
  await game.campaign({ action: "new", seed: "little-light", mission: "depot", tier: 3 });
});
afterEach(async () => {
  await game.shutdown();
  await rm(directory, { recursive: true, force: true });
});
function exportCurrent() {
  const run = game.run;
  if (!run?.level?.depot) throw new Error("Missing depot");
  return Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      kind: "dispatch",
      runId: run.id,
      levelId: run.level.id,
      entries: allocate(run.level.depot),
      note: "Check stock again after a change.",
    }),
  );
}
it("returns an originally correct file, preserves exact rejected bytes, and accepts a real revised manifest", async () => {
  const run = game.start("manual");
  const original = exportCurrent();
  const originalLevel = structuredClone(run.level);
  if (!originalLevel?.depot) throw new Error("Missing depot");
  expect(
    verifyManifest(JSON.parse(original.toString()), run.id, originalLevel.id, originalLevel.depot).ok,
  ).toBe(true);
  const command = { runId: run.id, sku: "blanket" as const, quantity: 2 };
  game.queueChange(command);
  game.queueChange(command);
  expect(() => game.queueChange({ ...command, quantity: 1 })).toThrow(/already/);
  expect(await game.import(original, "dispatch.json")).toBe(false);
  expect(run.manifest).toBeNull();
  expect(run.receipt).toBeNull();
  expect(run.level?.depot?.inventory.blanket).toBe(originalLevel.depot.inventory.blanket - 2);
  expect(run.attempts[0]?.text).toBe(original.toString());
  expect(run.attempts[0]?.reason).toContain("damaged");
  expect(run.originalLevel).toEqual(originalLevel);
  const revised = exportCurrent();
  expect(await game.import(revised, "dispatch.json")).toBe(true);
  expect(run.attempts.map((a) => a.accepted)).toEqual([false, true]);
  expect(await readFile(join(directory, `dispatch-${run.id}.json`))).toEqual(revised);
  expect(game.state().journal[0]?.lesson).toContain("Recovered after stock changed");
  expect(game.state().campaign.level.id).toBe(run.level?.id);
});
it("verifies saved replay independently, survives restart, and refuses corrupted or unknown evidence", async () => {
  const run = game.start("manual");
  // Synthetic provider fixture; never creates a paid computer.
  run.mode = "pine";
  await game.import(exportCurrent(), "dispatch.json", "synthetic-computer");
  const restored = new Game(directory);
  await restored.initialize();
  const replay = await restored.replay(run.id);
  expect(replay.manifest).toEqual(run.manifest);
  expect(replay.desktopReady).toBe(false);
  expect(replay.workshopUrl).toBe("[replay]");
  expect(restored.run).toBeNull();
  await expect(restored.replay("../../.env")).rejects.toThrow(/saved/);
  await writeFile(join(directory, `dispatch-${run.id}.json`), "{}");
  await expect(restored.replay(run.id)).rejects.toThrow(/could not be verified/);
  await restored.shutdown();
});
it("rejects stale, excessive and post-inspection changes", async () => {
  const run = game.start("manual");
  expect(() =>
    game.queueChange({ runId: "5adc7a09-efb1-4642-9b90-6301b111ee83", sku: "blanket", quantity: 2 }),
  ).toThrow(/current/);
  expect(() => game.queueChange({ runId: run.id, sku: "lantern", quantity: 1 })).toThrow(/enough/);
  await game.import(Buffer.from("{}"), "bad.json");
  expect(() => game.queueChange({ runId: run.id, sku: "blanket", quantity: 2 })).toThrow(/Inspection/);
});
