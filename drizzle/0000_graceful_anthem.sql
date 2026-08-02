CREATE TABLE `product_clicks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`source` text NOT NULL,
	`target_url` text NOT NULL,
	`clicked_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_product_clicks_user_time` ON `product_clicks` (`user_id`,`clicked_at`);--> statement-breakpoint
CREATE INDEX `idx_product_clicks_product_time` ON `product_clicks` (`product_id`,`clicked_at`);--> statement-breakpoint
CREATE TABLE `user_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_user_sessions_user_id` ON `user_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`nickname` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_login_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_provider_identity` ON `users` (`provider`,`provider_user_id`);