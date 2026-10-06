ALTER TABLE "product_access_events" DROP CONSTRAINT "product_access_events_actor_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "product_access_events" ALTER COLUMN "actor_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_access_events" ADD CONSTRAINT "product_access_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;