CREATE TYPE "public"."learning_content_block_kind" AS ENUM('text', 'video', 'link', 'file', 'image');--> statement-breakpoint
CREATE TYPE "public"."learning_publish_state" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."learning_track_kind" AS ENUM('welcome', 'method', 'complementary_course');--> statement-breakpoint
CREATE TABLE "learning_content_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" "learning_content_block_kind" NOT NULL,
	"data" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_content_blocks_data_check" CHECK (jsonb_typeof("learning_content_blocks"."data") = 'object'),
	CONSTRAINT "learning_content_blocks_position_check" CHECK ("learning_content_blocks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration_minutes" smallint,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_lessons_slug_check" CHECK ("learning_lessons"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "learning_lessons_position_check" CHECK ("learning_lessons"."position" >= 0),
	CONSTRAINT "learning_lessons_duration_check" CHECK ("learning_lessons"."duration_minutes" is null or "learning_lessons"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_modules_slug_check" CHECK ("learning_modules"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "learning_modules_position_check" CHECK ("learning_modules"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_stages_slug_check" CHECK ("learning_stages"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "learning_stages_position_check" CHECK ("learning_stages"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "learning_track_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_tracks_slug_check" CHECK ("learning_tracks"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "learning_tracks_position_check" CHECK ("learning_tracks"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "learning_content_blocks" ADD CONSTRAINT "learning_content_blocks_lesson_id_learning_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."learning_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_lessons" ADD CONSTRAINT "learning_lessons_module_id_learning_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."learning_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_modules" ADD CONSTRAINT "learning_modules_stage_id_learning_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."learning_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_stages" ADD CONSTRAINT "learning_stages_track_id_learning_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."learning_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_content_blocks_order_idx" ON "learning_content_blocks" USING btree ("lesson_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_lessons_module_slug_uidx" ON "learning_lessons" USING btree ("module_id","slug");--> statement-breakpoint
CREATE INDEX "learning_lessons_order_idx" ON "learning_lessons" USING btree ("module_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_modules_stage_slug_uidx" ON "learning_modules" USING btree ("stage_id","slug");--> statement-breakpoint
CREATE INDEX "learning_modules_order_idx" ON "learning_modules" USING btree ("stage_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_stages_track_slug_uidx" ON "learning_stages" USING btree ("track_id","slug");--> statement-breakpoint
CREATE INDEX "learning_stages_order_idx" ON "learning_stages" USING btree ("track_id","position","id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_tracks_slug_uidx" ON "learning_tracks" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "learning_tracks_order_idx" ON "learning_tracks" USING btree ("position","id");
