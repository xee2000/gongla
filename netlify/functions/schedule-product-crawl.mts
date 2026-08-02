import type { Config } from "@netlify/functions";

export default async function handler() {
  const siteUrl = process.env.URL ?? "https://gongla.netlify.app";
  const key = process.env.CRAWLER_ADMIN_KEY;
  if (!key) throw new Error("CRAWLER_ADMIN_KEY is not configured.");
  const response = await fetch(`${siteUrl}/api/internal/crawl-products`, {
    method: "POST",
    headers: { "x-crawler-key": key },
  });
  if (!response.ok) throw new Error(`Background crawler trigger failed: HTTP ${response.status}`);
  console.log(`Background crawler accepted at ${new Date().toISOString()}`);
}

export const config: Config = {
  // Netlify cron은 UTC: 한국시간 09:00, 12:00, 19:00
  schedule: "0 0,3,10 * * *",
};
