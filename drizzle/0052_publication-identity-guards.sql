DROP INDEX "assistant_publication_product_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_publication_item_unique" ON "assistant_publication_items" USING btree ("user_id","shop_id","application_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_publication_product_unique" ON "assistant_publication_items" USING btree ("user_id","shop_id","application_id","sku");