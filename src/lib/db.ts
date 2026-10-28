// Neon (Postgres) access layer.
//
// RLS is the tenant boundary, so every query must run inside a transaction that has
// switched to a non-superuser role and named the acting user:
//   SET LOCAL ROLE app_user; SET LOCAL app.user_id = '<uuid>';
// neondb_owner has BYPASSRLS, so it must never be used for application queries.
import postgres, { type Sql, type TransactionSql } from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql as dsql } from "drizzle-orm";

import * as schema from "@/db/schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let pool: Sql | undefined;
let db: Db | undefined;

function connection(): Sql {
  if (pool) return pool;
  const url = process.env["NEON_DATABASE_URL"];
  if (!url) throw new Error("NEON_DATABASE_URL muhit o'zgaruvchisi sozlanmagan.");
  pool = postgres(url, { max: 10, connect_timeout: 15, idle_timeout: 30, ssl: "require" });
  return pool;
}

function database(): Db {
  if (db) return db;
  db = drizzle(connection(), { schema });
  return db;
}

export type RoleName = "app_user" | "app_anon" | "app_service";

type Actor = { role: RoleName; userId: string | null };

const ROLE_SQL: Record<RoleName, string> = {
  app_user: "set local role app_user",
  app_service: "set local role app_service",
  app_anon: "set local role app_anon",
};

async function inRole<T>(actor: Actor, fn: (tx: DbTx) => Promise<T>): Promise<T> {
  return database().transaction(async (tx) => {
    if (actor.userId) await tx.execute(dsql`select set_config('app.user_id', ${actor.userId}::text, true)`);
    else await tx.execute(dsql.raw("reset app.user_id"));
    // Rol nomlari oq ro'yxatdan olingan so'zlar — kiruvchi ma'lumotdan identifikator yig'maymiz.
    await tx.execute(dsql.raw(ROLE_SQL[actor.role]));
    return fn(tx);
  });
}

/** Foydalanuvchi sessiyasi ostida — RLS faol, tenant chegarasi siyosatda. */
export const asUser = <T>(userId: string, fn: (tx: DbTx) => Promise<T>) =>
  inRole({ role: "app_user", userId }, fn);

/** Tashqi (avtorizatsiyasiz) so'rovlar — faqat anon huquqi berilgan obyektlar. */
export const asAnon = <T>(fn: (tx: DbTx) => Promise<T>) => inRole({ role: "app_anon", userId: null }, fn);

/** Webhook/platform xizmati — RLSdan tashqari (BYPASSRLS). Foydalanuvchi kodi bu yo'lga kira olmaydi. */
export const asService = <T>(fn: (tx: DbTx) => Promise<T>, userId: string | null = null) =>
  inRole({ role: "app_service", userId }, fn);

/** Dinamik SQL (PostgREST moslik qatlami) uchun xom postgres.js tranzaksiyasi. */
export async function withRoleSql<T>(
  actor: Actor,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  return connection().begin(async (tx) => {
    if (actor.userId) await tx`select set_config('app.user_id', ${actor.userId}, true)`;
    else await tx.unsafe("reset app.user_id");
    // Rol nomlari oq ro'yxatdan olinadi — kiruvchi ma'lumotdan identifikator yig'ilmaydi.
    await tx.unsafe(ROLE_SQL[actor.role]);
    return fn(tx);
  }) as Promise<T>;
}

/** Faqat metama'lumot va auth sessiyasi uchun: rol almashtirilmaydi (neondb_owner, BYPASSRLS).
 *  Tenant ma'lumotlariga bu yo'l bilan murojaat qilish taqiqlanadi. */
export function ownerSql(): Sql {
  return connection();
}

export async function closePool() {
  if (pool) await pool.end({ timeout: 2 });
  pool = undefined;
  db = undefined;
}
