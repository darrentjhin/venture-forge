CREATE TABLE `bank_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text,
	`founder_id` text,
	`balance` integer NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`founder_id`) REFERENCES `founders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`founder_id` text NOT NULL,
	`name` text NOT NULL,
	`legal_type` text NOT NULL,
	`industry` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`formed_week` integer NOT NULL,
	FOREIGN KEY (`founder_id`) REFERENCES `founders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `companies_founder_idx` ON `companies` (`founder_id`);--> statement-breakpoint
CREATE TABLE `company_events` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`game_week` integer NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_company_idx` ON `company_events` (`company_id`);--> statement-breakpoint
CREATE TABLE `company_history` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`game_week` integer NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`detail` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `history_company_week_idx` ON `company_history` (`company_id`,`game_week`);--> statement-breakpoint
CREATE TABLE `company_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`office_tier` text NOT NULL,
	`capacity` integer NOT NULL,
	`weekly_rent` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `locations_company_idx` ON `company_locations` (`company_id`);--> statement-breakpoint
CREATE TABLE `company_ownership` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`founder_id` text NOT NULL,
	`basis_points` integer DEFAULT 10000 NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`founder_id`) REFERENCES `founders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ownership_company_idx` ON `company_ownership` (`company_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`segment` text NOT NULL,
	`seats` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_week` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `customers_company_idx` ON `customers` (`company_id`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`skill` integer NOT NULL,
	`morale` integer NOT NULL,
	`weekly_salary` integer NOT NULL,
	`hired_week` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `employees_company_idx` ON `employees` (`company_id`);--> statement-breakpoint
CREATE TABLE `founder_skills` (
	`id` text PRIMARY KEY NOT NULL,
	`founder_id` text NOT NULL,
	`skill` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`founder_id`) REFERENCES `founders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `founder_skills_founder_idx` ON `founder_skills` (`founder_id`);--> statement-breakpoint
CREATE TABLE `founders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`background` text NOT NULL,
	`personal_cash` integer DEFAULT 2000 NOT NULL,
	`reputation` integer DEFAULT 0 NOT NULL,
	`network` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `founders_user_idx` ON `founders` (`user_id`);--> statement-breakpoint
CREATE TABLE `game_saves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `game_saves_user_idx` ON `game_saves` (`user_id`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`demand_index` real DEFAULT 1 NOT NULL,
	`competition_index` real DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`quality` integer DEFAULT 35 NOT NULL,
	`weekly_price` integer DEFAULT 149 NOT NULL,
	`launched` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_company_idx` ON `products` (`company_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_account_id` text NOT NULL,
	`game_week` integer NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`idempotency_key` text NOT NULL,
	FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_idempotency_key_unique` ON `transactions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `transactions_account_idx` ON `transactions` (`bank_account_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `weekly_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`game_week` integer NOT NULL,
	`cash` integer NOT NULL,
	`revenue` integer NOT NULL,
	`expenses` integer NOT NULL,
	`customers` integer NOT NULL,
	`morale` integer NOT NULL,
	`valuation` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `snapshots_company_week_idx` ON `weekly_snapshots` (`company_id`,`game_week`);