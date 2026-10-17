import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = { ...(existsSync(".env") ? parseEnv(readFileSync(".env", "utf8")) : {}), ...process.env };
// Only the restricted workshop listener is exposed, never the player API.
const child = spawn(
  "cloudflared",
  ["tunnel", "--url", `http://127.0.0.1:${env["WORKSHOP_PORT"] || 3211}`, "--no-autoupdate"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let found = false;
let buffer = "";
function read(chunk) {
  buffer = (buffer + chunk.toString()).slice(-5000);
  const url = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (url && !found) {
    found = true;
    writeFileSync(".tunnel-url", url[0], { mode: 0o600 });
    console.log(
      `Workshop is reachable at ${url[0]}\nKeep this terminal open during live play. Your player controls stay local.`,
    );
  }
}
child.stdout.on("data", read);
child.stderr.on("data", read);
child.on("error", (error) => {
  console.error(`Could not start cloudflared: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  rmSync(".tunnel-url", { force: true });
  if (!found) console.error("Tunnel did not start. Check the network and cloudflared installation.");
  process.exitCode = code || 0;
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
