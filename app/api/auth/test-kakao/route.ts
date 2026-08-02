import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { hashToken, SESSION_COOKIE } from "../../../../db/session";
import { userSessions, users } from "../../../../db/schema";

export async function POST() {
  const db = await getDb();
  const identity = crypto.randomUUID();
  const userId = `test-kakao-${identity}`;
  const nickname = `카카오 테스트 ${identity.slice(0, 4)}`;
  const now = Date.now();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const tokenHash = await hashToken(token);
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

  await db.insert(users).values({
    id: userId,
    provider: "kakao_test",
    providerUserId: identity,
    nickname,
    createdAt: now,
    lastLoginAt: now,
  });
  await db.insert(userSessions).values({ tokenHash, userId, createdAt: now, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return Response.json({ user: { id: userId, nickname, provider: "kakao_test" } });
}
