import { describe, expect, it } from "vitest";
import {
  BlueprintSchema,
  checkScene,
  defaultScene,
  grid,
  isLand,
  key,
  verifyBlueprint,
} from "../shared/domain";

const runId = "11111111-1111-4111-8111-111111111111";
const straight = Array.from({ length: 8 }, (_, i) => ({ x: i + 2, y: 4 }));
const blueprint = () => ({ schemaVersion: 1, runId, sceneRevision: 1, color: "amber", cells: straight });
describe("independent artifact verification", () => {
  it("accepts a genuine connecting bridge and returns exactly its traversable route", () => {
    const result = verifyBlueprint(blueprint(), runId, defaultScene());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.path.filter((c) => !isLand(c))).toEqual(straight);
  });
  it.each([
    ["stale run", { ...blueprint(), runId: "22222222-2222-4222-8222-222222222222" }],
    ["stale scene", { ...blueprint(), sceneRevision: 2 }],
    ["wrong color", { ...blueprint(), color: "mint" }],
    ["gap", { ...blueprint(), cells: straight.filter((c) => c.x !== 5) }],
    ["duplicate", { ...blueprint(), cells: [...straight, straight[0]] }],
    ["oversize", { ...blueprint(), cells: grid.slice(0, 13) }],
    ["out of bounds", { ...blueprint(), cells: [{ x: 12, y: 4 }] }],
    ["executable extras", { ...blueprint(), script: "alert(1)" }],
    ["malformed", '<svg onload="alert(1)"/>'],
  ])("rejects %s", (_, candidate) =>
    expect(verifyBlueprint(candidate, runId, defaultScene()).ok).toBe(false));
  it("rejects a once-valid artifact when a rock now blocks it and accepts an alternate route", () => {
    const scene = { ...defaultScene(), rocks: [{ x: 5, y: 4 }] };
    expect(verifyBlueprint(blueprint(), runId, scene).ok).toBe(false);
    const alternate = [...straight.filter((c) => c.x !== 5), { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }];
    expect(verifyBlueprint({ ...blueprint(), cells: alternate }, runId, scene).ok).toBe(true);
  });
  it("refuses impossible scenes but permits an audience obstacle", () => {
    expect(checkScene(defaultScene())).toBe(null);
    expect(
      checkScene({ ...defaultScene(), rocks: Array.from({ length: 8 }, (_, y) => ({ x: 5, y })) }),
    ).toMatch(/seal/);
  });
  it("keeps every parser output within the grid for a range of adversarial coordinates", () => {
    for (let x = -3; x < 15; x++)
      for (let y = -3; y < 11; y++) {
        const result = BlueprintSchema.safeParse({ ...blueprint(), cells: [{ x, y }] });
        expect(result.success).toBe(x >= 0 && x < 12 && y >= 0 && y < 8);
      }
    expect(new Set(grid.map(key)).size).toBe(96);
  });
});
