import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { hashToken, SESSION_COOKIE } from "../../../../db/session";
import { userSessions } from "../../../../db/schema";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(userSessions).where(eq(userSessions.tokenHash, await hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
