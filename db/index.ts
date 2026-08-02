import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

let schemaPromise: Promise<unknown> | null = null;

export async function getDb() {
  if (!env.DB) throw new Error("D1 binding `DB` is unavailable.");
  schemaPromise ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      nickname TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_identity
      ON users(provider, provider_user_id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions(user_id)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS product_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      source TEXT NOT NULL,
      target_url TEXT NOT NULL,
      clicked_at INTEGER NOT NULL
    )`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_product_clicks_user_time
      ON product_clicks(user_id, clicked_at)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_product_clicks_product_time
      ON product_clicks(product_id, clicked_at)`),
  ]);
  await schemaPromise;
  return drizzle(env.DB, { schema });
}
