ALTER TABLE "hotmart_events" ADD COLUMN "product_name" text;--> statement-breakpoint
ALTER TABLE "hotmart_events" ADD COLUMN "buyer_name" text;--> statement-breakpoint
ALTER TABLE "hotmart_events" ADD COLUMN "event_version" text;--> statement-breakpoint
ALTER TABLE "hotmart_events" ADD COLUMN "event_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hotmart_events" ADD COLUMN "ordered_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "hotmart_events_result_idx" ON "hotmart_events" USING btree ("result");--> statement-breakpoint
CREATE INDEX "hotmart_events_transaction_idx" ON "hotmart_events" USING btree ("transaction");