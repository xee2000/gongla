import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공라 — 흩어진 공동구매를 한눈에",
  description: "YouTube, 네이버 스마트스토어 등 여러 플랫폼의 기간 한정 공동구매를 모아보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
