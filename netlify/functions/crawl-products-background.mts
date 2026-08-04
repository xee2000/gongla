import type { Config } from "@netlify/functions";
import {
  crawlerTargets,
  crawlProductPage,
  discoverYoutubePaidPromotions,
  saveCrawledProducts,
} from "../../lib/product-crawler";
import type { CrawledProduct } from "../../lib/product-crawler";

export default async function handler(request: Request) {
  const expected = process.env.CRAWLER_ADMIN_KEY;
  if (!expected || request.headers.get("x-crawler-key") !== expected) {
    return new Response("Forbidden", { status: 403 });
  }

  const errors: Array<{ url: string; error: string }> = [];
  let youtubeProducts: CrawledProduct[] = [];
  let savedYoutube: CrawledProduct[] = [];
  try {
    youtubeProducts = await discoverYoutubePaidPromotions();
    // YouTube results are the primary source. Persist them before following any
    // outbound shopping links so a slow or unavailable shop cannot block them.
    savedYoutube = await saveCrawledProducts(youtubeProducts);
  } catch (error) {
    errors.push({
      url: "youtube-api",
      error: error instanceof Error ? error.message : String(error),
    });
  }
  const linkedShoppingUrls = Array.from(
    new Set(
      youtubeProducts
        .map((product) => product.purchase_url)
        .filter((url) => !/\.(naver\.com|naver\.me)(\/|$)/i.test(new URL(url).hostname)),
    ),
  ).slice(0, 30);
  const targets = [
    ...linkedShoppingUrls.map((url) => ({ url, source: "shopping_mall" })),
    ...crawlerTargets(),
  ];
  const linkedProducts: CrawledProduct[] = [];

  // Keep concurrency bounded so one slow site does not serialize the whole run,
  // without opening too many connections from a single background function.
  for (let index = 0; index < targets.length; index += 5) {
    const batch = targets.slice(index, index + 5);
    const results = await Promise.allSettled(
      batch.map((target) => crawlProductPage(target.url, target.source)),
    );
    results.forEach((result, resultIndex) => {
      const target = batch[resultIndex];
      if (result.status === "fulfilled") {
        if (result.value) linkedProducts.push(result.value);
        else errors.push({ url: target.url, error: "판매기간 또는 상품정보 없음" });
      } else {
        errors.push({
          url: target.url,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });
  }

  const savedLinked = await saveCrawledProducts(linkedProducts);
  const result = {
    youtubeDiscovered: youtubeProducts.length,
    youtubeSaved: savedYoutube.length,
    linkedTargets: targets.length,
    linkedCollected: linkedProducts.length,
    linkedSaved: savedLinked.length,
    errors,
  };
  console.log(JSON.stringify({ event: "crawler.completed", ...result }));
  return Response.json(result);
}

export const config: Config = {
  path: "/api/internal/crawl-products",
  background: true,
};
