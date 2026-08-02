import { IngestProductDto } from '../products/dto/ingest-products.dto';

export interface CrawlerProvider {
  readonly name: string;
  crawl(): Promise<IngestProductDto[]>;
}

export interface CrawlerRunResult {
  provider: string;
  collected: number;
  saved: number;
  error?: string;
}
