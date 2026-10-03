CREATE TABLE "logo_chat" (
	"user_id" text PRIMARY KEY NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"brief" jsonb,
	"generations" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "logo_chat_messages_check" CHECK (jsonb_typeof("logo_chat"."messages") = 'array'),
	CONSTRAINT "logo_chat_generations_check" CHECK ("logo_chat"."generations" >= 0)
);
--> statement-breakpoint
ALTER TABLE "store_brand" ADD COLUMN "logo_image" text;--> statement-breakpoint
ALTER TABLE "logo_chat" ADD CONSTRAINT "logo_chat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_brand" ADD CONSTRAINT "store_brand_logo_image_check" CHECK (char_length("store_brand"."logo_image") between 1 and 200);