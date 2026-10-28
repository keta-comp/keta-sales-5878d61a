/** drizzle-kit introspect chiqaradigan src/db/schema.ts ni tuzatadi:
 *  1) bo'sh satr defaulti `.default(')` — generator xatosi, `.default('')` bo'ladi;
 *  2) neon_auth."user" jadvali introspectga kirmaydi, lekin tashqi kalitlar unga
 *     havola qiladi — `user` eksporti qo'shiladi (fayl oxiriga).
 *  Introspectdan keyin har safar ishlatiladi (qarang: scripts/neon-sync.mjs). */
import fs from "node:fs";

const FILE = "src/db/schema.ts";
let s = fs.readFileSync(FILE, "utf8");

const emptyDefaults = (s.match(/\.default\('\)/g) ?? []).length;
s = s.split(".default(')").join(".default('')");

if (!s.includes("pgSchema")) {
  s = s.replace(/import \{[^}]*\} from "drizzle-orm\/pg-core"/, (m) => m.replace("import {", "import { pgSchema,"));
}

if (!/^export const user = /m.test(s)) {
  s += `
// drizzle-kit introspect neon_auth sxemasini chiqarmaydi, ammo public jadvallaridagi
// tashqi kalitlar shu jadvalga qaraydi. Blok qo'lda yozilgan (Better Auth sxemasi).
const neonAuth = pgSchema("neon_auth");
export const user = neonAuth.table("user", {
  id: uuid().primaryKey().notNull(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  role: text(),
  banned: boolean(),
  banReason: text(),
  banExpires: timestamp("banExpires", { withTimezone: true, mode: "string" }),
});
`;
}

fs.writeFileSync(FILE, s);
console.log(`tuzatildi: bo'sh defaultlar ${emptyDefaults} ta, neon_auth.user jadvali ${/^export const user = /m.test(s) ? "qo'shildi" : "allaqachon bor"}`);
