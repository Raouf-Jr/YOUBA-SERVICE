import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Connection = {
  db: DB;
  kind: "postgres" | "pglite";
  close: () => Promise<void>;
};

const migrationsFolder = path.join(process.cwd(), "drizzle");

/**
 * Connects to PostgreSQL when DATABASE_URL is set (production: Neon, Supabase…),
 * otherwise to an embedded PGlite database stored on disk (local development).
 * Pass `dataDir: "memory://"` for a throwaway in-memory database (tests).
 */
export async function connect(options: { dataDir?: string } = {}): Promise<Connection> {
  const url = process.env.DATABASE_URL;
  if (url && !options.dataDir) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare:false keeps us compatible with transaction poolers (Neon, Supabase).
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
    return {
      db: drizzle(client, { schema }) as unknown as DB,
      kind: "postgres",
      close: () => client.end(),
    };
  }

  if (process.env.NETLIFY || process.env.VERCEL) {
    throw new Error("DATABASE_URL manquant : ajoutez la chaîne de connexion PostgreSQL dans les variables d'environnement de l'hébergeur.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = options.dataDir ?? process.env.PGLITE_DIR ?? ".data/pglite";
  if (!dataDir.includes("://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return {
    db: drizzle(client, { schema }) as unknown as DB,
    kind: "pglite",
    close: () => client.close(),
  };
}

export async function runMigrations(conn: Connection) {
  if (conn.kind === "postgres") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(conn.db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(conn.db as never, { migrationsFolder });
  }
}
