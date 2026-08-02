import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PRODUCT_SOURCES } from '../product.types';

export class QueryProductsDto {
  @IsOptional()
  @IsIn(['scheduled', 'active', 'ended', 'all'])
  status: 'scheduled' | 'active' | 'ended' | 'all' = 'active';

  @IsOptional()
  @IsIn(PRODUCT_SOURCES)
  source?: (typeof PRODUCT_SOURCES)[number];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  offset = 0;
}
