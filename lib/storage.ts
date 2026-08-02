import { getStore } from "@netlify/blobs";
import type { SessionUser } from "./session";

export type StoredUser = SessionUser & {
  providerUserId: string;
  createdAt: number;
  lastLoginAt: number;
};

export async function saveKakaoUser(providerUserId: string, nickname: string): Promise<StoredUser> {
  const users = getStore("gongla-users");
  const key = `kakao-${providerUserId}`;
  const existing = await users.get(key, { type: "json", consistency: "strong" }) as StoredUser | null;
  const now = Date.now();
  const user: StoredUser = {
    id: key,
    provider: "kakao",
    providerUserId,
    nickname,
    createdAt: existing?.createdAt ?? now,
    lastLoginAt: now,
  };
  await users.setJSON(key, user);
  return user;
}

export async function saveProductClick(click: Record<string, string | number>) {
  const clicks = getStore("gongla-product-clicks");
  const key = `${Date.now()}-${crypto.randomUUID()}`;
  await clicks.setJSON(key, click);
}
