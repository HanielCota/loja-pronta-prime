CREATE TABLE "historical_sll_purchases" (
	"transaction" text PRIMARY KEY NOT NULL,
	"source_sha256" text NOT NULL,
	"source_product_id" text NOT NULL,
	"buyer_email" text NOT NULL,
	"user_id" text,
	"purchased_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sales_history_imports" (
	"source_sha256" text PRIMARY KEY NOT NULL,
	"prepared_sha256" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotmart_purchases" ADD COLUMN "purchased_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hotmart_purchases" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "historical_sll_purchases" ADD CONSTRAINT "historical_sll_purchases_source_sha256_sales_history_imports_source_sha256_fk" FOREIGN KEY ("source_sha256") REFERENCES "public"."sales_history_imports"("source_sha256") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_sll_purchases" ADD CONSTRAINT "historical_sll_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historical_sll_purchases_user_idx" ON "historical_sll_purchases" USING btree ("user_id");