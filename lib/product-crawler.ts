import { load } from "cheerio";

export type CrawledProduct = {
  external_id: string;
  name: string;
  original_price: number | null;
  sale_price: number | null;
  source: "youtube" | "naver_smartstore" | "shopping_mall";
  source_name: string;
  image_url: string | null;
  sale_start_at: string;
  sale_end_at: string;
  purchase_url: string;
  source_url: string;
  status: "scheduled" | "active" | "ended";
  raw_data: Record<string, unknown>;
  last_crawled_at: string;
};

type JsonObject = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function asIso(value: unknown) {
  const raw = asText(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function flattenJsonLd(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== "object") return [];
  const node = value as JsonObject;
  return [node, ...flattenJsonLd(node["@graph"])];
}

function inferKoreanPeriod(content: string, now: Date) {
  const match = content.replace(/\s+/g, " ").match(
    /(?:(\d{4})[.년\-/]\s*)?(\d{1,2})[.월\-/]\s*(\d{1,2})일?[^\d]{0,30}(?:부터|~|～|-)[^\d]{0,30}(?:(\d{4})[.년\-/]\s*)?(\d{1,2})[.월\-/]\s*(\d{1,2})일?(?:[^\d]{0,15}(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?)?/,
  );
  if (!match) return undefined;
  const startYear = Number(match[1] || now.getFullYear());
  const endYear = Number(match[4] || startYear);
  let hour = Number(match[8] || 23);
  if (match[7] === "오후" && hour < 12) hour += 12;
  if (match[7] === "오전" && hour === 12) hour = 0;
  const start = new Date(Date.UTC(startYear, Number(match[2]) - 1, Number(match[3]), -9));
  const end = new Date(Date.UTC(endYear, Number(match[5]) - 1, Number(match[6]), hour - 9, Number(match[9] || 59)));
  if (end <= start) end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function statusAt(start: string, end: string, now: Date): CrawledProduct["status"] {
  if (now < new Date(start)) return "scheduled";
  if (now >= new Date(end)) return "ended";
  return "active";
}

export async function crawlProductPage(
  requestedUrl: string,
  source: CrawledProduct["source"],
  now = new Date(),
): Promise<CrawledProduct | null> {
  const response = await fetch(requestedUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "GonglaBot/1.0 (+https://gongla.netlify.app)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const pageUrl = response.url;
  const $ = load(await response.text());
  const nodes: JsonObject[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      nodes.push(...flattenJsonLd(JSON.parse($(element).text())));
    } catch {
      // 손상된 JSON-LD 블록만 건너뛴다.
    }
  });
  const product = nodes.find((node) => {
    const type = node["@type"];
    return type === "Product" || (Array.isArray(type) && type.includes("Product"));
  });
  const offerValue = product?.offers;
  const offer = (Array.isArray(offerValue) ? offerValue[0] : offerValue) as JsonObject | undefined;
  const bodyText = $("body").text();
  const period = inferKoreanPeriod(bodyText, now);
  const start = asIso(offer?.availabilityStarts) ?? asIso(product?.releaseDate) ?? period?.start;
  const end = asIso(offer?.availabilityEnds) ?? asIso(offer?.priceValidUntil) ?? period?.end;
  const name = asText(product?.name) ?? asText($('meta[property="og:title"]').attr("content"));
  if (!start || !end || !name || new Date(end) <= new Date(start)) return null;
  const imageValue = product?.image;
  const image = asText(Array.isArray(imageValue) ? imageValue[0] : imageValue) ?? asText($('meta[property="og:image"]').attr("content"));
  const canonical = asText($('link[rel="canonical"]').attr("href")) ?? pageUrl;
  const purchase = new URL(asText(offer?.url) ?? canonical, pageUrl).toString();
  const sourceName = asText(product?.brand) ?? new URL(pageUrl).hostname;

  return {
    external_id: asText(product?.sku) ?? asText(product?.productID) ?? canonical,
    name,
    original_price: asPrice(offer?.highPrice) ?? null,
    sale_price: asPrice(offer?.price ?? offer?.lowPrice) ?? null,
    source,
    source_name: sourceName,
    image_url: image ?? null,
    sale_start_at: start,
    sale_end_at: end,
    purchase_url: purchase,
    source_url: pageUrl,
    status: statusAt(start, end, now),
    raw_data: { jsonLd: product ?? null, crawledFrom: pageUrl },
    last_crawled_at: now.toISOString(),
  };
}

export function crawlerTargets() {
  const parse = (value?: string) => (value ?? "").split(/[\n,]/).map((url) => url.trim()).filter(Boolean);
  return [
    ...parse(process.env.YOUTUBE_CRAWLER_URLS).map((url) => ({ url, source: "youtube" as const })),
    ...parse(process.env.NAVER_SMARTSTORE_CRAWLER_URLS).map((url) => ({ url, source: "naver_smartstore" as const })),
    ...parse(process.env.SHOPPING_MALL_CRAWLER_URLS).map((url) => ({ url, source: "shopping_mall" as const })),
  ];
}

export async function saveCrawledProducts(products: CrawledProduct[]) {
  if (!products.length) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  const response = await fetch(`${url}/rest/v1/products?on_conflict=source,external_id`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(products),
  });
  if (!response.ok) throw new Error(`Supabase save failed (${response.status}): ${await response.text()}`);
  return (await response.json()) as unknown[];
}
