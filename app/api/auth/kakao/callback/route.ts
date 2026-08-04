import { cookies } from "next/headers";
import { setSession } from "../../../../../lib/session";
import { saveKakaoUser } from "../../../../../lib/storage";
import { errorMessage, logEvent } from "../../../../../lib/logger";

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
  const requestId = crypto.randomUUID();
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const returnedState = requestUrl.searchParams.get("state");
    const oauthError = requestUrl.searchParams.get("error");
    const cookieStore = await cookies();
    const expectedState = cookieStore.get(STATE_COOKIE)?.value;
    cookieStore.delete(STATE_COOKIE);

    if (oauthError) return homeWithError(request, "cancelled");
    if (!code || !returnedState || returnedState !== expectedState) {
      logEvent("warn", "kakao_login_invalid_state", {
        requestId,
        hasCode: Boolean(code),
        hasReturnedState: Boolean(returnedState),
        hasExpectedState: Boolean(expectedState),
      });
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
      logEvent("error", "kakao_login_token_failed", {
        requestId,
        kakaoError: token.error,
        kakaoDescription: token.error_description,
      });
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

    const user = await saveKakaoUser(providerUserId, nickname);
    await setSession({ id: user.id, nickname: user.nickname, provider: user.provider });
    logEvent("info", "kakao_login_succeeded", { requestId, userId: user.id });

    return Response.redirect(new URL("/", request.url));
  } catch (error) {
    logEvent("error", "kakao_login_callback_failed", {
      requestId,
      error: errorMessage(error),
    });
    return homeWithError(request, "server_failed");
  }
}
