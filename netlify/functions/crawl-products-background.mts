import type { Config } from "@netlify/functions";
import {
  crawlerTargets,
  crawlProductPage,
  discoverNaverLimitedProducts,
  discoverYoutubePaidPromotions,
  saveCrawledProducts,
} from "../../lib/product-crawler";

export default async function handler(request: Request) {
  const expected = process.env.CRAWLER_ADMIN_KEY;
  if (!expected || request.headers.get("x-crawler-key") !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  const errors: Array<{ url: string; error: string }> = [];
  const discoveries = await Promise.allSettled([
    discoverYoutubePaidPromotions(),
    discoverNaverLimitedProducts(),
  ]);
  const products = discoveries.flatMap((result, index) => {
    if (result.status === "fulfilled") return result.value;
    errors.push({
      url: index === 0 ? "youtube-api" : "naver-shopping-api",
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });
  for (const target of crawlerTargets()) {
    try {
      const product = await crawlProductPage(target.url, target.source);
      if (product) products.push(product);
      else errors.push({ url: target.url, error: "판매기간 또는 상품정보 없음" });
    } catch (error) {
      errors.push({ url: target.url, error: error instanceof Error ? error.message : String(error) });
    }
  }
  const saved = await saveCrawledProducts(products);
  console.log(JSON.stringify({ targets: crawlerTargets().length, collected: products.length, saved: saved.length, errors }));
  return Response.json({ collected: products.length, saved: saved.length, errors });
}

export const config: Config = {
  path: "/api/internal/crawl-products",
  background: true,
};
