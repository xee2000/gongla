"use client";

import { useEffect, useState } from "react";
import type { Deal } from "../../deal";

type User = { id: string; nickname: string };

export default function ProductDetailClient({ deal }: { deal: Deal }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
      .then((response) => response.json())
      .then((data) => setUser(data.user ?? null));
  }, []);

  async function purchase() {
    if (!user) {
      sessionStorage.setItem("gongla_pending_deal_id", deal.id);
      location.href = "/api/auth/kakao";
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/clicks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: deal.id, productName: deal.name, source: deal.source, targetUrl: deal.targetUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "이동 실패");
      location.href = data.redirectUrl;
    } catch (error) {
      alert(`${error instanceof Error ? error.message : "이동 실패"}\n잠시 후 다시 시도해 주세요.`);
    } finally {
      setLoading(false);
    }
  }

  const query = encodeURIComponent(deal.name);
  const comparisons = [
    { name: "쿠팡", url: `https://www.coupang.com/np/search?q=${query}` },
    { name: "네이버쇼핑", url: `https://search.shopping.naver.com/search/all?query=${query}` },
    { name: "위메프", url: `https://front.wemakeprice.com/search?search_keyword=${query}` },
  ];

  return (
    <main className="detail-shell">
      <header className="detail-header"><a href="/">←</a><span>상품 상세</span><button onClick={() => navigator.share?.({ title: deal.name, url: location.href })}>공유</button></header>
      <div className="detail-image"><img src={deal.imageUrl} alt={deal.name} /></div>
      <section className="detail-content">
        <div className="creator-row"><span className="creator-avatar">{deal.sourceName.slice(0, 2)}</span><div><strong>{deal.sourceName}</strong><small>{deal.source} · 기간 한정 공동구매</small></div></div>
        <h1>{deal.name}</h1>
        <div className="detail-price"><strong>{formatPrice(deal.salePrice)}</strong>{deal.discount !== null && <span>{deal.discount}%↓</span>}</div>
        <p className="detail-period">판매기간 {deal.period}</p>
        <section className="compare-card">
          <h2>채널별 가격 비교</h2>
          <div className="compare-primary"><span>공동구매가</span><strong>{formatPrice(deal.salePrice)}</strong></div>
          {comparisons.map((item) => <a key={item.name} href={item.url} target="_blank" rel="noreferrer"><span>{item.name}</span><strong>동일 상품 검색 →</strong></a>)}
          <small>각 쇼핑몰 검색 결과에서 옵션·배송비를 포함한 최종 가격을 확인하세요.</small>
        </section>
      </section>
      <div className="detail-action"><button onClick={purchase} disabled={loading}>{loading ? "이동 준비 중" : "공동구매 참여하기"}</button></div>
    </main>
  );
}

function formatPrice(value: number | null) {
  return value === null ? "판매 페이지에서 확인" : `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}
