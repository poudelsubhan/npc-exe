import { Client, type Computer, type Session } from "@pinesandbox/computer";
import type { Configuration } from "./config";

export type PineHooks = {
  event: (text: string) => void;
  ready: () => void;
  artifact: (bytes: Uint8Array, filename: string, computerId: string) => Promise<boolean>;
  verifying: () => void;
  cleanup: (released: boolean) => void;
};

export class PineJourney {
  private computer: Computer | null = null;
  private session: Session | null = null;
  private turnId = "";
  private readonly abort = new AbortController();
  constructor(
    private readonly config: Configuration,
    private readonly hooks: PineHooks,
  ) {}

  async delegation() {
    if (!this.computer || !this.session) throw new Error("The computer is not ready yet.");
    return (
      await this.computer.delegateDesktop(this.session.name, {
        create: false,
        signal: AbortSignal.timeout(15_000),
      })
    ).toJSON();
  }

  cancel() {
    this.abort.abort();
  }

  async run(runId: string, workshopUrl: string) {
    const client = new Client({ apiKey: this.config.apiKey, endpoint: this.config.endpoint });
    const signal = AbortSignal.any([this.abort.signal, AbortSignal.timeout(6 * 60_000)]);
    try {
      this.computer = await client.createComputer({
        ephemeral: true,
        idleTimeoutSeconds: 120,
        readyTimeoutMs: 90_000,
        metadata: { app: "npc-exe", run: runId },
        signal,
      });
      await this.computer.requireAgentProtocol({ signal });
      this.session = await this.computer.createSession({
        label: "Pip’s bridge workshop",
        browser: true,
        signal,
      });
      await this.session.createTab(workshopUrl, { signal });
      this.hooks.ready();
      const prompt = `You are Pip, a small courier trying to get home. Your game has no bridge-building action, so you have stepped into a real browser workshop to draw a bridge blueprint.\nThe workshop is open at ${workshopUrl}. Use only the browser UI: read the brief, inspect the numbered grid, click water tiles to paint a connected bridge between the shores, then click Export blueprint to download the JSON file. Each button is labeled with its column and row (zero based). You may use up to 12 bridge tiles. Avoid rocks. Tiles connect along their edges, never diagonally. Match the requested color shown in the workshop. You may toggle a tile off or clear the drawing to revise it.\nDo not use terminal commands, scripts, code execution, HTTP calls, or direct filesystem writes to create the artifact. The point is to operate the visible workshop. Do not inspect application source code. The grid offers no automatic solution; choose the route yourself. Stay on the workshop page. Do not request more instructions. After the download, finish and briefly explain your chosen route. The game will independently verify the downloaded artifact; your claim alone does not change the world.`;
      let turn = await this.session.agent.run(prompt, {
        idempotencyKey: runId,
        constraints: { maxTokens: 512_000, maxWallMs: 240_000 },
        signal,
      });
      this.turnId = turn.turnId;
      let cursor = 0;
      while (turn.state === "running" || turn.state === "canceling") {
        const page = await this.session.agent.eventsPage({ after: cursor, limit: 40, frames: false, signal });
        cursor = page.nextAfter;
        for (const event of page.events) {
          const activity = event.activity();
          const progress = event.progress();
          const text = activity?.title || progress?.text;
          if (text && (!activity || activity.state !== "running"))
            this.hooks.event(text.replaceAll(workshopUrl, "[workshop]").slice(0, 400));
        }
        turn = await this.session.agent.wait(this.turnId, { timeoutMs: 3500, signal });
      }
      signal.throwIfAborted();
      if (turn.result) {
        const result = turn.result;
        this.hooks.event(
          `Pine result: ${result.terminalReason}. ${result.summary}`
            .replaceAll(workshopUrl, "[workshop]")
            .slice(0, 1200),
        );
        const cost = result.usage.cost.total;
        this.hooks.event(
          `Usage: ${result.usage.llm.totalTokens} tokens${cost === null ? "" : ` · ${result.usage.cost.currency} ${cost.toFixed(4)}`}.`,
        );
      }
      if (turn.state !== "completed")
        throw new Error(
          turn.state === "needs_input"
            ? "Pip asked for more instructions. Try again with a simpler challenge."
            : `Pine ended the attempt (${turn.state}). Try again; your challenge is saved.`,
        );
      this.hooks.verifying();
      const artifacts = await this.session.listArtifacts({ signal });
      const blueprints = artifacts
        .filter((a) => a.filename.endsWith(".json") && a.size <= 16_384)
        .slice(-4)
        .reverse();
      for (const artifact of blueprints) {
        const bytes = await this.session.readArtifact(artifact.id, { signal });
        signal.throwIfAborted();
        if (await this.hooks.artifact(bytes, artifact.filename, this.computer.id)) return;
      }
      throw new Error(
        blueprints.length
          ? "The exported blueprint did not pass verification. Try again or open the manual workshop to inspect the challenge."
          : "Pip finished without a downloaded blueprint. No bridge was imported. Try again.",
      );
    } finally {
      if (this.session && this.turnId && signal.aborted) {
        try {
          await this.session.agent.cancel(this.turnId, { signal: AbortSignal.timeout(8000) });
        } catch {
          this.hooks.event("The cancel request could not be confirmed; releasing the computer.");
        }
      }
      if (this.computer) {
        try {
          const released = await this.computer.stop({
            timeoutMs: 30_000,
            signal: AbortSignal.timeout(35_000),
          });
          this.hooks.cleanup(released);
        } catch {
          this.hooks.cleanup(false);
        }
      } else this.hooks.cleanup(false);
      this.computer = null;
      this.session = null;
    }
  }
}
