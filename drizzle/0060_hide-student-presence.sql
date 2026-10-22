CREATE TABLE "hidden_user_presence" (
	"user_id" text PRIMARY KEY NOT NULL,
	"hidden_by" text,
	"hidden_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hidden_user_presence" ADD CONSTRAINT "hidden_user_presence_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_user_presence" ADD CONSTRAINT "hidden_user_presence_hidden_by_user_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;