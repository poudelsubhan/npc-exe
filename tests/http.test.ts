import { createServer, request as httpRequest, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Game } from "../server/game";
import { handler } from "../server/http";

const game = new Game();
const config = {
  apiKey: "",
  endpoint: "",
  workshopUrl: "",
  port: 0,
  workshopPort: 0,
  dataDir: "",
  distDir: "",
};
let owner: Server;
let workshop: Server;
let base = "";
let publicBase = "";
async function listen(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test address");
  return address.port;
}
beforeAll(async () => {
  owner = createServer(handler(false, game, config));
  workshop = createServer(handler(true, game, config));
  config.port = await listen(owner);
  config.workshopPort = await listen(workshop);
  base = `http://127.0.0.1:${config.port}`;
  publicBase = `http://127.0.0.1:${config.workshopPort}`;
});
afterAll(async () => {
  await Promise.all(
    [owner, workshop].map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});
describe("public workshop and local owner separation", () => {
  it("never exposes owner routes on the tunneled listener", async () => {
    for (const route of ["/api/state", "/api/run", "/api/desktop", "/api/receipt", "/"]) {
      expect((await fetch(`${publicBase}${route}`)).status).toBe(404);
    }
    expect(
      (
        await fetch(`${publicBase}/api/run`, {
          method: "POST",
          headers: { "X-NPC-Client": "player" },
          body: '{"mode":"pine"}',
        })
      ).status,
    ).toBe(404);
  });
  it("blocks foreign origins, missing player headers and DNS rebinding", async () => {
    expect((await fetch(`${base}/api/run`, { method: "POST", body: '{"mode":"manual"}' })).status).toBe(403);
    expect(
      (
        await fetch(`${base}/api/run`, {
          method: "POST",
          headers: { Origin: "https://evil.example", "X-NPC-Client": "player" },
          body: '{"mode":"manual"}',
        })
      ).status,
    ).toBe(403);
    const rebindingStatus = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(`${base}/api/state`, { headers: { Host: "evil.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      });
      request.on("error", reject);
      request.end();
    });
    expect(rebindingStatus).toBe(403);
    expect(game.run).toBeNull();
  });
  it("permits local manual play and scopes public reads to the active ticket", async () => {
    const response = await fetch(`${base}/api/run`, {
      method: "POST",
      headers: { "X-NPC-Client": "player" },
      body: '{"mode":"manual"}',
    });
    expect(response.status).toBe(202);
    const ticket = new URL(game.run?.workshopUrl || "/", base).searchParams.get("ticket");
    expect((await fetch(`${publicBase}/api/workshop?ticket=wrong`)).status).toBe(404);
    expect((await fetch(`${publicBase}/api/workshop?ticket=${ticket}`)).status).toBe(200);
    game.cancel();
    expect((await fetch(`${publicBase}/api/workshop?ticket=${ticket}`)).status).toBe(404);
  });
});
