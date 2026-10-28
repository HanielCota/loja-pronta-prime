-- A verified operational recovery may bootstrap these tables before the next application deploy.
-- Replay only creates a complete missing schema; a partial bootstrap requires reconciliation.
DO $legacy_catalog$
BEGIN
IF to_regclass('public.legacy_catalog_products') IS NULL
   AND to_regclass('public.legacy_catalog_recovery_runs') IS NULL
   AND to_regclass('public.legacy_product_recoveries') IS NULL THEN
CREATE TABLE "legacy_catalog_products" (
	"run_id" text NOT NULL,
	"id" text NOT NULL,
	"product" jsonb NOT NULL,
	CONSTRAINT "legacy_catalog_products_run_id_id_pk" PRIMARY KEY("run_id","id")
);


CREATE TABLE "legacy_catalog_recovery_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"manifest_key" text NOT NULL,
	"manifest_sha256" text NOT NULL,
	"source_product_count" integer NOT NULL,
	"counts" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"applied_at" timestamp with time zone
);


CREATE TABLE "legacy_product_recoveries" (
	"run_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" text,
	"base_product_id" text,
	"source_hash" text NOT NULL,
	"status" text NOT NULL,
	"method" text,
	"reasons" jsonb NOT NULL,
	CONSTRAINT "legacy_product_recoveries_run_id_product_id_pk" PRIMARY KEY("run_id","product_id"),
	CONSTRAINT "legacy_product_recoveries_status_check" CHECK ("legacy_product_recoveries"."status" in ('recovered','review','unmatched','protected')),
	CONSTRAINT "legacy_product_recoveries_method_check" CHECK ("legacy_product_recoveries"."method" is null or "legacy_product_recoveries"."method" in ('shop_item_id','title_description')),
	CONSTRAINT "legacy_product_recoveries_recovered_check" CHECK ("legacy_product_recoveries"."status" <> 'recovered' or ("legacy_product_recoveries"."base_product_id" is not null and "legacy_product_recoveries"."user_id" is not null and "legacy_product_recoveries"."method" is not null))
);


ALTER TABLE "legacy_catalog_products" ADD CONSTRAINT "legacy_catalog_products_run_id_legacy_catalog_recovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."legacy_catalog_recovery_runs"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_run_id_legacy_catalog_recovery_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."legacy_catalog_recovery_runs"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_product_id_legacy_store_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."legacy_store_products"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_store_id_legacy_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."legacy_stores"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_run_id_base_product_id_legacy_catalog_products_run_id_id_fk" FOREIGN KEY ("run_id","base_product_id") REFERENCES "public"."legacy_catalog_products"("run_id","id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "legacy_product_recoveries_store_idx" ON "legacy_product_recoveries" USING btree ("store_id","run_id");

CREATE INDEX "legacy_product_recoveries_user_idx" ON "legacy_product_recoveries" USING btree ("user_id","run_id");
ELSIF to_regclass('public.legacy_catalog_products') IS NULL
   OR to_regclass('public.legacy_catalog_recovery_runs') IS NULL
   OR to_regclass('public.legacy_product_recoveries') IS NULL THEN
  RAISE EXCEPTION 'The legacy catalog recovery schema is incomplete';
END IF;
END
$legacy_catalog$;
