import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IngestProductDto } from '../products/dto/ingest-products.dto';
import { ProductSource } from '../products/product.types';
import { CrawlerProvider } from './crawler.types';

/**
 * 플랫폼별 수집기가 만든 표준 JSON 피드를 읽습니다.
 * YouTube/네이버 페이지 구조와 인증 방식은 서로 다르므로 URL별 파서는
 * 각 플랫폼 전용 수집기에 두고, 이 서버는 동일한 상품 형식으로 저장합니다.
 */
@Injectable()
export class FeedCrawlerFactory {
  constructor(private readonly config: ConfigService) {}

  create(name: string, source: ProductSource, envKey: string): CrawlerProvider {
    const logger = new Logger(`${name}Crawler`);
    return {
      name,
      crawl: async () => {
        const url = this.config.get<string>(envKey);
        if (!url) {
          logger.debug(`${envKey}가 없어 이번 수집을 건너뜁니다.`);
          return [];
        }

        const response = await fetch(url, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) {
          throw new Error(`${name} 피드 요청 실패: HTTP ${response.status}`);
        }
        const payload = (await response.json()) as unknown;
        const rawItems = Array.isArray(payload)
          ? payload
          : (payload as { items?: unknown[] })?.items;
        if (!Array.isArray(rawItems)) {
          throw new Error(`${name} 피드는 items 배열이어야 합니다.`);
        }

        const items: IngestProductDto[] = [];
        for (const raw of rawItems) {
          const item = plainToInstance(IngestProductDto, {
            ...(raw as object),
            source,
          });
          const errors = await validate(item, { whitelist: true });
          if (errors.length) {
            logger.warn(
              `유효하지 않은 상품을 제외했습니다: ${item.name ?? '-'}`,
            );
            continue;
          }
          items.push(item);
        }
        return items;
      },
    };
  }
}
