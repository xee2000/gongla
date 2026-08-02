import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "gongla_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  nickname: string;
  provider: "kakao";
};

type SessionPayload = SessionUser & { expiresAt: number };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is not configured.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function setSession(user: SessionUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const suppliedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (parsed.expiresAt <= Date.now()) return null;
    return { id: parsed.id, nickname: parsed.nickname, provider: parsed.provider };
  } catch {
    return null;
  }
}
