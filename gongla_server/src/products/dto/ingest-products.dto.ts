import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_SOURCES } from '../product.types';
import type { ProductSource } from '../product.types';

export class IngestProductDto {
  @IsOptional()
  @IsString()
  externalId?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  salePrice?: number;

  @IsIn(PRODUCT_SOURCES)
  source!: ProductSource;

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  imageUrl?: string;

  @IsISO8601()
  saleStartAt!: string;

  @IsISO8601()
  saleEndAt!: string;

  @IsUrl({ require_tld: false })
  purchaseUrl!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  sourceUrl?: string;

  @IsOptional()
  @IsObject()
  rawData?: Record<string, unknown>;
}

export class IngestProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IngestProductDto)
  items!: IngestProductDto[];
}
