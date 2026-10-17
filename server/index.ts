import { createServer } from "node:http";
import { configuration } from "./config";
import { Game } from "./game";
import { handler } from "./http";

const config = configuration();
const game = new Game();
await game.initialize();
const owner = createServer(handler(false, game, config));
const workshop = createServer(handler(true, game, config));
for (const server of [owner, workshop]) {
  server.requestTimeout = 20_000;
  server.headersTimeout = 10_000;
}
owner.listen(config.port, "127.0.0.1", () => console.log(`NPC.exe → http://localhost:${config.port}`));
workshop.listen(config.workshopPort, "127.0.0.1", () =>
  console.log(`Workshop only → http://localhost:${config.workshopPort}`),
);
for (const server of [owner, workshop])
  server.on("error", (error) => {
    console.error(error.message);
    void close();
  });
let shuttingDown = false;
async function close() {
  if (shuttingDown) return;
  shuttingDown = true;
  owner.close();
  workshop.close();
  await game.shutdown();
  process.exit(0);
}
process.on("SIGINT", () => void close());
process.on("SIGTERM", () => void close());
