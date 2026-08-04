import { notFound } from "next/navigation";
import type { Deal } from "../../deal";
import { supabaseRest } from "../../../lib/supabase-rest";
import ProductDetailClient from "./product-detail-client";

type Product = { id: string; name: string; original_price: number | null; sale_price: number | null; source: string; source_name: string | null; image_url: string | null; sale_start_at: string; sale_end_at: string; purchase_url: string };

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await supabaseRest<Product[]>(`products?select=*&id=eq.${encodeURIComponent(id)}&limit=1`, { cache: "no-store" });
  const product = rows[0];
  if (!product) notFound();
  const labels: Record<string, Deal["source"]> = { youtube: "YouTube", naver_smartstore: "네이버 스마트스토어", shopping_mall: "쇼핑몰", instagram: "쇼핑몰", other: "쇼핑몰" };
  const format = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Seoul" });
  const discount = product.original_price && product.sale_price ? Math.round((1 - product.sale_price / product.original_price) * 100) : null;
  const deal: Deal = { id: product.id, name: product.name, source: labels[product.source] ?? "쇼핑몰", sourceName: product.source_name ?? product.source, category: "공동구매", originalPrice: product.original_price, salePrice: product.sale_price, discount, imageUrl: product.image_url ?? "/placeholder-product.svg", targetUrl: product.purchase_url, period: `${format.format(new Date(product.sale_start_at))} ~ ${format.format(new Date(product.sale_end_at))}` };
  return <ProductDetailClient deal={deal} />;
}
