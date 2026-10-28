/** Neon'ni toza holatdan qayta qurish pipelini:
 *   1) supabase/migrations -> neon/0001_neon_schema.sql (transform)
 *   2) Neon'ga qo'llash (reset bilan)
 *   3) drizzle-kit introspect + generatsiya xatolarini tuzatish
 *   4) types.ts bilan solishtirish (drift) va RLS/DB testi
 * Ishlatish: node scripts/neon-sync.mjs [--no-reset] */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const reset = !process.argv.includes("--no-reset");
const node = process.execPath;

function run(label, cmd, args, ok = (code) => code === 0) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (!ok(r.status)) throw new Error(`${label} tugamadi (kod ${r.status})`);
}

run("1. Sxema generatori", node, ["scripts/neon-transform.mjs"]);
run("2. Neon'ga qo'llash", node, ["scripts/neon-apply.mjs", ...(reset ? ["--reset"] : [])]);

console.log("\n=== 3. Drizzle introspect ===");
const kit = spawnSync(node, ["node_modules/drizzle-kit/bin.cjs", "introspect"], { encoding: "utf8" });
if (kit.status !== 0) throw new Error(`introspect xato: ${kit.stderr?.slice(0, 400) ?? ""}`);

// Introspect natijani `out` papkasiga yozadi — uni ishlatiladigan joyga ko'chiramiz.
for (const f of ["schema.ts", "relations.ts"]) {
  const from = `drizzle/migrations/${f}`;
  if (fs.existsSync(from)) fs.renameSync(from, `src/db/${f}`);
}
run("3b. Generatsiyani tuzatish", node, ["scripts/neon-drizzle-postfix.mjs"]);

run("4. Drift (types.ts ↔ Neon)", node, ["scripts/neon-drift.mjs"]);
run("5. RLS izolatsiya testi", node, ["scripts/neon-rls-test.mjs"]);

console.log("\n=== 6. src/lib/db.ts testi ===");
const bundle = spawnSync(node, ["node_modules/esbuild/bin/esbuild", "scripts/neon-db-check.ts",
  "--bundle", "--platform=node", "--format=esm", "--packages=external", "--outfile=.tmp-db-check.mjs", "--log-level=warning"], { stdio: "inherit" });
if (bundle.status !== 0) throw new Error("db testi bundlanmadi");
try {
  run("", node, [".tmp-db-check.mjs"]);
} finally {
  fs.rmSync(".tmp-db-check.mjs", { force: true });
}

console.log("\nNeon sxemasi tayyor.");
