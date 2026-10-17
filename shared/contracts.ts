import { z } from "zod";
import { CampaignSchema, JournalEntrySchema, LevelSchema, MetricsSchema } from "./campaign";
import { ManifestSchema, SkuSchema } from "./depot";
import { WorkshopSchema as BaseWorkshopSchema, BlueprintSchema, CellSchema, SceneSchema } from "./domain";
export const StatusSchema = z.enum(["preparing", "working", "verifying", "succeeded", "failed", "canceled"]);
export const EventSchema = z.object({
  at: z.string(),
  text: z.string(),
  source: z.enum(["system", "pine", "verifier"]),
});
export const ReceiptSchema = z.object({
  sha256: z.string(),
  bytes: z.number(),
  filename: z.string(),
  source: z.enum(["pine", "manual"]),
  computerId: z.string().nullable(),
  verifiedAt: z.string(),
  checks: z.array(z.string()),
});
export const ChangeCommandSchema = z
  .object({
    runId: z.string().uuid(),
    sku: SkuSchema,
    quantity: z.number().int().min(1).max(2),
  })
  .strict();
export const ChangeOrderSchema = ChangeCommandSchema.extend({
  queuedAt: z.string().datetime(),
  appliedAt: z.string().datetime().nullable(),
  before: z.number().int().nonnegative(),
  after: z.number().int().nonnegative(),
});
export const AttemptSchema = z.object({
  number: z.number().int().min(1).max(8),
  receivedAt: z.string().datetime(),
  checkedAt: z.string().datetime().nullable(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().min(1).max(16384),
  text: z.string().max(16384),
  accepted: z.boolean().nullable(),
  reason: z.string().max(1200),
});
export type ChangeCommand = z.infer<typeof ChangeCommandSchema>;
export const RunSchema = z.object({
  id: z.string(),
  originalLevel: LevelSchema.nullable().default(null),
  changeOrder: ChangeOrderSchema.nullable().default(null),
  attempts: z.array(AttemptSchema).max(8).default([]),
  level: LevelSchema.nullable().default(null),
  manifest: ManifestSchema.nullable().default(null),
  memories: z.array(JournalEntrySchema).default([]),
  memoryEnabled: z.boolean().default(true),
  rejections: z.number().int().nonnegative().default(0),
  usage: MetricsSchema.nullable().default(null),
  mode: z.enum(["pine", "manual"]),
  status: StatusSchema,
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  scene: SceneSchema,
  events: z.array(EventSchema),
  error: z.string().nullable(),
  blueprint: BlueprintSchema.nullable(),
  path: z.array(CellSchema),
  receipt: ReceiptSchema.nullable(),
  desktopReady: z.boolean(),
  cleanup: z.enum(["pending", "released", "unconfirmed", "not-needed"]),
  workshopUrl: z.string(),
});
export const WorkshopSchema = BaseWorkshopSchema.extend({
  level: LevelSchema.nullable(),
  memories: z.array(JournalEntrySchema),
  changeNotice: z.string().nullable().default(null),
});
export type Workshop = z.infer<typeof WorkshopSchema>;
export const StateSchema = z.object({
  campaign: CampaignSchema,
  journal: z.array(JournalEntrySchema),
  journalError: z.string().nullable(),
  scene: SceneSchema,
  run: RunSchema.nullable(),
  ready: z.object({ pine: z.boolean(), workshop: z.boolean() }),
});
export type Run = z.infer<typeof RunSchema>;
export type GameState = z.infer<typeof StateSchema>;
export const DelegationSchema = z.object({
  computer_host: z.string().url(),
  session: z.object({ name: z.string() }),
  spec_version: z.number(),
  transports: z.object({ desktop_token: z.object({ token: z.string(), expires_at: z.string() }) }),
});
export const ChallengeSchema = SceneSchema.omit({ revision: true });
