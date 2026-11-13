ALTER TABLE "hotmart_settings" ADD COLUMN "encrypted_secondary_hottok" text;--> statement-breakpoint
INSERT INTO "hotmart_product_ids" ("product_id", "access", "expert")
VALUES (8954689, 'loja-pronta', 'pri'), (8954196, 'sll', 'pri');
