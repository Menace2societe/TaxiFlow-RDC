import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = [join(root, ".next"), join(root, "node_modules", ".cache")];

for (const dir of targets) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log("removed:", dir);
  }
}
console.log("clean complete");
