CREATE TABLE "mentorship_lessons" (
	"slot" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"video_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_lives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"live_url" text,
	"recording_url" text
);
