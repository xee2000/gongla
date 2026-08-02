# 공라

YouTube, 네이버 스마트스토어, 쇼핑몰 등에 흩어진 기간 한정 공동구매를
한눈에 모아보는 서비스입니다.

## 현재 테스트 기능

- 출처별 공동구매 상품 조회
- 카카오 REST API OAuth 로그인
- CSRF 방지 state 검증과 HTTP-only 사용자 세션
- 로그인 사용자와 상품 이동 클릭 이력 Netlify 영구 저장소 보관
- 상품 클릭 이력 저장 후 외부 구매처 이동

Kakao Developers 앱의 REST API 키 설정에 운영 Redirect URI를 등록해야 합니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

## 배포 빌드

```bash
npm run build
```

`gongla_server`에는 크롤링과 Supabase 상품 저장을 담당하는 NestJS 서버가 포함되어
있습니다. 웹의 테스트 로그인과 이동 이력은 Netlify의 영구 저장소에 저장됩니다.
