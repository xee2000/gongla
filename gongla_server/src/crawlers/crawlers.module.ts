import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CrawlersController } from './crawlers.controller';
import { CrawlersScheduler } from './crawlers.scheduler';
import { CrawlersService } from './crawlers.service';
import { FeedCrawlerFactory } from './feed-crawler.service';

@Module({
  imports: [ProductsModule],
  controllers: [CrawlersController],
  providers: [FeedCrawlerFactory, CrawlersService, CrawlersScheduler],
})
export class CrawlersModule {}
