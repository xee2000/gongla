import { getCurrentUser } from "../../../../db/session";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ user });
}
