CREATE TABLE "legacy_customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text,
	"record" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_purchase_references" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"customer_id" uuid,
	"store_id" uuid,
	"record" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_store_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"source_project" text NOT NULL,
	"exported_at" timestamp NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"customer_count" integer NOT NULL,
	"store_count" integer NOT NULL,
	"product_count" integer NOT NULL,
	"purchase_count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_store_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"store_id" uuid NOT NULL,
	"record" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legacy_stores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"record" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy_customers" ADD CONSTRAINT "legacy_customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_purchase_references" ADD CONSTRAINT "legacy_purchase_references_customer_id_legacy_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."legacy_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_purchase_references" ADD CONSTRAINT "legacy_purchase_references_store_id_legacy_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."legacy_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_store_products" ADD CONSTRAINT "legacy_store_products_store_id_legacy_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."legacy_stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy_stores" ADD CONSTRAINT "legacy_stores_customer_id_legacy_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."legacy_customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "legacy_customers_user_idx" ON "legacy_customers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "legacy_purchase_references_customer_idx" ON "legacy_purchase_references" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "legacy_store_products_store_idx" ON "legacy_store_products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "legacy_stores_customer_idx" ON "legacy_stores" USING btree ("customer_id");