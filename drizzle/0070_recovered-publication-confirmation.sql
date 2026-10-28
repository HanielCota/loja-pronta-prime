CREATE TABLE "legacy_catalog_publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"status" text DEFAULT 'editing' NOT NULL,
	"context" jsonb NOT NULL,
	"intent" jsonb,
	"fingerprint" text,
	"expires_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"payload" jsonb,
	"item_id" bigint,
	"failure" text,
	"lease_id" uuid,
	"lease_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_catalog_publications_status_check" CHECK ("legacy_catalog_publications"."status" in ('editing','review','pending','preparing','sending','published','blocked','unknown')),
	CONSTRAINT "legacy_catalog_publications_confirmation_check" CHECK ("legacy_catalog_publications"."status" in ('editing','review','blocked') or ("legacy_catalog_publications"."confirmed_at" is not null and "legacy_catalog_publications"."intent" is not null and "legacy_catalog_publications"."fingerprint" is not null and "legacy_catalog_publications"."expires_at" is not null)),
	CONSTRAINT "legacy_catalog_publications_published_check" CHECK ("legacy_catalog_publications"."status"<>'published' or "legacy_catalog_publications"."item_id" is not null),
	CONSTRAINT "legacy_catalog_publications_shop_check" CHECK ("legacy_catalog_publications"."shop_id">0 and "legacy_catalog_publications"."shop_id"<=9007199254740991)
);
--> statement-breakpoint
ALTER TABLE "shopee_authorization_states" DROP CONSTRAINT "shopee_authorization_states_origin_check";--> statement-breakpoint
ALTER TABLE "legacy_catalog_publications" ADD CONSTRAINT "legacy_catalog_publications_import_id_legacy_catalog_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."legacy_catalog_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_catalog_publications" ADD CONSTRAINT "legacy_catalog_publications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_catalog_publications_import_unique" ON "legacy_catalog_publications" USING btree ("import_id");--> statement-breakpoint
CREATE INDEX "legacy_catalog_publications_owner_idx" ON "legacy_catalog_publications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legacy_catalog_publications_queue_idx" ON "legacy_catalog_publications" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "shopee_authorization_states" ADD CONSTRAINT "shopee_authorization_states_origin_check" CHECK ("shopee_authorization_states"."origin" in ('sll', 'loja-pronta', 'recovered'));