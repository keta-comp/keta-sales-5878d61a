import postgres from "postgres";
const sql = postgres(process.env.NEON_DATABASE_URL, { ssl: "require" });
for (const t of ["orders", "feature_flags"]) {
  const r = await sql`select column_name, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name=${t} order by ordinal_position`;
  console.log("==", t, "==");
  for (const c of r) console.log(`  ${c.column_name}${c.is_nullable === "NO" && !c.column_default ? " (majburiy)" : ""}`);
}
await sql.end();
