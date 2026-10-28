ALTER TABLE "legacy_product_recoveries" DROP CONSTRAINT "legacy_product_recoveries_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "legacy_product_recoveries" ADD CONSTRAINT "legacy_product_recoveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;