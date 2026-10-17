import { expect, it } from "vitest";
import { ChangeCommandSchema, RunSchema } from "../shared/contracts";
import { projectReplay } from "../shared/demo";
import { defaultScene } from "../shared/domain";

const old = {
  id: "old",
  mode: "pine",
  status: "succeeded",
  startedAt: "2026-10-17T00:00:00.000Z",
  finishedAt: "2026-10-17T00:00:02.000Z",
  scene: defaultScene(),
  events: [],
  error: null,
  blueprint: null,
  path: [],
  receipt: null,
  desktopReady: true,
  cleanup: "released",
  workshopUrl: "[expired]",
};
it("reads old receipts with compatible empty evidence defaults", () => {
  const run = RunSchema.parse(old);
  expect(run.attempts).toEqual([]);
  expect(run.changeOrder).toBeNull();
});
it("does not reveal a future inspection result during playback", () => {
  const run = RunSchema.parse({
    ...old,
    attempts: [
      {
        number: 1,
        receivedAt: "2026-10-17T00:00:01.000Z",
        checkedAt: "2026-10-17T00:00:02.000Z",
        sha256: "a".repeat(64),
        bytes: 2,
        text: "{}",
        accepted: true,
        reason: "Accepted",
      },
    ],
  });
  expect(projectReplay(run, 500).attempts).toHaveLength(0);
  expect(projectReplay(run, 1500).attempts[0]?.accepted).toBeNull();
  expect(projectReplay(run, 1500).status).toBe("working");
  expect(projectReplay(run, 2000).status).toBe("succeeded");
  expect(projectReplay(run, 2000).desktopReady).toBe(false);
});
it("bounds damage and scopes commands to a UUID", () => {
  expect(ChangeCommandSchema.safeParse({ runId: "../../secret", sku: "blanket", quantity: 2 }).success).toBe(
    false,
  );
  expect(
    ChangeCommandSchema.safeParse({
      runId: "5adc7a09-efb1-4642-9b90-6301b111ee83",
      sku: "blanket",
      quantity: 3,
    }).success,
  ).toBe(false);
});
