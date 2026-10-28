// Supabase migratsiyalarini Neon uchun toza SQL'ga aylantiradi.
// Ishlatish: node scripts/neon-transform.mjs   ->  neon/0001_neon_schema.sql
import fs from "node:fs";
import path from "node:path";
import { splitStatements } from "./sql-split.mjs";

const SRC = "supabase/migrations";
const OUT = "neon/0001_neon_schema.sql";

const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".sql")).sort();

/** `;`, `--`, `/* *\/` va dollar-quote holatlarini hisobga oluvchi ajratgich. */

const ROLE_MAP = [
  [/\bservice_role\b/g, "app_service"],
  [/\bauthenticated\b/g, "app_user"],
  [/\banon\b/g, "app_anon"],
];

const DROP_PATTERNS = [
  /^INSERT INTO storage\./i,
  /^(DROP |CREATE )POLICY .*ON storage\.objects/i,
  /^(GRANT|REVOKE).*\bON\b.*\bstorage\.objects\b/i,
  // Realtime (postgres_changes) o'rniga polling — Neon'da bu publication yo'q.
  /^ALTER PUBLICATION supabase_realtime/i,
];

/** Operatorning boshidagi izoh qatorlarini olib tashlaydi (pattern testlari to'g'ri ishlashi uchun). */
function stripLeadingComments(stmt) {
  const lines = stmt.split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].trim() === "" || lines[i].trim().startsWith("--"))) i++;
  return lines.slice(i).join("\n").trim();
}

const stats = { dropped: [], replaced: {}, total: 0 };
const bump = (key) => (stats.replaced[key] = (stats.replaced[key] ?? 0) + 1);

const body = [];
for (const file of files) {
  const sql = fs.readFileSync(path.join(SRC, file), "utf8");
  for (const raw of splitStatements(sql)) {
    // Faqat izohdan iborat bo'lsa — tashlash.
    if (raw.split("\n").every((l) => l.trim().startsWith("--") || l.trim() === "")) continue;
    const sqlOnly = stripLeadingComments(raw);
    if (!sqlOnly) continue;
    if (DROP_PATTERNS.some((re) => re.test(sqlOnly))) {
      stats.dropped.push(`${file}: ${sqlOnly.split("\n")[0].slice(0, 72)}`);
      continue;
    }
    let s = sqlOnly;

    // Supabase Auth → Neon Auth (host qilingan Better Auth).
    if (/auth\.uid\(\)/.test(s)) {
      s = s.replace(/auth\.uid\(\)/g, "app.user_id()");
      bump("auth.uid()");
    }
    if (/auth\.users/.test(s)) {
      s = s.replace(/\bauth\.users\b/g, 'neon_auth."user"');
      bump("auth.users");
    }
    // Better Auth'ning user jadvalida metadata ustuni yo‘q — name/email yetarli.
    s = s
      .replace(/NEW\.raw_user_meta_data->>'full_name'/g, "NULLIF(NEW.name, '')")
      .replace(/NEW\.raw_user_meta_data->>'business_name'/g, "NULLIF(NEW.name, '')");
    if (/raw_user_meta_data/.test(s)) bump("raw_user_meta_data (qoldiq)");

    for (const [re, to] of ROLE_MAP) {
      const next = s.replace(re, to);
      if (next !== s) bump(to);
      s = next;
    }
    stats.total++;
    body.push(`-- ${file}\n${s}`);
  }
}

const prologue = `-- ============================================================
-- KetaOne — Neon uchun sxema. scripts/neon-transform.mjs generatsiyasi.
-- Manba: supabase/migrations (Supabase Auth/Storage/rollari almashtirilgan).
-- Qoidalar:
--   auth.uid()      -> app.user_id()  (so'rovda SET LOCAL app.user_id bilan beriladi)
--   auth.users      -> neon_auth."user" (Neon Auth = host qilingan Better Auth)
--   anon/authenticated/service_role -> app_anon / app_user / app_service(BYPASSRLS)
--   storage.buckets / storage.objects -> tashlandi (S3/Neon Object Storage, presigned URL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA IF NOT EXISTS app;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_anon') THEN CREATE ROLE app_anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN CREATE ROLE app_user NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN CREATE ROLE app_service NOLOGIN BYPASSRLS; END IF;
END $$;

GRANT app_anon, app_user, app_service TO neondb_owner;
GRANT USAGE ON SCHEMA public TO app_anon, app_user, app_service;
GRANT USAGE ON SCHEMA neon_auth TO app_user, app_service;
GRANT REFERENCES ON neon_auth."user" TO app_user, app_service;

-- Har bir so'rov tranzakciyasida: SET LOCAL ROLE app_user; SET LOCAL app.user_id = '<uuid>';
CREATE OR REPLACE FUNCTION app.user_id() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$fn$;
GRANT EXECUTE ON FUNCTION app.user_id() TO app_anon, app_user, app_service;

-- Supabase public sxemidagi default privileges'ni takrorlaymiz: IDs generatsiyasi
-- (gen_random_uuid, sequence) tenant rollari uchun ham ishlashi kerak.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO app_service;
`;

const header = `${prologue}\n`;
fs.mkdirSync("neon", { recursive: true });
const epilogue = `
-- ============ epilogue ============
-- Migratsiyalar yaratgan barcha ketma-ketliklarga huquq (default privileges
-- faqat keyingi obyektlarga ta'sir qiladi). Jadval huquqlari har migratsiyada
-- alohida yozilgan — bu yerda ularni kengaytirmaymiz.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app_service;
`;
fs.writeFileSync(OUT, header + body.join("\n\n") + "\n" + epilogue + "\n");

console.log(`Fayllar: ${files.length}, operatorlar: ${stats.total}`);
console.log("Almashtirishlar:", JSON.stringify(stats.replaced));
console.log(`Tashlangan (storage) ${stats.dropped.length} ta:`);
for (const d of stats.dropped) console.log("  - " + d);
console.log(`Chiqish: ${OUT} (${fs.statSync(OUT).size} bayt)`);
