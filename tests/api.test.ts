import { afterEach, expect, it, vi } from "vitest";
import { newProfile } from "../server/profile";
import { importArtifact } from "../src/api";

afterEach(() => {
  vi.unstubAllGlobals();
});
it("manual import sends original file bytes, including formatting", async () => {
  const file = new File(['{\n  "example": "preserve these bytes"\n}\n'], "example.json", {
    type: "application/json",
  });
  let received = "";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url, options: RequestInit) => {
      received = await new Response(options.body).text();
      const profile = newProfile();
      return Response.json({
        scene: profile.campaign.level.scene,
        run: null,
        campaign: profile.campaign,
        journal: [],
        journalError: null,
        ready: { pine: false, workshop: false },
      });
    }),
  );
  await importArtifact(file);
  expect(received).toBe(await file.text());
});
