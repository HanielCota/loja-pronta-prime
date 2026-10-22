CREATE TABLE "store_banner_kits" (
	"user_id" text PRIMARY KEY NOT NULL,
	"revision" text NOT NULL,
	"brand_fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text NOT NULL,
	"palette" text NOT NULL,
	"approved_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_automation_jobs" ADD COLUMN "source_fingerprint" text;--> statement-breakpoint
ALTER TABLE "store_brand" ADD COLUMN "publication_fingerprint" text;--> statement-breakpoint
ALTER TABLE "store_banner_kits" ADD CONSTRAINT "store_banner_kits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;