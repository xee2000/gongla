import type { SessionUser } from "./session";
import { supabaseRest } from "./supabase-rest";

export type StoredUser = SessionUser & {
  providerUserId: string;
  createdAt: number;
  lastLoginAt: number;
};

export async function saveKakaoUser(providerUserId: string, nickname: string): Promise<StoredUser> {
  const rows = await supabaseRest<Array<{ id: string; nickname: string; provider: "kakao" }>>(
    "rpc/upsert_kakao_user",
    { method: "POST", body: JSON.stringify({ p_provider_user_id: providerUserId, p_nickname: nickname }) },
  );
  const row = rows[0];
  if (!row) throw new Error("Supabase did not return the Kakao user.");
  const now = Date.now();
  return { ...row, providerUserId, createdAt: now, lastLoginAt: now };
}

export async function saveProductClick(click: {
  userId: string;
  userNickname: string;
  productId: string;
  productName: string;
  source: string;
  targetUrl: string;
}) {
  const providerUserId = click.userId.startsWith("kakao-")
    ? click.userId.slice("kakao-".length)
    : click.userId;
  await saveKakaoUser(providerUserId, click.userNickname);
  await supabaseRest("rpc/record_purchase_click", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: click.userId,
      p_product_id: click.productId,
      p_product_name: click.productName,
      p_source: click.source,
      p_purchase_url: click.targetUrl,
    }),
  });
}
