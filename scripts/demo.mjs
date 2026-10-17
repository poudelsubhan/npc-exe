import { spawn } from "node:child_process";

// Direct Node children keep signal forwarding predictable; neither starts a paid Pine run.
const game = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], { stdio: "inherit" });
const tunnel = spawn(process.execPath, ["scripts/tunnel.mjs"], { stdio: "inherit" });
const children = [game, tunnel];
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill("SIGINT");
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
    stop();
  });
  child.on("exit", (code) => {
    if (!stopping) {
      process.exitCode = code || 0;
      stop();
    }
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
console.log("Starting NPC.exe and its restricted workshop tunnel. Press Ctrl+C to stop both.");
