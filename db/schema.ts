import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const founders = sqliteTable("founders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  background: text("background").notNull(),
  personalCash: integer("personal_cash").notNull().default(2000),
  reputation: integer("reputation").notNull().default(0),
  network: integer("network").notNull().default(0),
}, (table) => [index("founders_user_idx").on(table.userId)]);

export const founderSkills = sqliteTable("founder_skills", {
  id: text("id").primaryKey(),
  founderId: text("founder_id").notNull().references(() => founders.id),
  skill: text("skill").notNull(),
  level: integer("level").notNull().default(0),
}, (table) => [index("founder_skills_founder_idx").on(table.founderId)]);

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  founderId: text("founder_id").notNull().references(() => founders.id),
  name: text("name").notNull(),
  legalType: text("legal_type").notNull(),
  industry: text("industry").notNull(),
  status: text("status").notNull().default("active"),
  formedWeek: integer("formed_week").notNull(),
}, (table) => [index("companies_founder_idx").on(table.founderId)]);

export const companyOwnership = sqliteTable("company_ownership", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  founderId: text("founder_id").notNull().references(() => founders.id),
  basisPoints: integer("basis_points").notNull().default(10000),
}, (table) => [index("ownership_company_idx").on(table.companyId)]);

export const companyLocations = sqliteTable("company_locations", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  officeTier: text("office_tier").notNull(),
  capacity: integer("capacity").notNull(),
  weeklyRent: integer("weekly_rent").notNull(),
}, (table) => [index("locations_company_idx").on(table.companyId)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  progress: integer("progress").notNull().default(0),
  quality: integer("quality").notNull().default(35),
  weeklyPrice: integer("weekly_price").notNull().default(149),
  launched: integer("launched", { mode: "boolean" }).notNull().default(false),
}, (table) => [index("products_company_idx").on(table.companyId)]);

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  segment: text("segment").notNull(),
  seats: integer("seats").notNull().default(1),
  status: text("status").notNull().default("active"),
  startedWeek: integer("started_week").notNull(),
}, (table) => [index("customers_company_idx").on(table.companyId)]);

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  skill: integer("skill").notNull(),
  morale: integer("morale").notNull(),
  weeklySalary: integer("weekly_salary").notNull(),
  hiredWeek: integer("hired_week").notNull(),
}, (table) => [index("employees_company_idx").on(table.companyId)]);

export const bankAccounts = sqliteTable("bank_accounts", {
  id: text("id").primaryKey(),
  companyId: text("company_id").references(() => companies.id),
  founderId: text("founder_id").references(() => founders.id),
  balance: integer("balance").notNull(),
  kind: text("kind").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  bankAccountId: text("bank_account_id").notNull().references(() => bankAccounts.id),
  gameWeek: integer("game_week").notNull(),
  label: text("label").notNull(),
  amount: integer("amount").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
}, (table) => [index("transactions_account_idx").on(table.bankAccountId)]);

export const weeklySnapshots = sqliteTable("weekly_snapshots", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  gameWeek: integer("game_week").notNull(),
  cash: integer("cash").notNull(),
  revenue: integer("revenue").notNull(),
  expenses: integer("expenses").notNull(),
  customers: integer("customers").notNull(),
  morale: integer("morale").notNull(),
  valuation: integer("valuation").notNull(),
}, (table) => [index("snapshots_company_week_idx").on(table.companyId, table.gameWeek)]);

export const companyHistory = sqliteTable("company_history", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  gameWeek: integer("game_week").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull(),
}, (table) => [index("history_company_week_idx").on(table.companyId, table.gameWeek)]);

export const gameSaves = sqliteTable("game_saves", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  stateJson: text("state_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [index("game_saves_user_idx").on(table.userId)]);

export const markets = sqliteTable("markets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  demandIndex: real("demand_index").notNull().default(1),
  competitionIndex: real("competition_index").notNull().default(1),
});

export const companyEvents = sqliteTable("company_events", {
  id: text("id").primaryKey(),
  companyId: text("company_id").notNull().references(() => companies.id),
  gameWeek: integer("game_week").notNull(),
  type: text("type").notNull(),
  payloadJson: text("payload_json").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
}, (table) => [index("events_company_idx").on(table.companyId)]);
