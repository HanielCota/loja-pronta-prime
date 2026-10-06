CREATE TABLE "learning_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"button_label" text NOT NULL,
	"destination" text NOT NULL,
	"image_storage_key" text,
	"image_alt" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_banners_slug_unique" UNIQUE("slug"),
	CONSTRAINT "learning_banners_position_check" CHECK ("learning_banners"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX "learning_banners_order_idx" ON "learning_banners" USING btree ("position","id");