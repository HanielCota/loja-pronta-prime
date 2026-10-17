CREATE TABLE "runtime_heartbeats" (
	"id" text PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_automation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" text NOT NULL,
	"application_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"baseline" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"lease_until" timestamp with time zone,
	"failure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_feed_subscriptions" (
	"user_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"updated_at" timestamp with time zone,
	"failure" text,
	CONSTRAINT "supplier_feed_subscriptions_user_id_supplier_id_pk" PRIMARY KEY("user_id","supplier_id")
);
--> statement-breakpoint
ALTER TABLE "store_automation_jobs" ADD CONSTRAINT "store_automation_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_feed_subscriptions" ADD CONSTRAINT "supplier_feed_subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "store_automation_jobs_due_idx" ON "store_automation_jobs" USING btree ("status","created_at");