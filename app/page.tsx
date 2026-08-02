import DealsClient from "./deals-client";
import type { Deal } from "./deal";
import { supabaseRest } from "../lib/supabase-rest";

type ProductRow = {
  id: string;
  name: string;
  original_price: number | null;
  sale_price: number | null;
  source: string;
  source_name: string | null;
  image_url: string | null;
  sale_start_at: string;
  sale_end_at: string;
  purchase_url: string;
};

const sourceLabels: Record<string, Deal["source"]> = {
  youtube: "YouTube",
  naver_smartstore: "네이버 스마트스토어",
  instagram: "쇼핑몰",
  shopping_mall: "쇼핑몰",
  other: "쇼핑몰",
};

function toDeal(product: ProductRow): Deal {
  const discount = product.original_price && product.sale_price
    ? Math.round((1 - product.sale_price / product.original_price) * 100)
    : null;
  const date = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
  return {
    id: product.id,
    name: product.name,
    source: sourceLabels[product.source] ?? "쇼핑몰",
    sourceName: product.source_name ?? product.source,
    category: "공동구매",
    originalPrice: product.original_price,
    salePrice: product.sale_price,
    discount,
    imageUrl: product.image_url ?? "/placeholder-product.svg",
    targetUrl: product.purchase_url,
    period: `${date.format(new Date(product.sale_start_at))} ~ ${date.format(new Date(product.sale_end_at))}`,
  };
}

export default async function Home() {
  const query = "products?select=id,name,original_price,sale_price,source,source_name,image_url,sale_start_at,sale_end_at,purchase_url&status=eq.active&sale_start_at=lte.now()&sale_end_at=gt.now()&order=sale_end_at.asc";
  const products = await supabaseRest<ProductRow[]>(query, { next: { revalidate: 60 } });
  return <DealsClient deals={products.map(toDeal)} />;
}
