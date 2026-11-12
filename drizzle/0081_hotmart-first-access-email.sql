CREATE TABLE "hotmart_first_access_emails" (
	"user_id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotmart_first_access_emails" ADD CONSTRAINT "hotmart_first_access_emails_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotmart_first_access_emails_next_attempt_idx" ON "hotmart_first_access_emails" USING btree ("next_attempt_at");