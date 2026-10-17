import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { CampaignSchema, generateLevel, JournalEntrySchema } from "../shared/campaign";

export const ProfileSchema = z
  .object({ version: z.literal(1), campaign: CampaignSchema, entries: z.array(JournalEntrySchema).max(200) })
  .strict();
export type Profile = z.infer<typeof ProfileSchema>;
export const newProfile = (): Profile => ({
  version: 1,
  campaign: {
    level: generateLevel("little-light"),
    reason:
      "Begin with a crossing. Each verified journey gives the Director evidence for the next challenge.",
    memoryEnabled: true,
  },
  entries: [],
});

// One process owns this bounded profile. Serialize mutations and publish only after atomic replacement.
export class ProfileStore {
  value = newProfile();
  private tail: Promise<void> = Promise.resolve();
  constructor(private readonly directory: string) {}
  async load() {
    const path = join(this.directory, "profile.json");
    try {
      if ((await stat(path)).size > 2_000_000) throw new Error("oversize");
      this.value = ProfileSchema.parse(JSON.parse(await readFile(path, "utf8")));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw new Error(
        "Pip’s journal could not be read. Preserve data/profile.json and restore a valid backup before restarting.",
      );
    }
  }
  update(change: (current: Profile) => Profile) {
    const result = this.tail.then(async () => {
      const next = ProfileSchema.parse(change(structuredClone(this.value)));
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temporary = join(this.directory, `.profile-${randomUUID()}.tmp`);
      try {
        const file = await open(temporary, "wx", 0o600);
        try {
          await file.writeFile(JSON.stringify(next));
          await file.sync();
        } finally {
          await file.close();
        }
        await rename(temporary, join(this.directory, "profile.json"));
        this.value = next;
      } finally {
        await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== "ENOENT") throw error;
        });
      }
    });
    this.tail = result.catch(() => {});
    return result;
  }
  async flush() {
    await this.tail;
  }
}
