import { boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** The shop itself: a single row (id = 1). Another shop = another deployment with its own database. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("YOUBA SERVICE"),
  currency: text("currency").notNull().default("XOF"),
  timezone: text("timezone").notNull().default("Africa/Lome"),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Fixed-window counters for brute-force protection on the login form. */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/**
 * A product (or activity) followed separately: the money put in at the start and, if the
 * accounts were kept by hand before, the profit already made at a given date.
 */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  investment: money("investment").notNull().default(0),
  openingDate: date("opening_date"),
  openingProfit: money("opening_profit").notNull().default(0),
  archived: boolean("archived").notNull().default(false),
  createdAt: createdAt(),
});

/** What came in and went out for one product on one day. */
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    revenue: money("revenue").notNull().default(0),
    expense: money("expense").notNull().default(0),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entries_product_date_idx").on(t.productId, t.date), index("entries_date_idx").on(t.date)],
);

/** Money taken from the overall profit, not tied to one product: rent, electricity, money for home… */
export const generalExpenses = pgTable(
  "general_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: date("date").notNull(),
    amount: money("amount").notNull(),
    label: text("label").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("general_expenses_date_idx").on(t.date)],
);

export type Settings = typeof settings.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type GeneralExpense = typeof generalExpenses.$inferSelect;
