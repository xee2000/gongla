export type Deal = {
  id: string;
  name: string;
  source: "YouTube" | "네이버 스마트스토어" | "쇼핑몰";
  sourceName: string;
  category: string;
  originalPrice: number | null;
  salePrice: number | null;
  discount: number | null;
  imageUrl: string;
  targetUrl: string;
  period: string;
};
