import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = process.cwd();
export function configuration() {
  const file = resolve(root, ".env");
  const env = { ...(existsSync(file) ? parseEnv(readFileSync(file, "utf8")) : {}), ...process.env };
  const tunnelFile = resolve(root, ".tunnel-url");
  const workshopUrl =
    env["WORKSHOP_PUBLIC_URL"]?.trim() ||
    (existsSync(tunnelFile) ? readFileSync(tunnelFile, "utf8").trim() : "");
  return {
    apiKey: env["PINE_SANDBOX_API_KEY"]?.trim() || "",
    endpoint: env["PINE_SANDBOX_ENDPOINT"] || "https://pinesandbox.io",
    workshopUrl: workshopUrl.replace(/\/$/, ""),
    port: Number(env["PORT"] || 3210),
    workshopPort: Number(env["WORKSHOP_PORT"] || 3211),
    dataDir: resolve(root, "data"),
    distDir: resolve(root, "dist"),
  };
}
export type Configuration = ReturnType<typeof configuration>;
