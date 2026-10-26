CREATE TABLE "hotmart_product_ids" (
	"product_id" bigint PRIMARY KEY NOT NULL,
	"product_ucode" text,
	"access" text NOT NULL,
	"expert" text NOT NULL,
	CONSTRAINT "hotmart_product_ids_product_ucode_unique" UNIQUE("product_ucode")
);
--> statement-breakpoint
ALTER TABLE "hotmart_events" ADD COLUMN "product_id" bigint;--> statement-breakpoint
ALTER TABLE "hotmart_purchases" ADD COLUMN "product_id" bigint;
--> statement-breakpoint
INSERT INTO "hotmart_product_ids" ("product_id", "access", "expert")
VALUES (8781486, 'loja-pronta', 'ze'), (8781449, 'sll', 'ze');
