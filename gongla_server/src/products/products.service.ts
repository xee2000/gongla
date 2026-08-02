import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { Database, Json } from '../supabase/database.types';
import { IngestProductDto } from './dto/ingest-products.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Product, ProductUpsert, statusAt } from './product.types';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(query: QueryProductsDto) {
    let request = this.supabase.client
      .from('products')
      .select('*', { count: 'exact' })
      .order('sale_end_at', { ascending: true })
      .range(query.offset, query.offset + query.limit - 1);

    if (query.status !== 'all') request = request.eq('status', query.status);
    if (query.source) request = request.eq('source', query.source);
    if (query.search) request = request.ilike('name', `%${query.search}%`);

    const { data, error, count } = await request;
    if (error) throw error;
    return { items: data as Product[], count: count ?? 0 };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase.client
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('상품을 찾을 수 없습니다.');
    return data as Product;
  }

  async ingest(items: IngestProductDto[]) {
    const now = new Date();
    const rows: ProductUpsert[] = items.map((item) => {
      if (new Date(item.saleEndAt) <= new Date(item.saleStartAt)) {
        throw new BadRequestException(
          `${item.name}: 종료시간은 시작시간 이후여야 합니다.`,
        );
      }
      return {
        external_id: item.externalId ?? item.purchaseUrl,
        name: item.name,
        original_price: item.originalPrice ?? null,
        sale_price: item.salePrice ?? null,
        source: item.source,
        source_name: item.sourceName ?? null,
        image_url: item.imageUrl ?? null,
        sale_start_at: item.saleStartAt,
        sale_end_at: item.saleEndAt,
        purchase_url: item.purchaseUrl,
        source_url: item.sourceUrl ?? null,
        raw_data: item.rawData ?? {},
        status: statusAt(item.saleStartAt, item.saleEndAt, now),
      };
    });

    if (!rows.length) return [];
    const values: Database['public']['Tables']['products']['Insert'][] =
      rows.map((row) => ({
        ...row,
        raw_data: row.raw_data as Json,
        last_crawled_at: now.toISOString(),
      }));
    const { data, error } = await this.supabase.client
      .from('products')
      .upsert(values, { onConflict: 'source,external_id' })
      .select();
    if (error) throw error;
    return data as Product[];
  }

  async synchronizeStatuses(now = new Date()) {
    const iso = now.toISOString();
    const scheduled = await this.supabase.client
      .from('products')
      .update({ status: 'scheduled', updated_at: iso })
      .gt('sale_start_at', iso)
      .neq('status', 'scheduled');
    const active = await this.supabase.client
      .from('products')
      .update({ status: 'active', updated_at: iso })
      .lte('sale_start_at', iso)
      .gt('sale_end_at', iso)
      .neq('status', 'active');
    const ended = await this.supabase.client
      .from('products')
      .update({ status: 'ended', updated_at: iso })
      .lte('sale_end_at', iso)
      .neq('status', 'ended');

    const error = scheduled.error || active.error || ended.error;
    if (error) throw error;
    return { synchronizedAt: iso };
  }
}
