// Platforma xizmati klienti: RLS'dan tashqari (app_service, BYPASSRLS).
//
// Eksport nomi (`supabaseAdmin`) saqlangan — chaqiruv joylari o'zgarmagan, ammo
// ostida Neon ishlaydi. Faqat server modullarida ishlatiladi:
//   const { supabaseAdmin } = await import("@/lib/platform.server");
// `*.functions.ts` va route fayllari klient bundle'iga tushadi — ularda top-level
// import qilish taqiqlanadi.
import { serviceClient, type DbClient } from "@/lib/pg-rest.server";

let cached: DbClient | undefined;

export const supabaseAdmin: DbClient = {
  from: (table) => (cached ??= serviceClient()).from(table),
  rpc: (fn, args) => (cached ??= serviceClient()).rpc(fn, args),
};
