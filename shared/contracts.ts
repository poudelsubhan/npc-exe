import { z } from "zod";
import { BlueprintSchema, CellSchema, SceneSchema } from "./domain";
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
export const RunSchema = z.object({
  id: z.string(),
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
export const StateSchema = z.object({
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
