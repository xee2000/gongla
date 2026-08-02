import { getCurrentUser } from "../../../lib/session";
import { saveProductClick } from "../../../lib/storage";

type ClickBody = {
  productId?: unknown;
  productName?: unknown;
  source?: unknown;
  targetUrl?: unknown;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "로그인이 필요합니다." }, { status: 401 });

  const body = (await request.json()) as ClickBody;
  if (
    typeof body.productId !== "string" ||
    typeof body.productName !== "string" ||
    typeof body.source !== "string" ||
    typeof body.targetUrl !== "string"
  ) {
    return Response.json({ message: "잘못된 상품 정보입니다." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(body.targetUrl);
  } catch {
    return Response.json({ message: "잘못된 이동 주소입니다." }, { status: 400 });
  }
  if (!['https:', 'http:'].includes(target.protocol)) {
    return Response.json({ message: "허용되지 않은 이동 주소입니다." }, { status: 400 });
  }

  await saveProductClick({
    userId: user.id,
    productId: body.productId.slice(0, 200),
    productName: body.productName.slice(0, 500),
    source: body.source.slice(0, 100),
    targetUrl: target.toString().slice(0, 2000),
    clickedAt: Date.now(),
  });

  return Response.json({ redirectUrl: target.toString() });
}
