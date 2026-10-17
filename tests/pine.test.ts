import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  create: vi.fn(),
  stop: vi.fn(),
  artifacts: vi.fn(),
  read: vi.fn(),
  run: vi.fn(),
}));
vi.mock("@pinesandbox/computer", () => ({
  Client: class {
    createComputer = fake.create;
  },
}));

import { PineJourney } from "../server/pine";

const config = {
  apiKey: "synthetic-test-key",
  endpoint: "https://example.invalid",
  workshopUrl: "",
  port: 0,
  workshopPort: 0,
  dataDir: "",
  distDir: "",
};
function hooks() {
  return {
    event: vi.fn(),
    ready: vi.fn(),
    artifact: vi.fn().mockResolvedValue(true),
    verifying: vi.fn(),
    cleanup: vi.fn(),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  fake.stop.mockResolvedValue(true);
  fake.artifacts.mockResolvedValue([]);
  fake.run.mockResolvedValue({ turnId: "turn", state: "completed" });
  fake.create.mockResolvedValue({
    id: "test-computer",
    requireAgentProtocol: vi.fn(),
    stop: fake.stop,
    createSession: vi.fn().mockResolvedValue({
      createTab: vi.fn(),
      agent: { run: fake.run },
      listArtifacts: fake.artifacts,
      readArtifact: fake.read,
    }),
  });
});
describe("Pine boundary, synthetic provider responses only", () => {
  it("does not turn completion without an artifact into success and releases compute", async () => {
    const observers = hooks();
    const journey = new PineJourney(config, observers);
    await expect(journey.run("test-run", "https://example.invalid/workshop")).rejects.toThrow(
      /without a downloaded/,
    );
    expect(observers.artifact).not.toHaveBeenCalled();
    expect(observers.cleanup).toHaveBeenCalledWith(true);
  });
  it("passes exact downloaded bytes to the independent verifier", async () => {
    const bytes = Buffer.from('{"example":"synthetic"}');
    fake.artifacts.mockResolvedValue([{ id: "download", filename: "bridge.json", size: bytes.length }]);
    fake.read.mockResolvedValue(bytes);
    const observers = hooks();
    await new PineJourney(config, observers).run("test-run", "https://example.invalid/workshop");
    expect(observers.artifact).toHaveBeenCalledWith(bytes, "bridge.json", "test-computer");
    expect(observers.cleanup).toHaveBeenCalledWith(true);
  });
  it("rejects invalid exports even when Pine claims completion", async () => {
    fake.artifacts.mockResolvedValue([{ id: "download", filename: "bridge.json", size: 2 }]);
    fake.read.mockResolvedValue(Buffer.from("{}"));
    const observers = hooks();
    observers.artifact.mockResolvedValue(false);
    await expect(
      new PineJourney(config, observers).run("test-run", "https://example.invalid/workshop"),
    ).rejects.toThrow(/did not pass verification/);
    expect(observers.cleanup).toHaveBeenCalledWith(true);
  });
  it("surfaces failed turns and unconfirmed release without claiming success", async () => {
    fake.run.mockResolvedValue({ turnId: "turn", state: "failed" });
    fake.stop.mockResolvedValue(false);
    const observers = hooks();
    await expect(
      new PineJourney(config, observers).run("test-run", "https://example.invalid/workshop"),
    ).rejects.toThrow(/failed/);
    expect(observers.cleanup).toHaveBeenCalledWith(false);
    expect(observers.artifact).not.toHaveBeenCalled();
  });
  it("ignores oversize and non-JSON downloads", async () => {
    fake.artifacts.mockResolvedValue([
      { id: "large", filename: "bridge.json", size: 99_999 },
      { id: "script", filename: "bridge.js", size: 100 },
    ]);
    const observers = hooks();
    await expect(
      new PineJourney(config, observers).run("test-run", "https://example.invalid/workshop"),
    ).rejects.toThrow(/without a downloaded/);
    expect(observers.artifact).not.toHaveBeenCalled();
  });
});
