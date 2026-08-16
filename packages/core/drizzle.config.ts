import { defineConfig } from "drizzle-kit";

// Schema introspection only (`drizzle-kit studio`). Migrations are hand-authored SQL under
// supabase/migrations and run through the Supabase CLI (system_design.md §18) — Drizzle is not
// the migration source of truth, to avoid two competing migration histories for one database.
export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.SUPABASE_DB_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
