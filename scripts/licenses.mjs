import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
// Reviewed for this project. MPL applies to unmodified third-party components; preserve notices.
const allowed = new Set([
  "MIT",
  "Apache-2.0",
  "MIT OR Apache-2.0",
  "ISC",
  "BSD-3-Clause",
  "MPL-2.0",
  "CC-BY-4.0",
]);
const failures = Object.entries(lock.packages).filter(([name, item]) => name && !allowed.has(item.license));
if (failures.length) {
  console.error(
    "Dependency licenses need review:",
    failures.map(([name, item]) => `${name}: ${item.license || "missing"}`),
  );
  process.exitCode = 1;
} else console.log(`Reviewed licenses for ${Object.keys(lock.packages).length - 1} locked packages.`);
