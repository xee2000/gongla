import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "./index";
import { userSessions, users } from "./schema";

export const SESSION_COOKIE = "gongla_test_session";

export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, nickname: users.nickname, provider: users.provider })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(and(eq(userSessions.tokenHash, tokenHash), gt(userSessions.expiresAt, Date.now())))
    .limit(1);
  return rows[0] ?? null;
}
