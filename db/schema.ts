import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    nickname: text("nickname").notNull(),
    createdAt: integer("created_at").notNull(),
    lastLoginAt: integer("last_login_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_provider_identity").on(
      table.provider,
      table.providerUserId,
    ),
  ],
);

export const userSessions = sqliteTable(
  "user_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_user_sessions_user_id").on(table.userId)],
);

export const productClicks = sqliteTable(
  "product_clicks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    source: text("source").notNull(),
    targetUrl: text("target_url").notNull(),
    clickedAt: integer("clicked_at").notNull(),
  },
  (table) => [
    index("idx_product_clicks_user_time").on(table.userId, table.clickedAt),
    index("idx_product_clicks_product_time").on(table.productId, table.clickedAt),
  ],
);
