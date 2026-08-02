import { parseProductPage } from './page-crawler.service';

describe('parseProductPage', () => {
  it('JSON-LD 상품과 할인 기간을 표준 상품으로 변환한다', () => {
    const html = `
      <html><head>
        <script type="application/ld+json">
          {
            "@type": "Product",
            "sku": "swim-1",
            "name": "기간 한정 수영복",
            "image": "https://example.com/swim.jpg",
            "offers": {
              "@type": "Offer",
              "price": "40000",
              "highPrice": "50000",
              "url": "https://example.com/buy/swim",
              "availabilityStarts": "2026-08-03T00:00:00+09:00",
              "availabilityEnds": "2026-08-07T12:00:00+09:00"
            }
          }
        </script>
      </head><body></body></html>`;

    expect(
      parseProductPage(
        html,
        'https://smartstore.naver.com/store/products/1',
        'naver_smartstore',
      ),
    ).toMatchObject({
      externalId: 'swim-1',
      name: '기간 한정 수영복',
      originalPrice: 50000,
      salePrice: 40000,
      purchaseUrl: 'https://example.com/buy/swim',
      saleStartAt: '2026-08-02T15:00:00.000Z',
      saleEndAt: '2026-08-07T03:00:00.000Z',
    });
  });

  it('판매 시작과 종료 시각이 없으면 DB 저장 대상에서 제외한다', () => {
    const html = '<meta property="og:title" content="기간 없는 상품">';
    expect(
      parseProductPage(html, 'https://example.com/product/1', 'shopping_mall'),
    ).toBeNull();
  });
});
