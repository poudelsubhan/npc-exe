import { z } from "zod";
import { type Depot, DepotSchema } from "./depot";
import { checkScene, defaultScene, type Scene, SceneSchema } from "./domain";

export const MissionSchema = z.enum(["bridge", "depot"]);
export type Mission = z.infer<typeof MissionSchema>;
export const SeedSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores for the seed.");
export const LevelSchema = z
  .object({
    id: z.string().max(160),
    version: z.literal(1),
    seed: SeedSchema,
    episode: z.number().int().min(1).max(999),
    mission: MissionSchema,
    tier: z.number().int().min(1).max(3),
    title: z.string(),
    objective: z.string(),
    twist: z.string(),
    scene: SceneSchema,
    depot: DepotSchema.nullable(),
  })
  .strict();
export type Level = z.infer<typeof LevelSchema>;
export const MetricsSchema = z.object({
  tokens: z.number().nonnegative(),
  cost: z.number().nonnegative().nullable(),
  currency: z.string(),
});
export const JournalEntrySchema = z
  .object({
    runId: z.string().uuid(),
    at: z.string(),
    level: LevelSchema,
    source: z.enum(["pine", "manual"]),
    outcome: z.enum(["succeeded", "failed", "canceled"]),
    memoryEnabled: z.boolean(),
    memoryIds: z.array(z.string()).max(4),
    lesson: z.string().max(1600),
    receiptHash: z.string().nullable(),
    durationMs: z.number().nonnegative(),
    rejections: z.number().int().nonnegative(),
    usage: MetricsSchema.nullable(),
  })
  .strict();
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export const CampaignSchema = z
  .object({ level: LevelSchema, reason: z.string(), memoryEnabled: z.boolean() })
  .strict();
export type Campaign = z.infer<typeof CampaignSchema>;
export const CampaignCommandSchema = z
  .object({
    action: z.enum(["new", "next", "replay", "memory"]),
    seed: SeedSchema.optional(),
    mission: MissionSchema.optional(),
    tier: z.number().int().min(1).max(3).optional(),
    memoryEnabled: z.boolean().optional(),
  })
  .strict();
export type CampaignCommand = z.infer<typeof CampaignCommandSchema>;

function randomFor(text: string) {
  let state = 2166136261;
  for (const char of text) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function generateLevel(seed: string, episode = 1, mission: Mission = "bridge", tier = 1): Level {
  SeedSchema.parse(seed);
  if (!Number.isInteger(episode) || episode < 1 || episode > 999 || ![1, 2, 3].includes(tier))
    throw new Error("Invalid level settings.");
  const id = `v1:${seed}:${episode}:${mission}:${tier}`;
  const random = randomFor(id);
  const int = (n: number) => Math.floor(random() * n);
  const scene: Scene = {
    ...defaultScene(),
    rocks: [],
    color: (["amber", "mint", "rose"] as const)[int(3)] ?? "amber",
    inkBudget: 13 - tier,
  };
  // Bounded rejection sampling; independently verify every accepted obstacle.
  for (let attempt = 0; attempt < 180 && scene.rocks.length < tier * 4; attempt++) {
    const cell = { x: 2 + int(8), y: int(8) };
    if (scene.rocks.some((c) => c.x === cell.x && c.y === cell.y)) continue;
    const candidate = { ...scene, rocks: [...scene.rocks, cell] };
    if (!checkScene(candidate)) scene.rocks.push(cell);
  }
  let depot: Depot | null = null;
  if (mission === "depot") {
    const recipients = ["Moss Cottage", "The Observatory", "Willow House", "Harbor Lights", "Fern Library"];
    const skus = ["lantern", "blanket", "tea"] as const;
    const orders = Array.from({ length: tier + 2 }, (_, i) => ({
      id: `P${100 + episode * 10 + i}`,
      recipient: recipients[i] ?? "Moss Cottage",
      sku: skus[(i + int(3)) % 3] ?? "tea",
      quantity: 1 + int(4),
    }));
    const inventory = { lantern: 0, blanket: 0, tea: 0 };
    for (const order of orders) inventory[order.sku] += order.quantity;
    if (tier >= 2) {
      const first = orders[0];
      if (first) orders.splice(1 + int(orders.length), 0, { ...first });
    }
    if (tier >= 3) {
      const sku = [...skus].sort((a, b) => inventory[b] - inventory[a])[0] ?? "tea";
      inventory[sku] = Math.max(0, inventory[sku] - 2);
    }
    depot = { orders, inventory };
  }
  return LevelSchema.parse({
    id,
    version: 1,
    seed,
    episode,
    mission,
    tier,
    scene,
    depot,
    title:
      mission === "bridge"
        ? ["A way across", "The crooked crossing", "Every plank counts"][tier - 1]
        : ["The evening post", "An echo in the orders", "Keep the lights on"][tier - 1],
    objective:
      mission === "bridge"
        ? "Build a route home in a real browser. Bring the blueprint back."
        : "Reconcile the orders. Pack what is available. Bring a dispatch manifest home.",
    twist:
      mission === "bridge"
        ? `${scene.rocks.length} rocks · ${scene.inkBudget} tiles of ink`
        : [
            "Every parcel has a home.",
            "A repeated order must only be packed once.",
            "Duplicate orders. Limited stock. Every parcel accounted for.",
          ][tier - 1],
  });
}
export function chooseNext(level: Level, entries: JournalEntry[]) {
  const attempts = entries.filter(
    (e) => e.source === "pine" && e.level.id === level.id && e.outcome !== "canceled",
  );
  const last = attempts.at(-1);
  if (!last)
    return {
      mission: level.mission,
      tier: level.tier,
      reason: "A new variation at the same difficulty. Only verified Pine journeys advance mastery.",
    };
  if (last.outcome === "failed")
    return {
      mission: level.mission,
      tier: Math.max(1, level.tier - 1),
      reason: "That journey was unfinished. Practice the same skill with more room to recover.",
    };
  if (last.rejections > 0)
    return {
      mission: level.mission,
      tier: level.tier,
      reason: "Pip recovered after a rejected export. Consolidate that skill on a new variation.",
    };
  if (level.tier < 3)
    return {
      mission: level.mission,
      tier: level.tier + 1,
      reason: "A verified success. Add one new constraint while keeping the goal familiar.",
    };
  return {
    mission: level.mission === "bridge" ? ("depot" as const) : ("bridge" as const),
    tier: 1,
    reason:
      "A verified solution at the hardest tier. Carry the habit of checking real files into a different task.",
  };
}
export function recall(entries: JournalEntry[], level: Level, enabled: boolean): JournalEntry[] {
  if (!enabled) return [];
  return entries
    .filter(
      (e) =>
        e.source === "pine" &&
        e.outcome === "succeeded" &&
        e.level.mission === level.mission &&
        e.receiptHash,
    )
    .slice(-3);
}
export function lessonFor(level: Level): string {
  return level.mission === "bridge"
    ? `Read the current ink limit and rocks. Trace an edge-connected route across the water before painting. Land costs no ink. Count water tiles, check the requested color, export the file. Recheck every coordinate on a new map; a previous route may be blocked. Last verified constraint: ${level.twist}.`
    : "Read the orders in original order. Keep only the first occurrence of each order ID. Track remaining stock separately for each item. For each unique order, ship the smaller of requested quantity and remaining stock; hold the rest. Subtract shipped units before processing the next order. Export the manifest. Recalculate from the current files; quantities change between shifts.";
}
