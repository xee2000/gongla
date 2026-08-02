import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { IngestProductDto } from '../products/dto/ingest-products.dto';
import { CrawlerProvider, CrawlerRunResult } from './crawler.types';
import { FeedCrawlerFactory } from './feed-crawler.service';
import { PageCrawlerFactory } from './page-crawler.service';

@Injectable()
export class CrawlersService {
  private readonly logger = new Logger(CrawlersService.name);
  private readonly providers: CrawlerProvider[];
  private running = false;

  constructor(
    factory: FeedCrawlerFactory,
    pageFactory: PageCrawlerFactory,
    private readonly products: ProductsService,
    private readonly config: ConfigService,
  ) {
    this.providers = [
      factory.create('youtube', 'youtube', 'YOUTUBE_CRAWLER_FEED_URL'),
      factory.create(
        'naver-smartstore',
        'naver_smartstore',
        'NAVER_SMARTSTORE_CRAWLER_FEED_URL',
      ),
      pageFactory.create('youtube-pages', 'youtube', 'YOUTUBE_CRAWLER_URLS'),
      pageFactory.create(
        'naver-smartstore-pages',
        'naver_smartstore',
        'NAVER_SMARTSTORE_CRAWLER_URLS',
      ),
      pageFactory.create(
        'shopping-mall-pages',
        'shopping_mall',
        'SHOPPING_MALL_CRAWLER_URLS',
      ),
    ];
  }

  isAuthorized(adminKey?: string) {
    const expected = this.config.get<string>('CRAWLER_ADMIN_KEY');
    return Boolean(expected && adminKey && adminKey === expected);
  }

  async runAll(): Promise<CrawlerRunResult[]> {
    if (this.running) {
      this.logger.warn('이전 크롤링이 진행 중이라 중복 실행을 건너뜁니다.');
      return [];
    }

    this.running = true;
    try {
      const results: CrawlerRunResult[] = [];
      for (const provider of this.providers) {
        try {
          const items = await provider.crawl();
          const saved = await this.products.ingest(items);
          results.push({
            provider: provider.name,
            collected: items.length,
            saved: saved.length,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`${provider.name} 수집 실패: ${message}`);
          results.push({
            provider: provider.name,
            collected: 0,
            saved: 0,
            error: message,
          });
        }
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  ingest(items: IngestProductDto[]) {
    return this.products.ingest(items);
  }
}
