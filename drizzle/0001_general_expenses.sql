CREATE TABLE "general_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "opening_profit" numeric(14, 2) DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "general_expenses_date_idx" ON "general_expenses" USING btree ("date");--> statement-breakpoint
-- Carried-over accounts are now a single profit figure.
UPDATE "products" SET "opening_profit" = "opening_revenue" - "opening_expense";
