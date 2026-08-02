# gongla_server

YouTube, 네이버 스마트스토어 등 여러 플랫폼의 기간 한정 공동구매 상품을
표준화하여 Supabase에 저장하고 제공하는 NestJS 서버입니다.

## 구현 기능

- 상품명, 정가, 할인가, 출처, 이미지, 판매 시작/종료 시각, 구매 링크 저장
- 한국시간 기준 매일 09:00, 12:00, 19:00 수집 실행
- 매분 판매 시작/종료 시각을 확인해 `scheduled`, `active`, `ended` 상태 갱신
- 출처와 외부 상품 ID 기준 중복 상품 갱신
- 판매 중인 상품 목록/상세 API
- YouTube, 네이버 스마트스토어, 일반 쇼핑몰 공개 페이지 직접 수집
- JSON-LD, Open Graph, YouTube 게시물 설명에서 상품 정보와 판매기간 추출
- 플랫폼별 수집기를 연결할 수 있는 표준 JSON 피드 어댑터
- 수동 수집 실행 및 수집 결과 입력 API
- Swagger API 문서

## 시작하기

```bash
npm install
npm run start:dev
```

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/docs`
- 상품 목록: `GET http://localhost:3000/api/products`

## Supabase 설정

Supabase SQL Editor에서 다음 파일을 실행합니다.

```text
supabase/migrations/001_create_products.sql
```

`.env.example`을 참고해 `.env`를 설정합니다. 현재 초기 운영 설정에서는 Publishable
키만으로 상품 조회, 크롤링 결과 저장, 상태 변경을 모두 수행합니다. 마이그레이션은
익명 역할에 상품의 `select`, `insert`, `update` 권한을 부여하며 삭제 권한은 허용하지
않습니다.

Publishable 키는 원래 공개 가능한 값이므로 이 구성에서는 외부 사용자가 상품 데이터를
삽입하거나 수정할 가능성이 있습니다. 운영 안정화 이후에는
`SUPABASE_SERVICE_ROLE_KEY`를 서버에만 설정하고 익명 쓰기 정책을 제거하는 것을
권장합니다.

## 크롤링 시간

`Asia/Seoul` 기준으로 다음 시간에 실행됩니다.

```text
09:00
12:00
19:00
```

상품 상태 동기화는 매분 0초에 실행됩니다. 종료 시각이 12:00이면 12:00부터
`ended`가 되어 공개 상품 조회에서 제외됩니다.

## 직접 크롤링 대상 설정

공개 상품 페이지나 기간 한정 홍보 게시물 URL을 쉼표로 구분해 설정합니다.

```text
YOUTUBE_CRAWLER_URLS=https://www.youtube.com/watch?v=영상ID
NAVER_SMARTSTORE_CRAWLER_URLS=https://smartstore.naver.com/상점/products/상품ID
SHOPPING_MALL_CRAWLER_URLS=https://shop.example.com/products/상품ID
```

여러 URL을 등록할 때는 쉼표 또는 줄바꿈으로 구분합니다. 서버는 JSON-LD 상품 정보,
Open Graph 메타데이터, YouTube 영상 설명을 순서대로 확인합니다. 상품명, 구매 링크와
판매 시작/종료 시각을 확인할 수 있는 항목만 `products` 테이블에 저장합니다. 판매기간을
판별할 수 없는 일반 게시물은 공개 상품으로 잘못 노출되지 않도록 제외합니다.

페이지의 robots.txt, 플랫폼 이용약관과 접근 제한을 준수해야 합니다. 로그인이 필요하거나
자동 접근을 차단한 페이지는 공식 API 또는 아래 표준 피드 방식으로 연결하는 것이 안전합니다.

## 표준 피드 수집기 연결

공식 API나 별도 플랫폼 수집기가 있다면 표준 JSON 피드 URL을 환경변수로 연결할 수
있습니다.

```text
YOUTUBE_CRAWLER_FEED_URL=https://crawler.example.com/youtube/items
NAVER_SMARTSTORE_CRAWLER_FEED_URL=https://crawler.example.com/naver/items
```

피드는 배열 또는 `{ "items": [...] }` 형식을 반환해야 합니다.

```json
{
  "items": [
    {
      "externalId": "platform-product-123",
      "name": "기간 한정 수영복",
      "originalPrice": 50000,
      "salePrice": 40000,
      "sourceName": "판매 채널명",
      "imageUrl": "https://example.com/swimsuit.jpg",
      "saleStartAt": "2026-08-03T00:00:00+09:00",
      "saleEndAt": "2026-08-07T12:00:00+09:00",
      "purchaseUrl": "https://example.com/products/123",
      "sourceUrl": "https://youtube.com/watch?v=example"
    }
  ]
}
```

서버가 수집원에 맞춰 `source` 값을 강제로 지정하므로 피드가 출처를 조작할 수 없습니다.

## 관리 API

다음 요청에는 `.env`의 `CRAWLER_ADMIN_KEY` 값을 `x-crawler-key` 헤더로 전달합니다.

```text
POST /api/crawler/run
POST /api/crawler/ingest
```

`/ingest`는 플랫폼 전용 수집기가 데이터를 직접 전달할 때 사용합니다.

## 공개 상품 API

```text
GET /api/products?status=active&source=youtube&search=수영복&limit=30&offset=0
GET /api/products/:id
```

`status`는 `scheduled`, `active`, `ended`, `all` 중 하나입니다. 공개용 Publishable 키에는
DB 정책상 현재 판매 중인 상품만 직접 조회할 수 있습니다. 관리자용 전체 상태 조회는
NestJS 서버에서 별도 인증을 추가한 뒤 제공하는 것을 권장합니다.
