import "server-only";
import { connect, runMigrations, type DB } from "./client";

export type { DB } from "./client";
export * as schema from "./schema";

const globalForDb = globalThis as unknown as { __youbaDb?: Promise<DB> };

async function init(): Promise<DB> {
  const conn = await connect();
  // The embedded dev database migrates itself; production runs `npm run db:migrate` at build.
  if (conn.kind === "pglite") {
    await runMigrations(conn);
    if (process.env.NODE_ENV === "development") {
      // Ctrl+C on `npm run dev` kills the server within a moment: close the database first so it
      // isn't left half-written. (`npm start` shuts down gracefully and keeps answering until then.)
      const close = () => void conn.close().catch(() => {});
      process.once("SIGINT", close);
      process.once("SIGTERM", close);
    }
  }
  return conn.db;
}

/** One shared connection per server process (survives hot reloads in dev). */
export function getDb(): Promise<DB> {
  globalForDb.__youbaDb ??= init().catch((error) => {
    globalForDb.__youbaDb = undefined;
    throw error;
  });
  return globalForDb.__youbaDb;
}
