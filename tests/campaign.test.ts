import { describe, expect, it } from "vitest";
import { chooseNext, generateLevel, type JournalEntry, lessonFor, recall } from "../shared/campaign";
import { allocate, verifyManifest } from "../shared/depot";
import { checkScene } from "../shared/domain";

const id = "efc68659-531f-4806-9fc0-0177d6e65513";
function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  const level = generateLevel("test");
  return {
    runId: id,
    at: "2026-10-17T00:00:00Z",
    level,
    source: "pine",
    outcome: "succeeded",
    memoryEnabled: true,
    memoryIds: [],
    lesson: lessonFor(level),
    receiptHash: "abc",
    durationMs: 1000,
    rejections: 0,
    usage: null,
    ...overrides,
  };
}
describe("seeded curriculum", () => {
  it("reproduces 500 seeds at all tiers, keeps bridge routes possible and depot stock conserved", () => {
    for (let i = 0; i < 500; i++)
      for (const tier of [1, 2, 3]) {
        const level = generateLevel(`seed-${i}`, 1, "bridge", tier);
        expect(level).toEqual(generateLevel(`seed-${i}`, 1, "bridge", tier));
        expect(checkScene(level.scene)).toBeNull();
        expect(level.scene.rocks).toHaveLength(tier * 4);
        const depotLevel = generateLevel(`seed-${i}`, 1, "depot", tier);
        const depot = depotLevel.depot;
        if (!depot) throw new Error("Missing depot");
        const manifest = {
          schemaVersion: 1,
          kind: "dispatch",
          runId: id,
          levelId: depotLevel.id,
          entries: allocate(depot),
        };
        expect(verifyManifest(manifest, id, depotLevel.id, depot).ok).toBe(true);
        if (tier === 3) expect(manifest.entries.reduce((n, e) => n + e.hold, 0)).toBe(2);
      }
  });
  it("varies seeds and rejects unbounded generation inputs", () => {
    expect(generateLevel("one").scene).not.toEqual(generateLevel("two").scene);
    expect(() => generateLevel("space bad")).toThrow();
    expect(() => generateLevel("test", 1000)).toThrow();
  });
  it("uses live verified outcomes, backs off after failure and keeps practice separate", () => {
    const level = generateLevel("test");
    expect(chooseNext(level, [entry()]).tier).toBe(2);
    expect(chooseNext(level, [entry({ source: "manual" })]).tier).toBe(1);
    expect(chooseNext(level, [entry({ rejections: 1 })]).tier).toBe(1);
    const hard = generateLevel("test", 1, "bridge", 3);
    expect(chooseNext(hard, [entry({ level: hard, outcome: "failed" })]).tier).toBe(2);
    expect(chooseNext(hard, [entry({ level: hard })]).mission).toBe("depot");
  });
  it("recalls only verified live procedures for the right mission; fresh Pip receives none", () => {
    const entries = [
      entry(),
      entry({ source: "manual" }),
      entry({ outcome: "failed" }),
      entry({ receiptHash: null }),
      entry({ level: generateLevel("test", 1, "depot") }),
    ];
    expect(recall(entries, generateLevel("test"), true)).toHaveLength(1);
    expect(recall(entries, generateLevel("test"), false)).toEqual([]);
  });
});
describe("dispatch verifier", () => {
  it("checks duplicate orders, shortages, exact accounting, freshness and hostile fields", () => {
    const level = generateLevel("test", 1, "depot", 3);
    if (!level.depot) throw new Error("Missing depot");
    const manifest = {
      schemaVersion: 1,
      kind: "dispatch",
      runId: id,
      levelId: level.id,
      entries: allocate(level.depot),
    };
    const depot = level.depot;
    const verify = (input: unknown) => verifyManifest(input, id, level.id, depot);
    expect(verify(manifest).ok).toBe(true);
    expect(verify({ ...manifest, levelId: "old" }).ok).toBe(false);
    expect(verify({ ...manifest, runId: "7c27595f-77f3-4a6e-a7c7-6a896a3ed4c0" }).ok).toBe(false);
    expect(verify({ ...manifest, entries: [...manifest.entries, manifest.entries[0]] }).ok).toBe(false);
    expect(verify({ ...manifest, entries: manifest.entries.slice(1) }).ok).toBe(false);
    expect(
      verify({ ...manifest, entries: manifest.entries.map((e) => ({ ...e, ship: e.ship + 1 })) }).ok,
    ).toBe(false);
    expect(verify({ ...manifest, code: "alert(1)" }).ok).toBe(false);
  });
});
