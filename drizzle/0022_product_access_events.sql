CREATE TABLE "product_access_events" (
	"id" text PRIMARY KEY NOT NULL,
	"target_user_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"product" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_access_events" ADD CONSTRAINT "product_access_events_target_user_id_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_access_events" ADD CONSTRAINT "product_access_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_access_events_created_at_idx" ON "product_access_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_access_events_target_user_idx" ON "product_access_events" USING btree ("target_user_id");