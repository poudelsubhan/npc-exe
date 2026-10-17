import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type CampaignCommand,
  chooseNext,
  generateLevel,
  type JournalEntry,
  lessonFor,
  recall,
} from "../shared/campaign";
import { type ChangeCommand, ChangeCommandSchema, type Run, RunSchema } from "../shared/contracts";
import { verifyManifest } from "../shared/depot";
import { checkScene, defaultScene, type Scene, verifyBlueprint } from "../shared/domain";
import { configuration } from "./config";
import { PineJourney } from "./pine";
import { ProfileStore } from "./profile";

export const active = (run: Run | null) =>
  !!run && ["preparing", "working", "verifying"].includes(run.status);
export class Game {
  scene = defaultScene();
  run: Run | null = null;
  readonly profile: ProfileStore;
  constructor(private readonly dataDir = configuration().dataDir) {
    this.profile = new ProfileStore(dataDir);
  }
  journalError: string | null = null;
  private ticket = "";
  private journey: PineJourney | null = null;
  private pending: Promise<void> | null = null;
  private closing = false;
  private importing = false;
  private changing = false;
  async initialize() {
    await this.profile.load();
    this.scene = structuredClone(this.profile.value.campaign.level.scene);
  }
  private record(text: string, source: "system" | "pine" | "verifier" = "system") {
    if (!this.run || this.run.events.at(-1)?.text === text) return;
    this.run.events = [...this.run.events.slice(-199), { at: new Date().toISOString(), text, source }];
  }
  state() {
    const config = configuration();
    return {
      scene: this.scene,
      run: this.run,
      ready: { pine: !!config.apiKey, workshop: !!config.workshopUrl },
      campaign: this.profile.value.campaign,
      journal: this.profile.value.entries,
      journalError: this.journalError,
    };
  }
  private requireIdle() {
    if (this.closing || active(this.run) || this.pending || this.importing || this.changing)
      throw new Error(
        "Finish or cancel the current journey and let its computer close before changing the world.",
      );
  }
  changeScene(input: Omit<Scene, "revision">) {
    this.requireIdle();
    const next = { ...input, revision: this.scene.revision + 1 };
    const problem = checkScene(next);
    if (problem) throw new Error(problem);
    this.changing = true;
    return this.profile
      .update((p) => ({
        ...p,
        campaign: {
          ...p.campaign,
          reason: "A challenge placed by you. Replay preserves this exact custom crossing.",
          level: {
            ...p.campaign.level,
            id: `custom:${randomUUID()}`,
            mission: "bridge",
            depot: null,
            title: "A twist in the story",
            scene: next,
            twist: `${next.rocks.length} rocks · ${next.inkBudget ?? 12} ink`,
          },
        },
      }))
      .then(() => this.applyLevel())
      .finally(() => {
        this.changing = false;
      });
  }
  async campaign(command: CampaignCommand) {
    this.requireIdle();
    this.changing = true;
    try {
      await this.profile.update((p) => {
        if (command.action === "memory")
          return {
            ...p,
            campaign: { ...p.campaign, memoryEnabled: command.memoryEnabled ?? !p.campaign.memoryEnabled },
          };
        if (command.action === "replay") return p;
        const current = p.campaign.level;
        const next = chooseNext(current, p.entries);
        const level =
          command.action === "next"
            ? generateLevel(current.seed, current.episode + 1, next.mission, next.tier)
            : generateLevel(
                command.seed ?? current.seed,
                1,
                command.mission ?? current.mission,
                command.tier ?? 1,
              );
        level.scene.revision = this.scene.revision + 1;
        return {
          ...p,
          campaign: {
            level,
            memoryEnabled: p.campaign.memoryEnabled,
            reason:
              command.action === "next"
                ? next.reason
                : "You chose this starting point. The seed fixes the challenge; Pip chooses how to solve it.",
          },
        };
      });
      if (command.action !== "memory") this.applyLevel();
    } finally {
      this.changing = false;
    }
  }
  private applyLevel() {
    this.scene = structuredClone(this.profile.value.campaign.level.scene);
    this.run = null;
    this.ticket = "";
  }
  start(mode: "pine" | "manual") {
    if (this.closing || active(this.run) || this.pending || this.importing || this.changing)
      throw new Error("A journey is already active or its computer is still closing.");
    const config = configuration();
    if (mode === "pine" && (!config.apiKey || !config.workshopUrl))
      throw new Error("Add your Pine key to .env and start the workshop tunnel before sending Pip.");
    this.ticket = randomBytes(24).toString("base64url");
    const id = randomUUID();
    const workshopPath = `/workshop?ticket=${this.ticket}`;
    const campaign = this.profile.value.campaign;
    const level = { ...structuredClone(campaign.level), scene: structuredClone(this.scene) };
    const memories = recall(this.profile.value.entries, level, campaign.memoryEnabled);
    this.run = {
      id,
      originalLevel: null,
      changeOrder: null,
      attempts: [],
      mode,
      level,
      memories,
      memoryEnabled: campaign.memoryEnabled,
      rejections: 0,
      usage: null,
      manifest: null,
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
    const run = this.run;
    this.record(
      mode === "pine"
        ? "Opening a real computer for Pip."
        : "Manual rehearsal. You are operating the workshop.",
    );
    this.record(
      campaign.memoryEnabled
        ? `Pip packed ${memories.length} verified journal ${memories.length === 1 ? "entry" : "entries"}.`
        : "Fresh-Pip trial. Previous journal entries are withheld from this run.",
    );
    if (mode === "pine") {
      this.journey = new PineJourney(config, {
        event: (text) => this.record(text, "pine"),
        usage: (usage) => {
          run.usage = usage;
        },
        ready: () => {
          if (this.run === run && active(run)) {
            run.status = "working";
            run.desktopReady = true;
            this.record("Pip’s browser is ready. The agent is taking over.");
          }
        },
        verifying: () => {
          if (this.run === run && active(run)) {
            run.status = "verifying";
            this.record("Reading the downloaded file. Checking the result independently.", "verifier");
          }
        },
        feedback: () => run.attempts.at(-1)?.reason ?? "No valid export arrived.",
        repairing: () => {
          if (this.run === run && active(run)) {
            run.status = "working";
            this.record("The file was returned. Pip is repairing it on the same computer.", "verifier");
          }
        },
        artifact: (bytes, filename, computerId) => this.import(bytes, filename, computerId),
        cleanup: (released) => {
          run.desktopReady = false;
          run.cleanup = released ? "released" : "unconfirmed";
          this.record(
            released
              ? "Pine computer released."
              : "Computer release is unconfirmed. Check the Pine console; the idle lease is 120 seconds.",
          );
        },
      });
      this.pending = this.journey
        .run(id, `${config.workshopUrl}${workshopPath}`, level.mission)
        .catch((error) => {
          if (run.status === "canceled") return;
          run.status = "failed";
          run.finishedAt = new Date().toISOString();
          run.error =
            error instanceof Error && /^(Pip |Pine ended|The exported)/.test(error.message)
              ? error.message
              : "The Pine connection ended before a verified file arrived. Check your key and tunnel, then retry.";
          this.record(run.error);
        })
        .finally(async () => {
          this.journey = null;
          await this.remember(run);
          await this.saveReceipt(run).catch(() =>
            this.record("The local journey record could not be saved."),
          );
          this.pending = null;
        });
    }
    return run;
  }
  workshop(ticket: string | null) {
    if (!this.run || !active(this.run) || ticket !== this.ticket) return null;
    return {
      runId: this.run.id,
      scene: this.run.scene,
      mode: this.run.mode,
      level: this.run.level,
      memories: this.run.memories,
      changeNotice: this.run.changeOrder?.appliedAt ? this.changeDescription(this.run) : null,
    };
  }
  queueChange(input: ChangeCommand) {
    const command = ChangeCommandSchema.parse(input);
    const run = this.run;
    if (!run || run.id !== command.runId || !active(run) || !run.level?.depot)
      throw new Error("Choose a change during the current delivery journey.");
    if (run.changeOrder) {
      if (run.changeOrder.sku === command.sku && run.changeOrder.quantity === command.quantity) return;
      throw new Error("This journey already has a change order.");
    }
    if (this.importing || run.attempts.length)
      throw new Error("Inspection has already begun. Try this on the next journey.");
    const before = run.level.depot.inventory[command.sku];
    if (before < command.quantity) throw new Error("There is not enough stock for that change.");
    run.changeOrder = {
      ...command,
      queuedAt: new Date().toISOString(),
      appliedAt: null,
      before,
      after: before - command.quantity,
    };
    this.record(
      `Change queued for inspection: ${command.quantity} ${command.sku} damaged. Stock will change when the file arrives.`,
    );
  }
  private changeDescription(run: Run) {
    const c = run.changeOrder;
    return c
      ? `Stock changed at inspection: ${c.quantity} ${c.sku} damaged; available ${c.sku} stock is now ${c.after}, previously ${c.before}. Reload the workshop and reconcile every order against current stock.`
      : "";
  }
  async import(bytes: Uint8Array, _filename: string, computerId: string | null = null) {
    const run = this.run;
    if (run?.mode === "pine" && !computerId)
      throw new Error("Live journeys accept only artifacts retrieved from Pine.");
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (run?.status === "succeeded" && run.receipt?.sha256 === hash) return true;
    if (!run || !active(run)) throw new Error("There is no active journey for this blueprint.");
    if (bytes.byteLength > 16_384 || !bytes.byteLength)
      throw new Error("The exported file is too large or empty. Export it from the workshop.");
    if (this.importing) throw new Error("Another blueprint is being checked. Wait a moment before retrying.");
    if (run.attempts.length >= 8)
      throw new Error("The export attempt limit was reached. Start a new journey.");
    this.importing = true;
    try {
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      } catch {
        throw new Error("The exported file must be UTF-8 JSON.");
      }
      const attempt: Run["attempts"][number] = {
        number: run.attempts.length + 1,
        receivedAt: new Date().toISOString(),
        checkedAt: null,
        sha256: hash,
        bytes: bytes.byteLength,
        text,
        accepted: null,
        reason: "Checking the received file.",
      };
      run.attempts.push(attempt);
      this.record(
        `Export ${attempt.number} received: ${attempt.bytes} bytes. The actual file is at inspection.`,
        "verifier",
      );
      if (run.changeOrder && !run.changeOrder.appliedAt && run.level?.depot) {
        run.originalLevel = structuredClone(run.level);
        run.level = structuredClone(run.level);
        const c = run.changeOrder;
        if (!run.level.depot) throw new Error("The depot is unavailable.");
        run.level.depot.inventory[c.sku] = c.after;
        run.level.id = `${run.level.id.slice(0, 120)}:damage:${c.sku}:${c.quantity}`;
        run.level.twist = `${run.level.twist} Change order: ${c.quantity} ${c.sku} damaged.`;
        c.appliedAt = new Date().toISOString();
        this.record(this.changeDescription(run), "verifier");
      }
      const depot = run.level?.mission === "depot" ? run.level.depot : null;
      let input: unknown;
      try {
        input = JSON.parse(text);
      } catch {
        input = null;
      }
      const result =
        input === null
          ? { ok: false as const, reason: "The downloaded file is not valid JSON." }
          : depot && run.level
            ? verifyManifest(input, run.id, run.level.id, depot)
            : verifyBlueprint(input, run.id, run.scene);
      if (!result.ok) {
        attempt.accepted = false;
        attempt.checkedAt = new Date().toISOString();
        attempt.reason = `${run.changeOrder?.appliedAt ? `${this.changeDescription(run)} ` : ""}${result.reason}`;
        run.rejections++;
        this.record(attempt.reason, "verifier");
        await this.saveReceipt(run);
        return false;
      }
      const filename = `${depot ? "dispatch" : "bridge"}-${run.id}.json`;
      await mkdir(this.dataDir, { recursive: true, mode: 0o700 });
      await writeFile(join(this.dataDir, filename), bytes, { mode: 0o600 });
      if (this.run !== run || !active(run)) return false;
      if ("blueprint" in result) {
        run.blueprint = result.blueprint;
        run.path = result.path;
      } else run.manifest = result.manifest;
      attempt.accepted = true;
      attempt.checkedAt = new Date().toISOString();
      attempt.reason = depot
        ? "Every order reconciles against current stock. Approved for delivery."
        : "Every bridge check passed. Approved for crossing.";
      run.receipt = {
        sha256: hash,
        bytes: bytes.byteLength,
        filename,
        source: run.mode,
        computerId,
        verifiedAt: attempt.checkedAt,
        checks: depot
          ? [
              "Current journey and seeded level",
              "One entry per unique order",
              "All requested units accounted for",
              "No inventory overspend",
              "First-seen order allocation",
              "Exact exported bytes retained",
            ]
          : [
              "Current journey",
              "Current world revision",
              "Requested color",
              `Within ${run.scene.inkBudget ?? 12} tiles`,
              "No rocks or duplicates",
              "Connected shore to shore",
            ],
      };
      run.status = "succeeded";
      run.finishedAt = new Date().toISOString();
      this.record(
        depot
          ? "Manifest reconciled. Loading the exact verified deliveries into the town."
          : "All six checks passed. Importing the exact exported bridge.",
        "verifier",
      );
      await this.remember(run);
      await this.saveReceipt(run).catch(() => this.record("The local journey record could not be saved."));
      return true;
    } finally {
      this.importing = false;
    }
  }
  private async remember(run: Run) {
    if (!run.level || active(run)) return;
    const note = run.blueprint?.note || run.manifest?.note;
    const lesson =
      run.status === "succeeded"
        ? note || lessonFor(run.level)
        : run.status === "canceled"
          ? "This attempt was canceled. No new ability was credited."
          : "No verified artifact arrived. Retry the task; this attempt does not establish a reusable skill.";
    const entry: JournalEntry = {
      runId: run.id,
      at: run.finishedAt ?? new Date().toISOString(),
      level: run.level,
      source: run.mode,
      outcome: run.status as JournalEntry["outcome"],
      memoryEnabled: run.memoryEnabled,
      memoryIds: run.memories.map((e) => e.runId),
      lesson:
        run.changeOrder?.appliedAt && run.status === "succeeded"
          ? `Recovered after stock changed: ${run.changeOrder.quantity} ${run.changeOrder.sku} damaged; ${run.rejections} rejected export(s). ${lesson}`.slice(
              0,
              1600,
            )
          : lesson,
      receiptHash: run.receipt?.sha256 ?? null,
      durationMs: Math.max(
        0,
        Date.parse(run.finishedAt ?? new Date().toISOString()) - Date.parse(run.startedAt),
      ),
      rejections: run.rejections,
      usage: run.usage,
    };
    try {
      await this.profile.update((p) => ({
        ...p,
        campaign:
          run.originalLevel && p.campaign.level.id === run.originalLevel.id && run.level
            ? { ...p.campaign, level: run.level }
            : p.campaign,
        entries: [...p.entries.filter((e) => e.runId !== run.id), entry].slice(-200),
      }));
      this.journalError = null;
    } catch {
      this.journalError =
        "The journey finished, but Pip’s journal could not be saved. Check free space and folder permissions before continuing.";
    }
  }
  private async saveReceipt(run: Run) {
    await mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    const temporary = join(this.dataDir, `.receipt-${run.id}-${randomUUID()}.tmp`);
    await writeFile(temporary, JSON.stringify({ ...run, workshopUrl: "[expired]" }, null, 2), {
      mode: 0o600,
    });
    await rename(temporary, join(this.dataDir, `receipt-${run.id}.json`));
  }
  async replay(id: string) {
    const entry = this.profile.value.entries.find(
      (e) => e.runId === id && e.source === "pine" && e.outcome === "succeeded" && e.receiptHash,
    );
    if (!entry || !/^[a-f0-9-]{36}$/i.test(id))
      throw new Error("Choose a saved, verified Pine journey from the journal.");
    try {
      const path = join(this.dataDir, `receipt-${id}.json`);
      if ((await stat(path)).size > 2_000_000) throw new Error("oversize");
      const run = RunSchema.parse(JSON.parse(await readFile(path, "utf8")));
      if (
        run.id !== id ||
        run.mode !== "pine" ||
        run.status !== "succeeded" ||
        run.receipt?.sha256 !== entry.receiptHash
      )
        throw new Error("receipt mismatch");
      const filename = `${run.level?.depot ? "dispatch" : "bridge"}-${id}.json`;
      const artifactPath = join(this.dataDir, filename);
      if ((await stat(artifactPath)).size > 16_384) throw new Error("oversize");
      const bytes = await readFile(artifactPath);
      if (createHash("sha256").update(bytes).digest("hex") !== entry.receiptHash)
        throw new Error("hash mismatch");
      const input: unknown = JSON.parse(bytes.toString("utf8"));
      const check = run.level?.depot
        ? verifyManifest(input, id, run.level.id, run.level.depot)
        : verifyBlueprint(input, id, run.scene);
      if (!check.ok) throw new Error("verification failed");
      for (const attempt of run.attempts) {
        const raw = Buffer.from(attempt.text);
        if (
          raw.byteLength !== attempt.bytes ||
          createHash("sha256").update(raw).digest("hex") !== attempt.sha256
        )
          throw new Error("attempt mismatch");
      }
      // Derive the displayed result from the exact validated file, not duplicate receipt fields.
      if ("manifest" in check) run.manifest = check.manifest;
      else {
        run.blueprint = check.blueprint;
        run.path = check.path;
      }
      run.desktopReady = false;
      run.workshopUrl = "[replay]";
      return run;
    } catch {
      throw new Error(
        "This saved journey could not be verified. Its files may be missing or changed. Choose another replay.",
      );
    }
  }
  async delegation() {
    if (!this.journey || !this.run?.desktopReady) throw new Error("The live desktop is not available yet.");
    return this.journey.delegation();
  }
  cancel() {
    if (!this.run || !active(this.run)) return;
    const run = this.run;
    run.status = "canceled";
    run.finishedAt = new Date().toISOString();
    run.error = null;
    this.journey?.cancel();
    this.record("Journey canceled. Your world is saved for another attempt.");
    if (run.mode === "manual") void this.remember(run);
  }
  async shutdown() {
    this.closing = true;
    this.cancel();
    await this.pending;
    await this.profile.flush();
  }
}
