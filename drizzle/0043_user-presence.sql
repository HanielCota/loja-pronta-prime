CREATE TABLE "user_presence" (
	"user_id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_presence_last_seen_idx" ON "user_presence" USING btree ("last_seen_at");