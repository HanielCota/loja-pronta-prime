CREATE TABLE "assisted_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" text NOT NULL,
	"brand" jsonb NOT NULL,
	"selection" jsonb NOT NULL,
	"item_ids" jsonb DEFAULT '[null,null,null,null,null]'::jsonb NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"operator_id" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	CONSTRAINT "assisted_deliveries_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "assisted_deliveries_shop_id_unique" UNIQUE("shop_id"),
	CONSTRAINT "assisted_deliveries_shop_id_check" CHECK ("assisted_deliveries"."shop_id" ~ '^[1-9][0-9]{0,15}$'),
	CONSTRAINT "assisted_deliveries_selection_count_check" CHECK (jsonb_array_length("assisted_deliveries"."selection") = 5),
	CONSTRAINT "assisted_deliveries_item_count_check" CHECK (jsonb_array_length("assisted_deliveries"."item_ids") = 5),
	CONSTRAINT "assisted_deliveries_completed_check" CHECK ("assisted_deliveries"."completed_at" is null or "assisted_deliveries"."started_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "assisted_deliveries" ADD CONSTRAINT "assisted_deliveries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assisted_deliveries" ADD CONSTRAINT "assisted_deliveries_operator_id_user_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assisted_deliveries_queue_idx" ON "assisted_deliveries" USING btree ("completed_at","requested_at");