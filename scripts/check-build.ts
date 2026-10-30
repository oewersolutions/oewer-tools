import { resolve } from "node:path";
import { checkBuild } from "../lib/check-build";

// Run after the build and before the upload: a build that fails this check is never published.
const dir = resolve(process.cwd(), process.argv[2] ?? "out");
const problems = checkBuild(dir, process.env.NEXT_PUBLIC_BASE_PATH ?? "");
if (problems.length > 0) {
  console.error(`The build is not fit to publish (${dir}):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Build check passed: ${dir}`);
