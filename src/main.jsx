import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import mallResults from "../../active_deals_10_sites.json";
import youtubeResults from "../../youtube_product_deals.json";
import "./styles.css";

const CATEGORY_RULES = {
  옷: ["블라우스", "가디건", "팬츠", "바지", "원피스", "셔츠", "자켓", "조끼", "의류", "스커트", "티셔츠", "코트"],
  음료: ["커피", "주스", "음료", "티백", "생수", "탄산", "콜라", "차"],
  식품: ["김치", "고기", "쌀", "밥", "과일", "간식", "밀키트", "식품", "국", "찌개", "닭", "장어", "빵"],
  뷰티: ["크림", "세럼", "화장품", "샴푸", "마스크팩", "에센스", "로션", "뷰티"],
  생활: ["세제", "수납", "주방", "침구", "생활", "그릇", "청소", "냄비", "용지", "가구"],
  디지털: ["가전", "충전기", "이어폰", "노트북", "스마트폰", "전자", "컴퓨터"],
};

const categoryFor = (text = "") => {
  const value = text.toLowerCase();
  return Object.entries(CATEGORY_RULES).find(([, words]) => words.some((word) => value.includes(word)))?.[0] || "기타";
};

const formatPrice = (price) =>
  typeof price === "number" ? `${new Intl.NumberFormat("ko-KR").format(price)}원` : "링크에서 가격 확인";

const formatDate = (value, fallback = "기간 미정") => {
  if (!value) return fallback;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
};

const formatViews = (value) => {
  if (!value) return "조회수 확인 중";
  if (value >= 10000) return `조회수 ${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}만`;
  return `조회수 ${new Intl.NumberFormat("ko-KR").format(value)}`;
};

function DealCard({ deal, sourceType }) {
  const isYoutube = sourceType === "youtube";
  const price = deal.price || {};
  const original = price.original_price;
  const current = price.effective_discount_price ?? price.sale_price;
  const discount = price.calculated_discount_rate ?? price.discount_rate;
  const targetUrl = deal.product_url || deal.video_url;
  const host = new URL(targetUrl).hostname.replace(/^m\.|^www\./, "");

  return (
    <article className={`deal-card ${isYoutube ? "youtube-card" : ""}`}>
      <a className="image-link" href={isYoutube ? deal.video_url : targetUrl} target="_blank" rel="noreferrer">
        {deal.image_url ? <img src={deal.image_url} alt="" loading="lazy" /> : <div className="image-fallback"><span>BUYS</span></div>}
        <span className="timer-badge">{isYoutube ? "YouTube PICK" : deal.ending_soon ? "마감 임박" : "기간 한정"}</span>
        {isYoutube && <span className="play-mark" aria-hidden="true">▶</span>}
      </a>

      <div className="card-body">
        <div className="domain-row">
          <span>{isYoutube ? deal.channel_name : host}</span>
          <span className="status-dot">{isYoutube ? formatViews(deal.statistics?.views) : "진행 중"}</span>
        </div>
        <h3>{deal.name}</h3>
        {deal.summary && <p className="summary">{deal.summary}</p>}

        <div className="price-row">
          {discount ? <strong className="discount">{discount}%</strong> : null}
          <strong className="current-price">{formatPrice(current)}</strong>
          {original ? <del>{formatPrice(original)}</del> : null}
        </div>

        <div className="period">
          <span>{isYoutube ? "영상 게시일" : "할인 기간"}</span>
          <strong>{isYoutube ? formatDate(deal.published_at, "게시일 확인") : `${formatDate(deal.sale_start_at)} — ${formatDate(deal.sale_end_at)}`}</strong>
        </div>

        <div className="card-actions">
          <a className="buy-button" href={targetUrl} target="_blank" rel="noopener noreferrer">구매하러 가기 <span>↗</span></a>
          {isYoutube && <a className="video-button" href={deal.video_url} target="_blank" rel="noopener noreferrer">영상 보기</a>}
        </div>
      </div>
    </article>
  );
}

function App() {
  const mallDeals = useMemo(() => mallResults.flatMap((mall) =>
    (mall.items || []).map((deal) => ({ ...deal, category: categoryFor(`${deal.name} ${deal.summary || ""}`), mall: mall.platform }))), []);
  const youtubeDeals = useMemo(() => youtubeResults.map((deal) => ({ ...deal, category: deal.category || categoryFor(`${deal.name} ${deal.summary || ""}`) })), []);
  const [tab, setTab] = useState("mall");
  const [category, setCategory] = useState("전체");
  const deals = tab === "mall" ? mallDeals : youtubeDeals;
  const categories = ["전체", ...new Set(deals.map((deal) => deal.category))];
  const visibleDeals = category === "전체" ? deals : deals.filter((deal) => deal.category === category);

  const changeTab = (nextTab) => { setTab(nextTab); setCategory("전체"); };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top">BUYS<span>•</span></a>
        <div className="header-note">검증된 기간 한정 할인과 크리에이터 추천 상품</div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">LIVE DEAL COLLECTION</p>
        <h1>발견부터 구매까지,<br /><em>지금이 타이밍.</em></h1>
        <div className="hero-footer">
          <p>쇼핑몰 타임세일과 YouTube 상품 홍보를 모아<br />상품 종류별로 빠르게 둘러보세요.</p>
          <div className="stats"><strong>{mallDeals.length}</strong><span>쇼핑몰 딜</span><strong>{youtubeDeals.length}</strong><span>YouTube 상품</span></div>
        </div>
      </section>

      <nav className="source-tabs" aria-label="상품 출처">
        <button className={tab === "mall" ? "active" : ""} onClick={() => changeTab("mall")}><small>01</small> 일반 쇼핑몰 <span>{mallDeals.length}</span></button>
        <button className={tab === "youtube" ? "active" : ""} onClick={() => changeTab("youtube")}><small>02</small> YouTube 상품 <span>{youtubeDeals.length}</span></button>
      </nav>

      <nav className="mall-filter category-filter" aria-label="상품 종류">
        {categories.map((name) => <button key={name} className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>)}
      </nav>

      <section className="catalog-section">
        <div className="catalog-heading">
          <div><span>{tab === "mall" ? "CURATED MALL DEALS" : "CREATOR COMMERCE"}</span><h2>{category === "전체" ? (tab === "mall" ? "일반 쇼핑몰" : "YouTube 상품") : category}</h2></div>
          <p>{visibleDeals.length}개의 상품</p>
        </div>
        <div className="deal-grid">
          {visibleDeals.map((deal, index) => <DealCard key={`${deal.product_url}-${index}`} deal={deal} sourceType={tab} />)}
        </div>
        {!visibleDeals.length && <div className="empty-state">이 분류에서 현재 확인된 상품이 없습니다.</div>}
      </section>

      <footer><strong>BUYS</strong><p>YouTube 상품 가격·판매 기간은 연결된 판매 페이지에서 최종 확인해 주세요.</p></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
