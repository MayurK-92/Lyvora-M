import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let queryClient: ReturnType<typeof postgres> | undefined;

/**
 * Service-role database client. Reserved for pipeline workers (Inngest functions, starting M1) —
 * never import this from request-handling code that renders to a specific user. RLS does not
 * apply to this connection, so every query issued through it must filter by `user_id` explicitly
 * (system_design.md §5.4, §13).
 */
export function createServiceDbClient(): PostgresJsDatabase<typeof schema> {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      "SUPABASE_DB_URL is not set. createServiceDbClient() is for server-side workers only.",
    );
  }
  // Supabase free tier has few direct connections; keep a single pooled client.
  queryClient ??= postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
  });
  return drizzle(queryClient, { schema });
}

export type ServiceDbClient = ReturnType<typeof createServiceDbClient>;
