"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Deal } from "./deal";

type User = { id: string; nickname: string; provider: string };
const PENDING_DEAL_KEY = "gongla_pending_deal_id";

const formatPrice = (value: number | null) =>
  value === null ? "판매 페이지에서 확인" : `${new Intl.NumberFormat("ko-KR").format(value)}원`;

export default function DealsClient({ deals }: { deals: Deal[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [loginPrompt, setLoginPrompt] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [source, setSource] = useState("전체");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .finally(() => setCheckingUser(false));

    const url = new URL(window.location.href);
    if (url.searchParams.has("login_error")) {
      setLoginError(true);
      url.searchParams.delete("login_error");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    if (checkingUser || !user) return;
    const pendingDealId = window.sessionStorage.getItem(PENDING_DEAL_KEY);
    if (!pendingDealId) return;
    window.sessionStorage.removeItem(PENDING_DEAL_KEY);
    const pendingDeal = deals.find((deal) => deal.id === pendingDealId);
    if (pendingDeal) void recordClickAndMove(pendingDeal);
  }, [checkingUser, user]);

  const visibleDeals = useMemo(
    () => (source === "전체" ? deals : deals.filter((deal) => deal.source === source)),
    [source],
  );

  function kakaoLogin() {
    window.location.href = "/api/auth/kakao";
  }

  function closeLoginPrompt() {
    window.sessionStorage.removeItem(PENDING_DEAL_KEY);
    setLoginPrompt(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }

  async function recordClickAndMove(deal: Deal) {
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
        window.sessionStorage.setItem(PENDING_DEAL_KEY, deal.id);
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

  async function moveToProduct(deal: Deal) {
    if (!user) {
      window.sessionStorage.setItem(PENDING_DEAL_KEY, deal.id);
      setLoginPrompt(true);
      return;
    }
    await recordClickAndMove(deal);
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
      {loginError && (
        <div className="login-error" role="alert">
          카카오 로그인을 완료하지 못했습니다. 카카오 앱 설정과 Redirect URI를 확인해 주세요.
          <button onClick={() => setLoginError(false)}>닫기</button>
        </div>
      )}

      <section className="hero" id="top">
        <div><span className="live-pill">LIVE DEALS</span><h1>지금 뜨는<br /><em>공동구매</em></h1></div>
        <p>유튜브 광고에서 발견한 기간 한정 상품을 한눈에 비교하세요.</p>
      </section>

      <nav className="source-filter" aria-label="상품 출처">
        {["전체", "YouTube", "네이버 스마트스토어", "쇼핑몰"].map((item) => (
          <button key={item} className={source === item ? "active" : ""} onClick={() => setSource(item)}>{item}</button>
        ))}
      </nav>

      <section className="catalog-section">
        <div className="catalog-heading">
          <div><span>LIVE DEAL COLLECTION</span><h2>{source === "전체" ? "지금 뜨는 공구" : source}</h2></div>
          <p>{visibleDeals.length}개의 상품</p>
        </div>
        <div className="deal-grid">
          {visibleDeals.map((deal) => (
            <Link className="deal-card" key={deal.id} href={`/products/${deal.id}`}>
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
                <div className="buy-button">가격 비교하고 참여하기<span>→</span></div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer><strong>공라</strong><p>상품 가격과 판매 기간은 연결된 판매 페이지에서 최종 확인해 주세요.</p></footer>

      {loginPrompt && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeLoginPrompt}>
          <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="닫기" onClick={closeLoginPrompt}>×</button>
            <span className="login-mark">공라</span>
            <h2 id="login-title">상품을 보러 가기 전에<br />로그인이 필요해요</h2>
            <p>어떤 공동구매에 관심이 있었는지 안전하게 기록하고 더 나은 상품을 추천해 드릴게요.</p>
            <button className="kakao-login" onClick={kakaoLogin}>
              <span>●</span>카카오로 계속하기
            </button>
            <small>카카오 로그인 후 상품 선택 이력이 공라 계정에 저장됩니다.</small>
          </section>
        </div>
      )}
    </main>
  );
}
