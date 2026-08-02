import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IngestProductsDto } from '../products/dto/ingest-products.dto';
import { CrawlersService } from './crawlers.service';

@ApiTags('crawler')
@Controller('crawler')
export class CrawlersController {
  constructor(private readonly crawlers: CrawlersService) {}

  @Post('run')
  run(@Headers('x-crawler-key') key?: string) {
    this.assertAuthorized(key);
    return this.crawlers.runAll();
  }

  @Post('ingest')
  ingest(
    @Headers('x-crawler-key') key: string | undefined,
    @Body() body: IngestProductsDto,
  ) {
    this.assertAuthorized(key);
    return this.crawlers.ingest(body.items);
  }

  private assertAuthorized(key?: string) {
    if (!this.crawlers.isAuthorized(key)) {
      throw new ForbiddenException('유효한 크롤러 관리 키가 필요합니다.');
    }
  }
}
