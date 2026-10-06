CREATE TABLE "learning_lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"last_position_seconds" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp,
	"last_viewed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id"),
	CONSTRAINT "learning_lesson_progress_position_check" CHECK ("learning_lesson_progress"."last_position_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "learning_track_progress" (
	"user_id" text NOT NULL,
	"track_id" uuid NOT NULL,
	"current_lesson_id" uuid,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_track_progress_user_id_track_id_pk" PRIMARY KEY("user_id","track_id")
);
--> statement-breakpoint
ALTER TABLE "learning_lesson_progress" ADD CONSTRAINT "learning_lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_lesson_progress" ADD CONSTRAINT "learning_lesson_progress_lesson_id_learning_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."learning_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_track_progress" ADD CONSTRAINT "learning_track_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_track_progress" ADD CONSTRAINT "learning_track_progress_track_id_learning_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."learning_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_track_progress" ADD CONSTRAINT "learning_track_progress_current_lesson_id_learning_lessons_id_fk" FOREIGN KEY ("current_lesson_id") REFERENCES "public"."learning_lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_lesson_progress_user_viewed_idx" ON "learning_lesson_progress" USING btree ("user_id","last_viewed_at");--> statement-breakpoint
CREATE INDEX "learning_track_progress_user_accessed_idx" ON "learning_track_progress" USING btree ("user_id","last_accessed_at");