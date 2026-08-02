"use client";

import { useEffect, useMemo, useState } from "react";
import { deals, type Deal } from "./deals";

type User = { id: string; nickname: string; provider: string };

const formatPrice = (value: number | null) =>
  value === null ? "판매 페이지에서 확인" : `${new Intl.NumberFormat("ko-KR").format(value)}원`;

export default function DealsClient() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [source, setSource] = useState("전체");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setCheckingUser(false));
  }, []);

  const visibleDeals = useMemo(
    () => (source === "전체" ? deals : deals.filter((deal) => deal.source === source)),
    [source],
  );

  async function testKakaoLogin() {
    setLoggingIn(true);
    try {
      const response = await fetch("/api/auth/test-kakao", { method: "POST" });
      if (!response.ok) throw new Error("로그인에 실패했습니다.");
      const data = (await response.json()) as { user: User };
      setUser(data.user);
      setLoginPrompt(false);
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  async function moveToProduct(deal: Deal) {
    if (!user) {
      setLoginPrompt(true);
      return;
    }
    setMovingId(deal.id);
    try {
      const response = await fetch("/api/clicks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: deal.id,
          productName: deal.name,
          source: deal.source,
          targetUrl: deal.targetUrl,
        }),
      });
      if (response.status === 401) {
        setUser(null);
        setLoginPrompt(true);
        return;
      }
      if (!response.ok) throw new Error("이동 이력을 저장하지 못했습니다.");
      const data = (await response.json()) as { redirectUrl: string };
      window.location.href = data.redirectUrl;
    } catch {
      alert("잠시 후 다시 시도해 주세요.");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top">공라<span>•</span></a>
        <div className="account-area">
          {checkingUser ? (
            <span className="checking">로그인 확인 중</span>
          ) : user ? (
            <><span className="user-chip">{user.nickname}</span><button className="text-button" onClick={logout}>로그아웃</button></>
          ) : (
            <button className="kakao-small" onClick={() => setLoginPrompt(true)}>카카오 로그인</button>
          )}
        </div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">LIMITED DEALS, ONE PLACE</p>
        <h1>흩어진 공동구매를<br /><em>한눈에.</em></h1>
        <div className="hero-footer">
          <p>YouTube부터 스마트스토어까지,<br />지금 열려 있는 기간 한정 상품을 모았습니다.</p>
          <div className="stats"><strong>{deals.length}</strong><span>진행 상품</span><strong>3</strong><span>연결 출처</span></div>
        </div>
      </section>

      <nav className="source-filter" aria-label="상품 출처">
        {["전체", "YouTube", "네이버 스마트스토어", "쇼핑몰"].map((item) => (
          <button key={item} className={source === item ? "active" : ""} onClick={() => setSource(item)}>{item}</button>
        ))}
      </nav>

      <section className="catalog-section">
        <div className="catalog-heading">
          <div><span>LIVE DEAL COLLECTION</span><h2>{source === "전체" ? "오늘의 공동구매" : source}</h2></div>
          <p>{visibleDeals.length}개의 상품</p>
        </div>
        <div className="deal-grid">
          {visibleDeals.map((deal) => (
            <article className="deal-card" key={deal.id}>
              <div className="image-link">
                <img src={deal.imageUrl} alt="" loading="lazy" />
                <span className="timer-badge">기간 한정</span>
              </div>
              <div className="card-body">
                <div className="domain-row"><span>{deal.source} · {deal.sourceName}</span><span className="status-dot">진행 중</span></div>
                <h3>{deal.name}</h3>
                <div className="price-row">
                  {deal.discount !== null && <strong className="discount">{deal.discount}%</strong>}
                  <strong className="current-price">{formatPrice(deal.salePrice)}</strong>
                  {deal.originalPrice !== null && <del>{formatPrice(deal.originalPrice)}</del>}
                </div>
                <div className="period"><span>판매 기간</span><strong>{deal.period}</strong></div>
                <button className="buy-button" disabled={movingId === deal.id} onClick={() => moveToProduct(deal)}>
                  {movingId === deal.id ? "이동 준비 중" : "상품으로 이동하기"}<span>↗</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer><strong>공라</strong><p>상품 가격과 판매 기간은 연결된 판매 페이지에서 최종 확인해 주세요.</p></footer>

      {loginPrompt && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setLoginPrompt(false)}>
          <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={() => setLoginPrompt(false)}>×</button>
            <span className="login-mark">공라</span>
            <h2 id="login-title">상품을 보러 가기 전에<br />로그인이 필요해요</h2>
            <p>어떤 공동구매에 관심이 있었는지 안전하게 기록하고 더 나은 상품을 추천해 드릴게요.</p>
            <button className="kakao-login" onClick={testKakaoLogin} disabled={loggingIn}>
              <span>●</span>{loggingIn ? "테스트 로그인 중" : "카카오로 계속하기"}
            </button>
            <small>현재는 개발용 테스트 모드이며 실제 카카오 계정 정보에 접근하지 않습니다.</small>
          </section>
        </div>
      )}
    </main>
  );
}
