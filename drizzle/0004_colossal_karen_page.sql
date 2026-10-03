CREATE TABLE "store_onboarding" (
	"user_id" text PRIMARY KEY NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"whatsapp" text,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_onboarding" ADD CONSTRAINT "store_onboarding_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;