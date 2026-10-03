ALTER TABLE "logo_chat" ADD COLUMN "turns" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "logo_chat" ADD CONSTRAINT "logo_chat_turns_check" CHECK ("logo_chat"."turns" >= 0);