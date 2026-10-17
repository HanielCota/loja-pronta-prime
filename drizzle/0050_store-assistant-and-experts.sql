CREATE TABLE "assistant_category_experiments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"application_id" text NOT NULL,
	"left_item_id" bigint NOT NULL,
	"right_item_id" bigint NOT NULL,
	"baseline_run_id" uuid NOT NULL,
	"min_views" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_experiments_items_check" CHECK ("assistant_category_experiments"."left_item_id" <> "assistant_category_experiments"."right_item_id" and "assistant_category_experiments"."min_views">0)
);
--> statement-breakpoint
CREATE TABLE "assistant_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"deduplication_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"failure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_jobs_deduplication_key_unique" UNIQUE("deduplication_key")
);
--> statement-breakpoint
CREATE TABLE "assistant_plan_progress" (
	"plan_id" uuid NOT NULL,
	"action_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_plan_progress_plan_id_action_id_pk" PRIMARY KEY("plan_id","action_id")
);
--> statement-breakpoint
CREATE TABLE "assistant_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"playbook_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"strategy" text NOT NULL,
	"store_age" text NOT NULL,
	"shop_id" bigint,
	"application_id" text,
	"actions" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_plans_strategy_check" CHECK ("assistant_plans"."strategy" in ('organic','hybrid','paid')),
	CONSTRAINT "assistant_plans_age_check" CHECK ("assistant_plans"."store_age" in ('under_7_days','exactly_7_days','over_7_days'))
);
--> statement-breakpoint
CREATE TABLE "assistant_playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"strategy" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"actions" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_playbooks_strategy_check" CHECK ("assistant_playbooks"."strategy" in ('organic','hybrid','paid'))
);
--> statement-breakpoint
CREATE TABLE "assistant_publication_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"application_id" text NOT NULL,
	"kind" text DEFAULT 'initial' NOT NULL,
	"strategy" text NOT NULL,
	"status" text DEFAULT 'publishing' NOT NULL,
	"published_at" timestamp with time zone,
	"evaluated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_batches_kind_check" CHECK ("assistant_publication_batches"."kind" in ('initial','expansion')),
	CONSTRAINT "assistant_batches_strategy_check" CHECK ("assistant_publication_batches"."strategy" in ('varied','niche'))
);
--> statement-breakpoint
CREATE TABLE "assistant_publication_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"application_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"sku" text NOT NULL,
	"payload" jsonb NOT NULL,
	"item_id" bigint,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure" text,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "learning_video_variants" (
	"block_id" uuid NOT NULL,
	"expert" text NOT NULL,
	"published_video_id" text,
	"draft_video_id" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_video_variants_block_id_expert_pk" PRIMARY KEY("block_id","expert"),
	CONSTRAINT "learning_video_variants_expert_check" CHECK ("learning_video_variants"."expert" in ('pri','ze'))
);
--> statement-breakpoint
CREATE TABLE "shopee_collection_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"application_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"failure" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shopee_metric_snapshots" (
	"run_id" uuid NOT NULL,
	"item_id" bigint NOT NULL,
	"title" text NOT NULL,
	"category_id" bigint,
	"views" bigint,
	"impressions" bigint,
	"clicks" bigint,
	"sales" bigint,
	CONSTRAINT "shopee_metric_snapshots_run_id_item_id_pk" PRIMARY KEY("run_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "student_experiences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"expert" text DEFAULT 'pri' NOT NULL,
	"manual_expert" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "student_experiences_expert_check" CHECK ("student_experiences"."expert" in ('pri','ze') and ("student_experiences"."manual_expert" is null or "student_experiences"."manual_expert" in ('pri','ze')))
);
--> statement-breakpoint
CREATE TABLE "supplier_publication_mappings" (
	"user_id" text NOT NULL,
	"supplier_id" text NOT NULL,
	"sku" text NOT NULL,
	"shop_id" bigint NOT NULL,
	"application_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"confirmed_by" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supplier_publication_mappings_user_id_supplier_id_sku_shop_id_application_id_pk" PRIMARY KEY("user_id","supplier_id","sku","shop_id","application_id")
);
--> statement-breakpoint
ALTER TABLE "hotmart_product_mappings" ADD COLUMN "expert" text DEFAULT 'pri' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotmart_product_mappings" ADD COLUMN "primary" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotmart_purchases" ADD COLUMN "expert" text DEFAULT 'pri' NOT NULL;--> statement-breakpoint
ALTER TABLE "assistant_category_experiments" ADD CONSTRAINT "assistant_category_experiments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_category_experiments" ADD CONSTRAINT "assistant_category_experiments_baseline_run_id_shopee_collection_runs_id_fk" FOREIGN KEY ("baseline_run_id") REFERENCES "public"."shopee_collection_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_jobs" ADD CONSTRAINT "assistant_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_plan_progress" ADD CONSTRAINT "assistant_plan_progress_plan_id_assistant_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."assistant_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_plans" ADD CONSTRAINT "assistant_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_plans" ADD CONSTRAINT "assistant_plans_playbook_id_assistant_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."assistant_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_playbooks" ADD CONSTRAINT "assistant_playbooks_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_publication_batches" ADD CONSTRAINT "assistant_publication_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_publication_items" ADD CONSTRAINT "assistant_publication_items_batch_id_assistant_publication_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."assistant_publication_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_publication_items" ADD CONSTRAINT "assistant_publication_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_video_variants" ADD CONSTRAINT "learning_video_variants_block_id_learning_content_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."learning_content_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_video_variants" ADD CONSTRAINT "learning_video_variants_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopee_collection_runs" ADD CONSTRAINT "shopee_collection_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopee_metric_snapshots" ADD CONSTRAINT "shopee_metric_snapshots_run_id_shopee_collection_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."shopee_collection_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_experiences" ADD CONSTRAINT "student_experiences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_publication_mappings" ADD CONSTRAINT "supplier_publication_mappings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_publication_mappings" ADD CONSTRAINT "supplier_publication_mappings_confirmed_by_user_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_jobs_due_idx" ON "assistant_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_plans_active_unique" ON "assistant_plans" USING btree ("user_id") WHERE "assistant_plans"."active"=true;--> statement-breakpoint
CREATE INDEX "assistant_batches_user_idx" ON "assistant_publication_batches" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_batches_initial_unique" ON "assistant_publication_batches" USING btree ("user_id","shop_id","application_id") WHERE "assistant_publication_batches"."kind"='initial';--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_publication_product_unique" ON "assistant_publication_items" USING btree ("user_id","shop_id","application_id","supplier_id","sku");--> statement-breakpoint
CREATE INDEX "shopee_collection_runs_user_idx" ON "shopee_collection_runs" USING btree ("user_id","started_at");