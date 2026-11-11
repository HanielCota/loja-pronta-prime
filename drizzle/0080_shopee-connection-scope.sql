DROP INDEX "shopee_connections_shop_unique";--> statement-breakpoint
ALTER TABLE "shopee_connections" DROP CONSTRAINT "shopee_connections_pkey";--> statement-breakpoint
ALTER TABLE "shopee_connections" ADD CONSTRAINT "shopee_connections_user_id_application_id_pk" PRIMARY KEY("user_id","application_id");--> statement-breakpoint
ALTER TABLE "shopee_connections" ADD COLUMN "authorization_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shopee_connections_application_shop_unique" ON "shopee_connections" USING btree ("application_id","shop_id");
