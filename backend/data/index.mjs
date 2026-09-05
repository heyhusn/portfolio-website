/**
 * Which database the app talks to, and the single interface both speak.
 *
 *   DATABASE_URL set   →  Postgres (Supabase). Production.
 *   DATABASE_URL unset →  SQLite file. Local development, zero setup.
 *
 * The two drivers are imported differently, and the asymmetry is deliberate:
 *
 *  - Postgres is imported statically, so a bundler tracing this file follows
 *    it and includes the `postgres` package in the serverless function.
 *  - SQLite is resolved from a specifier assembled at runtime, so that same
 *    tracer does NOT follow it into better-sqlite3 — a native module that is
 *    intentionally not a production dependency and cannot be built on a
 *    serverless host.
 *
 * Written as two plain static imports, the deploy would try to bundle a
 * native binary it has no use for. Written as two dynamic ones, the driver
 * production actually needs would be missing from the bundle. Each import
 * style is wrong for the other driver.
 */
import { driver as postgresDriver } from "./postgres.mjs";

let loaded = null;

export const usingPostgres = () => Boolean(process.env.DATABASE_URL);

export async function repo() {
  if (loaded) return loaded;

  if (usingPostgres()) {
    loaded = postgresDriver;
    return loaded;
  }

  const localDriver = "./sqlite.mjs";
  loaded = (await import(/* @vite-ignore */ localDriver)).driver;
  return loaded;
}

/** For tests and scripts that need to switch drivers mid-process. */
export function resetRepo() {
  loaded = null;
}

export default repo;
