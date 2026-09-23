// Fails when the six version surfaces disagree. Run from the repo root (ci.yml and release.yml).
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const lock = JSON.parse(read("package-lock.json"));
const surfaces = {
  "package.json": JSON.parse(read("package.json")).version,
  "package-lock.json (root)": lock.version,
  "package-lock.json (pkg)": lock.packages[""].version,
  "tauri.conf.json": JSON.parse(read("src-tauri/tauri.conf.json")).version,
  "Cargo.toml": /(?:^|\n)version = "([0-9.]+)"/.exec(read("src-tauri/Cargo.toml"))[1],
  "Cargo.lock (app)": /\[\[package\]\]\nname = "app"\nversion = "([0-9.]+)"/.exec(read("src-tauri/Cargo.lock"))[1],
};
const values = [...new Set(Object.values(surfaces))];
console.log(surfaces);
if (values.length !== 1) {
  console.error("Version surfaces disagree:", surfaces);
  process.exit(1);
}
console.log("All version surfaces agree:", values[0]);
