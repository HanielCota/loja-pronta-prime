ALTER TABLE "assisted_deliveries" ADD COLUMN "offer_review_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "credential_version" uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "credential_version" SET DEFAULT gen_random_uuid();
