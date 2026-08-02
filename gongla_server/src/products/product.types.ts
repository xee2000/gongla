export const PRODUCT_SOURCES = [
  'youtube',
  'naver_smartstore',
  'instagram',
  'shopping_mall',
  'other',
] as const;

export type ProductSource = (typeof PRODUCT_SOURCES)[number];
export type ProductStatus = 'scheduled' | 'active' | 'ended';

export interface Product {
  id: string;
  external_id: string;
  name: string;
  original_price: number | null;
  sale_price: number | null;
  source: ProductSource;
  source_name: string | null;
  image_url: string | null;
  sale_start_at: string;
  sale_end_at: string;
  purchase_url: string;
  source_url: string | null;
  status: ProductStatus;
  raw_data: Record<string, unknown>;
  last_crawled_at: string;
  created_at: string;
  updated_at: string;
}

export type ProductUpsert = Omit<
  Product,
  'id' | 'created_at' | 'updated_at' | 'status' | 'last_crawled_at'
> & {
  status?: ProductStatus;
};

export function statusAt(
  startAt: string,
  endAt: string,
  now = new Date(),
): ProductStatus {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const current = now.getTime();
  if (current < start) return 'scheduled';
  if (current >= end) return 'ended';
  return 'active';
}
