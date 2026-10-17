import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defaultScene } from "../shared/domain";

const fixture = vi.hoisted(() => ({ dataDir: "" }));
vi.mock("../server/config", () => ({
  configuration: () => ({ apiKey: "", workshopUrl: "", dataDir: fixture.dataDir }),
}));

import { Game } from "../server/game";

const instances: Game[] = [];
function makeGame() {
  const game = new Game();
  instances.push(game);
  return game;
}
afterEach(async () => {
  await Promise.all(instances.splice(0).map((game) => game.shutdown()));
});
beforeAll(async () => {
  fixture.dataDir = await mkdtemp(join(tmpdir(), "npc-tests-"));
});
afterAll(async () => {
  await rm(fixture.dataDir, { recursive: true, force: true });
});
const artifact = (id: string) =>
  Buffer.from(
    JSON.stringify({
      schemaVersion: 1,
      runId: id,
      sceneRevision: 1,
      color: "amber",
      cells: Array.from({ length: 8 }, (_, i) => ({ x: i + 2, y: 4 })),
    }),
  );
describe("journey lifecycle without paid APIs", () => {
  it("rejects overlapping imports so saved bytes cannot diverge from the accepted artifact", async () => {
    const game = makeGame();
    const run = game.start("manual");
    const first = artifact(run.id);
    const second = Buffer.from(first.toString().replaceAll('"y":4', '"y":1'));
    const outcomes = await Promise.allSettled([
      game.import(first, "first.json"),
      game.import(second, "second.json"),
    ]);
    expect(outcomes.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await readFile(join(fixture.dataDir, `bridge-${run.id}.json`))).toEqual(first);
  });

  it("freezes the scene and admits only one active run", () => {
    const game = makeGame();
    game.start("manual");
    expect(() => game.start("manual")).toThrow(/active/);
    expect(() => game.changeScene(defaultScene())).toThrow(/Finish/);
    game.cancel();
    expect(game.run?.status).toBe("canceled");
    expect(() => game.start("manual")).not.toThrow();
  });
  it("does not update the world on invalid import; a valid file persists and repeated import is safe", async () => {
    const game = makeGame();
    const run = game.start("manual");
    expect(await game.import(Buffer.from("{}"), "wrong.json")).toBe(false);
    expect(game.run?.status).toBe("working");
    expect(game.run?.blueprint).toBeNull();
    const bytes = artifact(run.id);
    expect(await game.import(bytes, "untrusted/../../name.json")).toBe(true);
    expect(game.run?.status).toBe("succeeded");
    expect(await game.import(bytes, "same.json")).toBe(true);
    expect(game.run?.receipt?.source).toBe("manual");
    expect(await readFile(join(fixture.dataDir, `bridge-${run.id}.json`))).toEqual(bytes);
    expect(game.workshop(new URL(run.workshopUrl, "http://localhost").searchParams.get("ticket"))).toBeNull();
  });
  it("rejects stale files, invalid capability and live allocation without configuration", async () => {
    const game = makeGame();
    const first = game.start("manual");
    expect(game.workshop("wrong-ticket")).toBeNull();
    game.cancel();
    game.start("manual");
    expect(await game.import(artifact(first.id), "stale.json")).toBe(false);
    game.cancel();
    expect(() => game.start("pine")).toThrow(/key/);
  });
  it("limits imported bytes and leaves the run recoverable", async () => {
    const game = makeGame();
    game.start("manual");
    await expect(game.import(Buffer.alloc(16_385), "large.json")).rejects.toThrow(/large/);
    expect(game.run?.status).toBe("working");
  });
});
