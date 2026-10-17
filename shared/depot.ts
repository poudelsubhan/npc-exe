import { z } from "zod";

export const SkuSchema = z.enum(["lantern", "blanket", "tea"]);
export const OrderSchema = z
  .object({
    id: z.string().max(20),
    recipient: z.string().max(30),
    sku: SkuSchema,
    quantity: z.number().int().min(1).max(9),
  })
  .strict();
export const DepotSchema = z
  .object({
    orders: z.array(OrderSchema).min(2).max(9),
    inventory: z
      .object({
        lantern: z.number().int().min(0).max(50),
        blanket: z.number().int().min(0).max(50),
        tea: z.number().int().min(0).max(50),
      })
      .strict(),
  })
  .strict();
export type Depot = z.infer<typeof DepotSchema>;
export const DispatchSchema = z
  .object({
    orderId: z.string().max(20),
    ship: z.number().int().min(0).max(9),
    hold: z.number().int().min(0).max(9),
  })
  .strict();
export const ManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("dispatch"),
    note: z.string().max(600).optional(),
    runId: z.string().uuid(),
    levelId: z.string().max(160),
    entries: z.array(DispatchSchema).min(2).max(8),
  })
  .strict();
export type Manifest = z.infer<typeof ManifestSchema>;
export const uniqueOrders = (depot: Depot) =>
  depot.orders.filter((order, i, all) => all.findIndex((other) => other.id === order.id) === i);

// Business policy: first occurrence wins; allocate stock in that order, holding the remainder.
export function allocate(depot: Depot): Manifest["entries"] {
  const remaining = { ...depot.inventory };
  return uniqueOrders(depot).map((order) => {
    const ship = Math.min(order.quantity, remaining[order.sku]);
    remaining[order.sku] -= ship;
    return { orderId: order.id, ship, hold: order.quantity - ship };
  });
}
export function verifyManifest(
  input: unknown,
  runId: string,
  levelId: string,
  depot: Depot,
): { ok: true; manifest: Manifest } | { ok: false; reason: string } {
  const parsed = ManifestSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, reason: "This is not a dispatch manifest. Export the current depot worksheet." };
  const manifest = parsed.data;
  if (manifest.runId !== runId || manifest.levelId !== levelId)
    return { ok: false, reason: "This manifest belongs to another journey or level. Export a fresh file." };
  const ids = new Set(manifest.entries.map((entry) => entry.orderId));
  const expected = allocate(depot);
  if (ids.size !== manifest.entries.length || expected.length !== manifest.entries.length)
    return {
      ok: false,
      reason: "Include each unique order exactly once. Duplicate orders must not be shipped twice.",
    };
  for (const entry of expected) {
    const actual = manifest.entries.find((row) => row.orderId === entry.orderId);
    if (!actual || actual.ship !== entry.ship || actual.hold !== entry.hold)
      return {
        ok: false,
        reason:
          "The quantities do not reconcile. Allocate inventory in first-seen order; hold only the unavailable remainder.",
      };
  }
  return { ok: true, manifest };
}
export function ordersCsv(depot: Depot) {
  return [
    "order_id,recipient,item,quantity",
    ...depot.orders.map((o) => `${o.id},${o.recipient},${o.sku},${o.quantity}`),
  ].join("\r\n");
}
