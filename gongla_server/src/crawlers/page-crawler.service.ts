import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { load } from 'cheerio';
import { IngestProductDto } from '../products/dto/ingest-products.dto';
import { ProductSource } from '../products/product.types';
import { CrawlerProvider } from './crawler.types';

type JsonLd = Record<string, unknown>;

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value))
    return Math.round(value);
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function jsonLdNodes(value: unknown): JsonLd[] {
  if (Array.isArray(value)) return value.flatMap(jsonLdNodes);
  if (!value || typeof value !== 'object') return [];
  const node = value as JsonLd;
  const graph = jsonLdNodes(node['@graph']);
  return [node, ...graph];
}

function isoDate(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dateRangeFromText(content: string, now = new Date()) {
  const normalized = content.replace(/\s+/g, ' ');
  const range = normalized.match(
    /(?:(\d{4})[.년\-/]\s*)?(\d{1,2})[.월\-/]\s*(\d{1,2})일?[^\d]{0,30}(?:부터|~|～|-)[^\d]{0,30}(?:(\d{4})[.년\-/]\s*)?(\d{1,2})[.월\-/]\s*(\d{1,2})일?(?:[^\d]{0,15}(오전|오후)?\s*(\d{1,2})시(?:\s*(\d{1,2})분)?)?/,
  );
  if (!range) return undefined;
  const startYear = Number(range[1] || now.getFullYear());
  const endYear = Number(range[4] || startYear);
  let endHour = Number(range[8] || 23);
  if (range[7] === '오후' && endHour < 12) endHour += 12;
  if (range[7] === '오전' && endHour === 12) endHour = 0;
  const start = new Date(
    Date.UTC(startYear, Number(range[2]) - 1, Number(range[3]), -9),
  );
  const end = new Date(
    Date.UTC(
      endYear,
      Number(range[5]) - 1,
      Number(range[6]),
      endHour - 9,
      Number(range[9] || 59),
    ),
  );
  if (end <= start) end.setUTCFullYear(end.getUTCFullYear() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function youtubeData($: ReturnType<typeof load>) {
  for (const element of $('script').toArray()) {
    const script = $(element).html() ?? '';
    const marker = 'ytInitialPlayerResponse = ';
    const start = script.indexOf(marker);
    if (start < 0) continue;
    const raw = script.slice(start + marker.length).replace(/;\s*$/, '');
    try {
      const player = JSON.parse(raw) as {
        videoDetails?: {
          videoId?: string;
          title?: string;
          author?: string;
          shortDescription?: string;
          thumbnail?: { thumbnails?: Array<{ url?: string }> };
        };
      };
      return player.videoDetails;
    } catch {
      continue;
    }
  }
  return undefined;
}

export function parseProductPage(
  html: string,
  pageUrl: string,
  source: ProductSource,
  now = new Date(),
): IngestProductDto | null {
  const $ = load(html);
  const nodes: JsonLd[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      nodes.push(...jsonLdNodes(JSON.parse($(element).text())));
    } catch {
      // 다른 JSON-LD 블록은 계속 처리한다.
    }
  });
  const product = nodes.find((node) => {
    const type = node['@type'];
    return (
      type === 'Product' || (Array.isArray(type) && type.includes('Product'))
    );
  });
  const offerValue = product?.offers;
  const offer = (Array.isArray(offerValue) ? offerValue[0] : offerValue) as
    JsonLd | undefined;
  const youtube = source === 'youtube' ? youtubeData($) : undefined;
  const bodyText = `${youtube?.shortDescription ?? ''} ${$('body').text()}`;
  const inferredRange = dateRangeFromText(bodyText, now);
  const saleStartAt =
    isoDate(offer?.availabilityStarts) ??
    isoDate(product?.releaseDate) ??
    inferredRange?.start;
  const saleEndAt =
    isoDate(offer?.availabilityEnds) ??
    isoDate(offer?.priceValidUntil) ??
    inferredRange?.end;
  if (
    !saleStartAt ||
    !saleEndAt ||
    new Date(saleEndAt) <= new Date(saleStartAt)
  )
    return null;

  const descriptionUrls: string[] = Array.from(
    (youtube?.shortDescription ?? '').match(/https?:\/\/[^\s)]+/g) ?? [],
  );
  const purchaseUrl =
    text(offer?.url) ??
    descriptionUrls.find((url) => !url.includes('youtube.com')) ??
    pageUrl;
  const imageValue = product?.image;
  const imageUrl =
    text(Array.isArray(imageValue) ? imageValue[0] : imageValue) ??
    text($('meta[property="og:image"]').attr('content')) ??
    youtube?.thumbnail?.thumbnails?.at(-1)?.url;
  const name =
    text(product?.name) ??
    youtube?.title ??
    text($('meta[property="og:title"]').attr('content'));
  if (!name) return null;
  const salePrice = number(offer?.price ?? offer?.lowPrice);
  const originalPrice = number(product?.highPrice ?? offer?.highPrice);
  const canonical = text($('link[rel="canonical"]').attr('href')) ?? pageUrl;

  return Object.assign(new IngestProductDto(), {
    externalId:
      youtube?.videoId ??
      text(product?.sku) ??
      text(product?.productID) ??
      canonical,
    name,
    originalPrice,
    salePrice,
    source,
    sourceName:
      youtube?.author ?? text(product?.brand) ?? new URL(pageUrl).hostname,
    imageUrl,
    saleStartAt,
    saleEndAt,
    purchaseUrl: new URL(purchaseUrl, pageUrl).toString(),
    sourceUrl: pageUrl,
    rawData: { jsonLd: product ?? null, crawledFrom: pageUrl },
  });
}

@Injectable()
export class PageCrawlerFactory {
  constructor(private readonly config: ConfigService) {}

  create(name: string, source: ProductSource, envKey: string): CrawlerProvider {
    const logger = new Logger(`${name}PageCrawler`);
    return {
      name,
      crawl: async () => {
        const raw = this.config.get<string>(envKey) ?? '';
        const urls = raw
          .split(/[\n,]/)
          .map((url) => url.trim())
          .filter(Boolean);
        const items: IngestProductDto[] = [];
        for (const url of urls) {
          try {
            const response = await fetch(url, {
              headers: {
                accept: 'text/html,application/xhtml+xml',
                'user-agent': 'GonglaBot/1.0 (+https://gongla.netlify.app)',
              },
              redirect: 'follow',
              signal: AbortSignal.timeout(30_000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const item = parseProductPage(
              await response.text(),
              response.url,
              source,
            );
            if (item) items.push(item);
            else
              logger.warn(`판매기간 또는 상품정보를 찾지 못했습니다: ${url}`);
          } catch (error) {
            logger.error(
              `${url} 수집 실패: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        return items;
      },
    };
  }
}
