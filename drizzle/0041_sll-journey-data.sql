CREATE TYPE "public"."sll_plan_store_age" AS ENUM('under_7_days', 'exactly_7_days', 'over_7_days');--> statement-breakpoint
CREATE TABLE "sll_plan_intake" (
	"user_id" text PRIMARY KEY NOT NULL,
	"store_age" "sll_plan_store_age" NOT NULL,
	"answered_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_lessons" ADD COLUMN "source_number" smallint;--> statement-breakpoint
ALTER TABLE "sll_plan_intake" ADD CONSTRAINT "sll_plan_intake_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sll_plan_intake_store_age_idx" ON "sll_plan_intake" USING btree ("store_age");--> statement-breakpoint
ALTER TABLE "learning_lessons" ADD CONSTRAINT "learning_lessons_source_number_check" CHECK ("learning_lessons"."source_number" is null or "learning_lessons"."source_number" > 0);