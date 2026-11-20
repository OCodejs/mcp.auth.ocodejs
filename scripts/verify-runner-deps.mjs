import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const manifest = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const lockedRoot = lock.packages?.[""];

const fail = (message) => {
  console.error(`RUNNER_DEPS_PREFLIGHT_FAILED: ${message}`);
  process.exit(1);
};

if (lock.lockfileVersion !== 3) fail("package-lock.json must use lockfileVersion 3");
if (!lockedRoot) fail("package-lock root package entry is missing");

for (const section of ["dependencies", "devDependencies"]) {
  const expected = manifest[section] ?? {};
  const actual = lockedRoot[section] ?? {};
  for (const [name, version] of Object.entries(expected)) {
    if (actual[name] !== version) {
      fail(`lock mismatch: ${section}.${name}; package.json=${version}; lock=${actual[name] ?? "missing"}`);
    }
  }
  for (const name of Object.keys(actual)) {
    if (!(name in expected)) fail(`stale lock entry: ${section}.${name}`);
  }
}

if (manifest.devDependencies?.prisma !== "6.19.3") fail("Prisma CLI must be exactly 6.19.3");
if (manifest.dependencies?.["@prisma/client"] !== "6.19.3") fail("@prisma/client must be exactly 6.19.3");
if (manifest.dependencies?.["@prisma/adapter-pg"] !== "6.19.3") fail("@prisma/adapter-pg must be exactly 6.19.3");
if (manifest.dependencies?.["@prisma/adapter-neon"]) fail("remove unused @prisma/adapter-neon or reconcile adapter choice");

const lockBytes = fs.readFileSync("package-lock.json");
const lockSha256 = crypto.createHash("sha256").update(lockBytes).digest("hex");
console.log(JSON.stringify({ lockSha256, lockfileVersion: lock.lockfileVersion, prisma: "6.19.3", status: "manifest-lock-consistent" }));

if (process.argv.includes("--verify-installed")) {
  const prismaVersion = execFileSync("npx", ["--no-install", "prisma", "--version"], { encoding: "utf8" });
  if (!prismaVersion.includes("6.19.3")) fail("installed Prisma CLI version mismatch");
  if (!fs.existsSync("node_modules/.prisma/client/index.js")) fail("generated Prisma Client is missing");
  console.log("Prisma CLI and generated client are present for offline runtime.");
}
