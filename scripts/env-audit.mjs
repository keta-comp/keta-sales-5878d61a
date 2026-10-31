// Ishga tushirish: node scripts/env-audit.mjs
// Barcha o'qiladigan muhit o'zgaruvchilarini .env.example bilan solishtiradi.
// Faqat NOMLAR chiqadi — qiymatlar chop etilmaydi.
import { readFileSync, readdirSync, statSync } from "node:fs";

const SKIP_DIRS = new Set([".git", "node_modules", ".output", ".vercel", "dist", ".tanstack"]);
const CODE_EXT = /\.(ts|tsx|js|mjs|cjs)$/;

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = `${dir}/${name}`;
    const entry = statSync(path);
    if (entry.isDirectory()) walk(path, out);
    else if (CODE_EXT.test(name)) out.push(path);
  }
  return out;
}

const reads = new Map();
for (const file of walk("src", []).concat(walk("scripts", []))) {
  const source = readFileSync(file, "utf8");
  const patterns = [
    /process\.env\[\s*["']([A-Z0-9_]+)["']\s*\]/g,
    /process\.env\.([A-Z0-9_]+)/g,
    /import\.meta\.env\.([A-Z0-9_]+)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (!reads.has(match[1])) reads.set(match[1], new Set());
      reads.get(match[1]).add(file);
    }
  }
}

const documented = new Set(
  readFileSync(".env.example", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z0-9_]+=/.test(line.trim()))
    .map((line) => line.trim().split("=")[0]),
);

const missing = [...reads.keys()].filter((name) => !documented.has(name)).sort();
const unused = [...documented].filter((name) => !reads.has(name)).sort();

console.log(`o'qiladi: ${reads.size}, hujjatlashtirilgan: ${documented.size}`);
console.log("\n.env.example'da YO'QO' o'zgaruvchilar:");
for (const name of missing) console.log(`  ${name}  <- ${[...reads.get(name)].join(", ")}`);
console.log("\n.hujjatlashtirilgan, lekin kod o'qimaydi:");
for (const name of unused) console.log(`  ${name}`);
