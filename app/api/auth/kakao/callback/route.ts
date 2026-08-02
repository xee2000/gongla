import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../../db";
import { hashToken, SESSION_COOKIE } from "../../../../../db/session";
import { userSessions, users } from "../../../../../db/schema";

const STATE_COOKIE = "gongla_kakao_oauth_state";

type KakaoToken = { access_token?: string; error?: string; error_description?: string };
type KakaoUser = {
  id: number;
  properties?: { nickname?: string };
  kakao_account?: { profile?: { nickname?: string } };
};

function homeWithError(request: Request, code: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("login_error", code);
  return Response.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (oauthError) return homeWithError(request, "cancelled");
  if (!code || !returnedState || returnedState !== expectedState) {
    return homeWithError(request, "invalid_state");
  }

  const restApiKey = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI;
  if (!restApiKey || !redirectUri) return homeWithError(request, "not_configured");

  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: restApiKey,
    redirect_uri: redirectUri,
    code,
  });
  if (process.env.KAKAO_CLIENT_SECRET) {
    tokenBody.set("client_secret", process.env.KAKAO_CLIENT_SECRET);
  }

  const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: tokenBody,
  });
  const token = (await tokenResponse.json()) as KakaoToken;
  if (!tokenResponse.ok || !token.access_token) {
    console.error("Kakao token exchange failed", token.error, token.error_description);
    return homeWithError(request, "token_failed");
  }

  const userResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!userResponse.ok) return homeWithError(request, "profile_failed");
  const kakaoUser = (await userResponse.json()) as KakaoUser;
  const providerUserId = String(kakaoUser.id);
  const nickname =
    kakaoUser.kakao_account?.profile?.nickname ??
    kakaoUser.properties?.nickname ??
    `카카오 사용자 ${providerUserId.slice(-4)}`;

  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.provider, "kakao"), eq(users.providerUserId, providerUserId)))
    .limit(1);
  const now = Date.now();
  const userId = existing[0]?.id ?? `kakao-${crypto.randomUUID()}`;

  if (existing[0]) {
    await db.update(users).set({ nickname, lastLoginAt: now }).where(eq(users.id, userId));
  } else {
    await db.insert(users).values({
      id: userId,
      provider: "kakao",
      providerUserId,
      nickname,
      createdAt: now,
      lastLoginAt: now,
    });
  }

  const sessionToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  await db.insert(userSessions).values({
    tokenHash: await hashToken(sessionToken),
    userId,
    createdAt: now,
    expiresAt,
  });
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return Response.redirect(new URL("/", request.url));
}
