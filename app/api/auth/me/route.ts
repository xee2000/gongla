import { getCurrentUser } from "../../../../lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json(
    { user },
    { headers: { "cache-control": "private, no-store, max-age=0" } },
  );
}
