CREATE TABLE "store_brand" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text,
	"logo" jsonb,
	"description" text,
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "store_brand_name_check" CHECK (char_length("store_brand"."name") between 1 and 30),
	CONSTRAINT "store_brand_description_check" CHECK (char_length("store_brand"."description") between 1 and 500),
	CONSTRAINT "store_brand_logo_check" CHECK (jsonb_typeof("store_brand"."logo") = 'object'),
	CONSTRAINT "store_brand_completed_check" CHECK ("store_brand"."completed_at" is null or ("store_brand"."name" is not null and "store_brand"."logo" is not null and "store_brand"."description" is not null))
);
--> statement-breakpoint
ALTER TABLE "store_brand" ADD CONSTRAINT "store_brand_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;