ALTER TABLE "expenses" ADD COLUMN "client_ref" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "checkout_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_shop_client_ref_idx" ON "expenses" USING btree ("shop_id","client_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_checkout_product_idx" ON "sales" USING btree ("checkout_id","product_id");