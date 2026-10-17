import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { ProfileStore } from "../server/profile";

const directories: string[] = [];
async function directory() {
  const dir = await mkdtemp(join(tmpdir(), "npc-profile-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});
it("serializes updates and restores campaign/journal after restart with private permissions", async () => {
  const dir = await directory();
  const profile = new ProfileStore(dir);
  await profile.load();
  await Promise.all(
    Array.from({ length: 8 }, () =>
      profile.update((p) => ({
        ...p,
        campaign: { ...p.campaign, level: { ...p.campaign.level, episode: p.campaign.level.episode + 1 } },
      })),
    ),
  );
  const restored = new ProfileStore(dir);
  await restored.load();
  expect(restored.value.campaign.level.episode).toBe(9);
  expect(restored.value).toEqual(profile.value);
  expect((await stat(join(dir, "profile.json"))).mode & 0o777).toBe(0o600);
});
it("preserves corrupted history and rejects invalid updates without publishing them", async () => {
  const dir = await directory();
  const profile = new ProfileStore(dir);
  await profile.update((p) => p);
  const original = profile.value;
  await expect(profile.update((p) => ({ ...p, version: 2 as 1 }))).rejects.toThrow();
  expect(profile.value).toEqual(original);
  await writeFile(join(dir, "profile.json"), "broken");
  await expect(new ProfileStore(dir).load()).rejects.toThrow(/journal could not be read/);
  expect(await readFile(join(dir, "profile.json"), "utf8")).toBe("broken");
});
