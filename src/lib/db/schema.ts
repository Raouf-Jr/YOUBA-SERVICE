import {
  boolean,
  date,
  index,
  integer,
  uniqueIndex,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const money = (name: string) =>
  numeric(name, { precision: 14, scale: 2, mode: "number" });
const qty = (name: string) =>
  numeric(name, { precision: 12, scale: 3, mode: "number" });
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const shops = pgTable("shops", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("XOF"),
  timezone: text("timezone").notNull().default("Africa/Abidjan"),
  monthlyGoal: money("monthly_goal"),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["owner", "staff"] })
      .notNull()
      .default("owner"),
    createdAt: createdAt(),
  },
  (t) => [index("users_shop_idx").on(t.shopId)],
);

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

/** One-time links sent by e-mail; only the SHA-256 of the token is stored. */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("password_reset_tokens_user_idx").on(t.userId)],
);

/** Fixed-window counters for brute-force protection (login, sign-up, reset e-mails…). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category"),
    salePrice: money("sale_price").notNull(),
    costPrice: money("cost_price"),
    unit: text("unit").notNull().default("pièce"),
    trackStock: boolean("track_stock").notNull().default(false),
    stock: qty("stock").notNull().default(0),
    lowStockThreshold: qty("low_stock_threshold"),
    archived: boolean("archived").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("products_shop_idx").on(t.shopId)],
);

export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    // Copies taken at sale time so history survives price changes and deletions.
    productName: text("product_name").notNull(),
    date: date("date").notNull(),
    quantity: qty("quantity").notNull(),
    unitPrice: money("unit_price").notNull(),
    unitCost: money("unit_cost"),
    total: money("total").notNull(),
    paymentMethod: text("payment_method").notNull().default("especes"),
    // Chosen by the device for each checkout: re-sending it (offline sync, lost reply) changes nothing.
    checkoutId: uuid("checkout_id"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("sales_shop_date_idx").on(t.shopId, t.date),
    index("sales_product_idx").on(t.productId),
    uniqueIndex("sales_checkout_product_idx").on(t.checkoutId, t.productId),
  ],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    category: text("category").notNull(),
    amount: money("amount").notNull(),
    description: text("description"),
    // Same idea as sales.checkoutId, for expenses typed offline.
    clientRef: uuid("client_ref"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index("expenses_shop_date_idx").on(t.shopId, t.date),
    uniqueIndex("expenses_shop_client_ref_idx").on(t.shopId, t.clientRef),
  ],
);

export const investments = pgTable(
  "investments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    label: text("label").notNull(),
    category: text("category").notNull(),
    amount: money("amount").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("investments_shop_date_idx").on(t.shopId, t.date)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shopId: uuid("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: text("type", { enum: ["restock", "adjustment"] }).notNull(),
    // Signed: positive adds to stock, negative removes.
    quantity: qty("quantity").notNull(),
    unitCost: money("unit_cost"),
    note: text("note"),
    expenseId: uuid("expense_id").references(() => expenses.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("stock_movements_product_idx").on(t.productId)],
);

export type Shop = typeof shops.$inferSelect;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
