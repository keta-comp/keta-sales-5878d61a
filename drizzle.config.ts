import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

loadEnv({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // Sxema Neon'da migratsiyalar bilan quriladi (scripts/neon-transform.mjs) —
  // drizzle faqat uni o'qiydi, migratsiya yozmaydi.
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL ?? "",
  },
});
