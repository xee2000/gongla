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

export const deals: Deal[] = [
  {
    id: "youtube-amt-cookware",
    name: "AMT 가격 인상 전 마지막 최대 할인 공동구매",
    source: "YouTube",
    sourceName: "류니키친 Ryuniii Kitchen",
    category: "주방",
    originalPrice: null,
    salePrice: null,
    discount: 10,
    imageUrl: "https://i.ytimg.com/vi/kybrVg4hFh0/hqdefault.jpg",
    targetUrl: "https://mkt.shopping.naver.com/link/69c11dd801294e674010066b",
    period: "기간 한정 · 판매 페이지에서 확인",
  },
  {
    id: "youtube-mealkit-live",
    name: "냉동실 꽉 채우는 인기 밀키트 오늘만 특가",
    source: "YouTube",
    sourceName: "언니의 만물상",
    category: "식품",
    originalPrice: null,
    salePrice: null,
    discount: null,
    imageUrl: "https://i.ytimg.com/vi/oUFnquFSsOE/maxresdefault.jpg",
    targetUrl: "https://qr-api.stayorder.kr/s/live",
    period: "오늘만 특가 · 판매 페이지에서 확인",
  },
  {
    id: "youtube-knife-set",
    name: "쿠자 부엌칼 공동구매 세트 할인",
    source: "YouTube",
    sourceName: "집밥 종갓집 며느리",
    category: "주방",
    originalPrice: 1255000,
    salePrice: 19900,
    discount: 72,
    imageUrl: "https://i.ytimg.com/vi/JRbMeo54YbU/maxresdefault.jpg",
    targetUrl: "https://srok.kr/ghQ9e",
    period: "기간 한정 · 판매 페이지에서 확인",
  },
  {
    id: "youtube-octopus-mealkit",
    name: "홍익상회 역전쭈꾸미 한정수량 공동구매",
    source: "YouTube",
    sourceName: "라구스",
    category: "식품",
    originalPrice: 44700,
    salePrice: null,
    discount: null,
    imageUrl: "https://i.ytimg.com/vi/3a-PfN5UdlY/hqdefault.jpg",
    targetUrl: "https://enrich09.com/product/1775236824/BSLOSJWX",
    period: "한정수량 · 판매 페이지에서 확인",
  },
  {
    id: "mall-summer-cardigan",
    name: "썸머 데일리 가디건 타임세일",
    source: "쇼핑몰",
    sourceName: "쉬즈마담",
    category: "패션",
    originalPrice: 19800,
    salePrice: 17900,
    discount: 10,
    imageUrl: "https://m.shesmadam.co.kr/web/product/tiny/202307/e488842c7a419c14b435ff1cd5122a3b.gif",
    targetUrl: "https://m.shesmadam.co.kr/product/j3412-썸머-데일리-가디건시원하고-자외선차단에-좋은13년간-판매해온가디건/10696/category/1/display/9/",
    period: "타임세일 · 판매 페이지에서 확인",
  },
  {
    id: "mall-pleats-pants",
    name: "아도 사선 플리츠 배기팬츠 타임세일",
    source: "쇼핑몰",
    sourceName: "쉬즈마담",
    category: "패션",
    originalPrice: 34900,
    salePrice: 24900,
    discount: 29,
    imageUrl: "https://m.shesmadam.co.kr/web/product/tiny/202605/87873bd6f40248ae1634ee989de500b2.webp",
    targetUrl: "https://m.shesmadam.co.kr/product/p92036아도-사선플리츠-배기팬츠-컬러추가/22075/category/1/display/9/",
    period: "타임세일 · 판매 페이지에서 확인",
  },
];
