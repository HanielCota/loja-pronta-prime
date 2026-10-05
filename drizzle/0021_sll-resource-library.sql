CREATE TABLE "learning_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"group_key" text NOT NULL,
	"group_title" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"button_label" text,
	"destination" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "learning_publish_state" DEFAULT 'draft' NOT NULL,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_resources_slug_unique" UNIQUE("slug"),
	CONSTRAINT "learning_resources_position_check" CHECK ("learning_resources"."position" >= 0)
);
--> statement-breakpoint
CREATE INDEX "learning_resources_order_idx" ON "learning_resources" USING btree ("group_key","position","id");