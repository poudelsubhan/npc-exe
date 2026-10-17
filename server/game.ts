import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Run } from "../shared/contracts";
import { checkScene, defaultScene, type Scene, verifyBlueprint } from "../shared/domain";
import { configuration } from "./config";
import { PineJourney } from "./pine";

export const active = (run: Run | null) =>
  !!run && ["preparing", "working", "verifying"].includes(run.status);
export class Game {
  scene = defaultScene();
  run: Run | null = null;
  private ticket = "";
  private journey: PineJourney | null = null;
  private pending: Promise<void> | null = null;
  private closing = false;
  private importing = false;
  private record(text: string, source: "system" | "pine" | "verifier" = "system") {
    if (!this.run) return;
    if (this.run.events.at(-1)?.text === text) return;
    this.run.events = [...this.run.events.slice(-59), { at: new Date().toISOString(), text, source }];
  }
  state() {
    const config = configuration();
    return {
      scene: this.scene,
      run: this.run,
      ready: { pine: !!config.apiKey, workshop: !!config.workshopUrl },
    };
  }
  changeScene(input: Omit<Scene, "revision">) {
    if (active(this.run) || this.pending || this.importing)
      throw new Error("Finish or cancel the current journey before changing the world.");
    const next = { ...input, revision: this.scene.revision + 1 };
    const problem = checkScene(next);
    if (problem) throw new Error(problem);
    this.scene = next;
    this.run = null;
    this.ticket = "";
  }
  start(mode: "pine" | "manual") {
    if (this.closing || active(this.run) || this.pending || this.importing)
      throw new Error("A journey is already active or its computer is still closing.");
    const config = configuration();
    if (mode === "pine" && (!config.apiKey || !config.workshopUrl))
      throw new Error("Add your Pine key to .env and start the workshop tunnel before sending Pip.");
    this.ticket = randomBytes(24).toString("base64url");
    const id = randomUUID();
    const workshopPath = `/workshop?ticket=${this.ticket}`;
    this.run = {
      id,
      mode,
      status: mode === "pine" ? "preparing" : "working",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      scene: structuredClone(this.scene),
      events: [],
      error: null,
      blueprint: null,
      path: [],
      receipt: null,
      desktopReady: false,
      cleanup: mode === "pine" ? "pending" : "not-needed",
      workshopUrl: workshopPath,
    };
    this.record(
      mode === "pine"
        ? "Opening a real computer for Pip."
        : "Manual rehearsal. You are operating the workshop.",
    );
    if (mode === "pine") {
      this.journey = new PineJourney(config, {
        event: (text) => this.record(text, "pine"),
        ready: () => {
          if (this.run?.id === id && active(this.run)) {
            this.run.status = "working";
            this.run.desktopReady = true;
            this.record("Pip’s browser is ready. The agent is taking over.");
          }
        },
        verifying: () => {
          if (this.run?.id === id && active(this.run)) {
            this.run.status = "verifying";
            this.record("Reading the downloaded file. Checking every tile.", "verifier");
          }
        },
        artifact: (bytes, filename, computerId) => this.import(bytes, filename, computerId),
        cleanup: (released) => {
          if (this.run?.id === id) {
            this.run.desktopReady = false;
            this.run.cleanup = released ? "released" : "unconfirmed";
            this.record(
              released
                ? "Pine computer released."
                : "Computer release is unconfirmed. Check the Pine console; the idle lease is 120 seconds.",
            );
          }
        },
      });
      this.pending = this.journey
        .run(id, `${config.workshopUrl}${workshopPath}`)
        .catch((error) => {
          if (this.run?.id !== id || this.run.status === "canceled") return;
          this.run.status = "failed";
          this.run.finishedAt = new Date().toISOString();
          // Provider errors can contain request details. Only our own product errors are shown.
          this.run.error =
            error instanceof Error && /^(Pip |Pine ended|The exported)/.test(error.message)
              ? error.message
              : "The Pine connection ended before a verified blueprint arrived. Check your key and tunnel, then retry.";
          this.record(this.run.error);
        })
        .finally(async () => {
          this.journey = null;
          if (this.run) {
            try {
              await this.saveReceipt();
            } catch {
              this.record("The local journey record could not be saved.");
            }
          }
          this.pending = null;
        });
    }
    return this.run;
  }
  workshop(ticket: string | null) {
    if (!this.run || !active(this.run) || ticket !== this.ticket) return null;
    return { runId: this.run.id, scene: this.run.scene, mode: this.run.mode };
  }
  async import(bytes: Uint8Array, _filename: string, computerId: string | null = null) {
    const run = this.run;
    if (run?.mode === "pine" && !computerId)
      throw new Error("Live journeys accept only artifacts retrieved from Pine.");
    if (
      run?.status === "succeeded" &&
      run.receipt?.sha256 === createHash("sha256").update(bytes).digest("hex")
    )
      return true;
    if (!run || !active(run)) throw new Error("There is no active journey for this blueprint.");
    if (bytes.byteLength > 16_384)
      throw new Error("The blueprint is too large. Export it from the workshop.");
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      this.record("The downloaded file is not valid JSON.", "verifier");
      return false;
    }
    const result = verifyBlueprint(input, run.id, run.scene);
    if (!result.ok) {
      this.record(result.reason, "verifier");
      return false;
    }
    if (this.importing) throw new Error("Another blueprint is being checked. Wait a moment before retrying.");
    this.importing = true;
    try {
      const filename = `bridge-${run.id}.json`;
      const config = configuration();
      await mkdir(config.dataDir, { recursive: true, mode: 0o700 });
      await writeFile(join(config.dataDir, filename), bytes, { mode: 0o600 });
      if (this.run !== run || !active(run)) return false;
      run.blueprint = result.blueprint;
      run.path = result.path;
      run.receipt = {
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.byteLength,
        filename,
        source: run.mode,
        computerId,
        verifiedAt: new Date().toISOString(),
        checks: [
          "Current journey",
          "Current world revision",
          "Requested color",
          "Within 12 tiles",
          "No rocks or duplicates",
          "Connected shore to shore",
        ],
      };
      run.status = "succeeded";
      run.finishedAt = new Date().toISOString();
      this.record("All six checks passed. Importing the exact exported bridge.", "verifier");
      try {
        await this.saveReceipt();
      } catch {
        this.record("The local journey record could not be saved.");
      }
      return true;
    } finally {
      this.importing = false;
    }
  }
  private async saveReceipt() {
    if (!this.run) return;
    await mkdir(configuration().dataDir, { recursive: true, mode: 0o700 });
    await writeFile(
      join(configuration().dataDir, `receipt-${this.run.id}.json`),
      JSON.stringify({ ...this.run, workshopUrl: "[expired]" }, null, 2),
      { mode: 0o600 },
    );
  }
  async delegation() {
    if (!this.journey || !this.run?.desktopReady) throw new Error("The live desktop is not available yet.");
    return this.journey.delegation();
  }
  cancel() {
    if (!this.run || !active(this.run)) return;
    this.run.status = "canceled";
    this.run.finishedAt = new Date().toISOString();
    this.run.error = null;
    this.journey?.cancel();
    this.record("Journey canceled. Your world is saved for another attempt.");
  }
  async shutdown() {
    this.closing = true;
    this.cancel();
    await this.pending;
  }
}
