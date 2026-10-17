import { z } from "zod";

export const WIDTH = 12;
export const HEIGHT = 8;
export const INK_BUDGET = 12;
export const CellSchema = z
  .object({
    x: z
      .number()
      .int()
      .min(0)
      .max(WIDTH - 1),
    y: z
      .number()
      .int()
      .min(0)
      .max(HEIGHT - 1),
  })
  .strict();
export type Cell = z.infer<typeof CellSchema>;
export const ColorSchema = z.enum(["amber", "mint", "rose"]);
export type BridgeColor = z.infer<typeof ColorSchema>;
export const SceneSchema = z
  .object({
    revision: z.number().int().positive(),
    rocks: z.array(CellSchema).max(14),
    color: ColorSchema,
    inkBudget: z.number().int().min(8).max(12).optional(),
  })
  .strict();
export type Scene = z.infer<typeof SceneSchema>;
export const BlueprintSchema = z
  .object({
    schemaVersion: z.literal(1),
    runId: z.string().uuid(),
    sceneRevision: z.number().int().positive(),
    color: ColorSchema,
    cells: z.array(CellSchema).min(1).max(INK_BUDGET),
    note: z.string().max(600).optional(),
  })
  .strict();
export type Blueprint = z.infer<typeof BlueprintSchema>;
export const WorkshopSchema = z.object({
  runId: z.string().uuid(),
  scene: SceneSchema,
  mode: z.enum(["pine", "manual"]),
});
export type Workshop = z.infer<typeof WorkshopSchema>;
export const START: Cell = { x: 1, y: 4 };
export const GOAL: Cell = { x: 10, y: 4 };
export const key = (cell: Cell) => `${cell.x},${cell.y}`;
export const isLand = (cell: Cell) => cell.x < 2 || cell.x > 9;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export const defaultScene = (): Scene => ({
  revision: 1,
  color: "amber",
  rocks: [
    { x: 4, y: 2 },
    { x: 6, y: 6 },
    { x: 8, y: 3 },
  ],
});
export const grid: Cell[] = Array.from({ length: WIDTH * HEIGHT }, (_, i) => ({
  x: i % WIDTH,
  y: Math.floor(i / WIDTH),
}));

// One movement rule for the verifier and rendered crossing: orthogonal cells only.
export function findPath(allowed: ReadonlySet<string>): Cell[] | null {
  const queue: Cell[][] = [[START]];
  const seen = new Set([key(START)]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const cell = path?.at(-1);
    if (!cell || !path) continue;
    if (sameCell(cell, GOAL)) return path;
    for (const next of [
      { x: cell.x + 1, y: cell.y },
      { x: cell.x, y: cell.y - 1 },
      { x: cell.x, y: cell.y + 1 },
      { x: cell.x - 1, y: cell.y },
    ]) {
      if (next.x < 0 || next.x >= WIDTH || next.y < 0 || next.y >= HEIGHT) continue;
      const id = key(next);
      if (seen.has(id) || (!isLand(next) && !allowed.has(id))) continue;
      seen.add(id);
      queue.push([...path, next]);
    }
  }
  return null;
}

export type Verification = { ok: true; blueprint: Blueprint; path: Cell[] } | { ok: false; reason: string };
export function verifyBlueprint(input: unknown, runId: string, scene: Scene): Verification {
  const parsed = BlueprintSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      reason: "This is not a valid blueprint. Use the workshop export; the limit is 12 tiles.",
    };
  const bp = parsed.data;
  if (bp.runId !== runId || bp.sceneRevision !== scene.revision)
    return {
      ok: false,
      reason: "This blueprint belongs to a different journey. Export a fresh one from the current workshop.",
    };
  if (bp.color !== scene.color) return { ok: false, reason: "The bridge color does not match your request." };
  if (bp.cells.length > (scene.inkBudget ?? INK_BUDGET))
    return { ok: false, reason: "This bridge uses more ink than the current level allows." };
  const cells = new Set(bp.cells.map(key));
  if (cells.size !== bp.cells.length) return { ok: false, reason: "A tile appears twice in this blueprint." };
  const rocks = new Set(scene.rocks.map(key));
  if (bp.cells.some((c) => isLand(c) || rocks.has(key(c))))
    return { ok: false, reason: "The bridge overlaps an island or a rock." };
  const path = findPath(cells);
  if (!path)
    return { ok: false, reason: "The bridge does not connect both shores. Tiles must touch along an edge." };
  return { ok: true, blueprint: bp, path };
}

export function checkScene(scene: Scene): string | null {
  const rockKeys = new Set(scene.rocks.map(key));
  if (rockKeys.size !== scene.rocks.length || scene.rocks.some(isLand))
    return "Place each rock on its own water tile.";
  // 0-1 BFS: land costs no ink; each water tile costs one.
  const queue: { cell: Cell; cost: number }[] = [{ cell: START, cost: 0 }];
  const costs = new Map([[key(START), 0]]);
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    if (!current) break;
    if (sameCell(current.cell, GOAL))
      return current.cost <= (scene.inkBudget ?? INK_BUDGET)
        ? null
        : `That challenge needs more than ${scene.inkBudget ?? INK_BUDGET} bridge tiles. Remove a rock to leave a possible route.`;
    for (const cell of [
      { x: current.cell.x + 1, y: current.cell.y },
      { x: current.cell.x - 1, y: current.cell.y },
      { x: current.cell.x, y: current.cell.y + 1 },
      { x: current.cell.x, y: current.cell.y - 1 },
    ]) {
      if (cell.x < 0 || cell.x >= WIDTH || cell.y < 0 || cell.y >= HEIGHT || rockKeys.has(key(cell)))
        continue;
      const cost = current.cost + (isLand(cell) ? 0 : 1);
      if (cost >= (costs.get(key(cell)) ?? Infinity)) continue;
      costs.set(key(cell), cost);
      queue.push({ cell, cost });
    }
  }
  return "The rocks seal off the other shore. Leave a possible crossing.";
}
