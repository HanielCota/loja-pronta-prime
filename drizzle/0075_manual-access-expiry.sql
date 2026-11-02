ALTER TABLE "manual_product_grants" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "product_access_events" ADD COLUMN "expires_at" timestamp with time zone;