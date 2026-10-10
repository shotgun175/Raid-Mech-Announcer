// Fails when a Tauri Rust crate and its npm package disagree on major.minor.
//
// Same rule the Tauri CLI enforces inside `tauri build` (tauri-cli info/plugins.rs,
// fatal unless --ignore-version-mismatches): the `tauri` crate must match
// @tauri-apps/api, and each tauri-plugin-X crate must match @tauri-apps/plugin-X
// when both sides exist. A pair present on only one side (window-state,
// single-instance) is skipped, as the CLI does. @tauri-apps/cli and tauri-build
// are not pairs. Running it here catches a one-sided bump in CI, before
// release.yml has pushed a bump commit and tag.
//
// Reads the lockfiles, so it can run before `npm ci`. Run from the repo root
// (ci.yml and release.yml), or pass a repo root as the first argument.
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".";
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const problems = [];

// Cargo.lock: name -> version for every [[package]] entry.
const crates = new Map();
for (const block of read("src-tauri/Cargo.lock").split(/^\[\[package\]\]\s*$/m).slice(1)) {
  const name = /^name = "([^"]+)"/m.exec(block)?.[1];
  const version = /^version = "([^"]+)"/m.exec(block)?.[1];
  if (!name || !version) continue;
  if (name === "tauri" || name.startsWith("tauri-plugin-")) {
    if (crates.has(name)) {
      problems.push(`Cargo.lock has two entries for ${name} (${crates.get(name)} and ${version}); the pair check cannot tell which one ships.`);
    }
    crates.set(name, version);
  }
}

// package-lock.json: top-level installs, plus any nested copies of the same packages.
const packages = JSON.parse(read("package-lock.json")).packages ?? {};
const npmTop = new Map();
const npmNested = [];
for (const [key, entry] of Object.entries(packages)) {
  const match = /(?:^|\/)node_modules\/(@tauri-apps\/(?:api|plugin-[^/]+))$/.exec(key);
  if (!match || !entry?.version) continue;
  if (key === `node_modules/${match[1]}`) npmTop.set(match[1], entry.version);
  else npmNested.push({ key, name: match[1], version: entry.version });
}

const majorMinor = (version) => version.split(".").slice(0, 2).join(".");
const pairs = [["tauri", "@tauri-apps/api"]];
for (const crate of crates.keys()) {
  if (crate.startsWith("tauri-plugin-")) {
    pairs.push([crate, `@tauri-apps/plugin-${crate.slice("tauri-plugin-".length)}`]);
  }
}

const checked = [];
for (const [crate, pkg] of pairs) {
  const crateVersion = crates.get(crate);
  const npmVersion = npmTop.get(pkg);
  if (!crateVersion || !npmVersion) continue;
  checked.push(`${crate} ${crateVersion} <-> ${pkg} ${npmVersion}`);
  if (majorMinor(crateVersion) !== majorMinor(npmVersion)) {
    problems.push(`${crate} ${crateVersion} (Cargo.lock) vs ${pkg} ${npmVersion} (package-lock.json): major.minor differ.`);
  }
  for (const nested of npmNested.filter((n) => n.name === pkg)) {
    if (majorMinor(nested.version) !== majorMinor(crateVersion)) {
      problems.push(`${nested.key} ${nested.version} vs ${crate} ${crateVersion}: a dependency pulled in a ${pkg} the project does not pin.`);
    }
  }
}

if (!crates.has("tauri") || !npmTop.has("@tauri-apps/api")) {
  problems.push("Could not find the tauri crate in Cargo.lock or @tauri-apps/api in package-lock.json; the check would be checking nothing.");
}

for (const line of checked) console.log(`  ${line}`);
if (problems.length > 0) {
  console.error("Tauri crate/npm pairs disagree. Bump both halves of each pair on the same branch:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`All ${checked.length} Tauri pairs agree on major.minor.`);
