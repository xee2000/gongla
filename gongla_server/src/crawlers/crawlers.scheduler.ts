import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service';
import { CrawlersService } from './crawlers.service';

@Injectable()
export class CrawlersScheduler {
  private readonly logger = new Logger(CrawlersScheduler.name);

  constructor(
    private readonly crawlers: CrawlersService,
    private readonly products: ProductsService,
  ) {}

  // 한국시간 기준 매일 오전 9시, 낮 12시, 저녁 7시
  @Cron('0 0 9,12,19 * * *', { timeZone: 'Asia/Seoul' })
  async collectProducts() {
    this.logger.log('정기 상품 수집을 시작합니다.');
    const results = await this.crawlers.runAll();
    this.logger.log(`정기 상품 수집 완료: ${JSON.stringify(results)}`);
  }

  // 시작/종료 시각을 분 단위로 반영
  @Cron('0 * * * * *', { timeZone: 'Asia/Seoul' })
  async synchronizeProductStatuses() {
    try {
      await this.products.synchronizeStatuses();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`상품 상태 동기화 실패: ${message}`);
    }
  }
}
