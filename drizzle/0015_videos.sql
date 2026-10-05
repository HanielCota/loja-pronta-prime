CREATE TABLE "videos" (
	"slot" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"captions_key" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "videos_key_check" CHECK (char_length("videos"."key") between 1 and 200),
	CONSTRAINT "videos_size_check" CHECK ("videos"."size" > 0)
);
