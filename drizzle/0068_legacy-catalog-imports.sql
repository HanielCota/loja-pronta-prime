CREATE TABLE "legacy_catalog_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"run_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"source_hash" text NOT NULL,
	"product" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legacy_catalog_imports_draft_check" CHECK ("legacy_catalog_imports"."product"->>'legacyProductId'="legacy_catalog_imports"."product_id"::text and "legacy_catalog_imports"."product"->>'publicationReady'='false' and "legacy_catalog_imports"."revision">0)
);
--> statement-breakpoint
ALTER TABLE "legacy_catalog_imports" ADD CONSTRAINT "legacy_catalog_imports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_catalog_imports" ADD CONSTRAINT "legacy_catalog_imports_product_id_legacy_store_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."legacy_store_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_catalog_imports" ADD CONSTRAINT "legacy_catalog_imports_store_id_legacy_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."legacy_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_catalog_imports" ADD CONSTRAINT "legacy_catalog_imports_run_id_product_id_legacy_product_recoveries_run_id_product_id_fk" FOREIGN KEY ("run_id","product_id") REFERENCES "public"."legacy_product_recoveries"("run_id","product_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "legacy_catalog_imports_owner_product_unique" ON "legacy_catalog_imports" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "legacy_catalog_imports_owner_idx" ON "legacy_catalog_imports" USING btree ("user_id","imported_at");