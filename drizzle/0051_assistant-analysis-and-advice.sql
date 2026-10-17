CREATE TABLE "assistant_advice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"model" text NOT NULL,
	"priorities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assistant_publication_batches" ADD COLUMN "analysis" jsonb;--> statement-breakpoint
ALTER TABLE "student_experiences" ADD COLUMN "manual_assigned_by" text;--> statement-breakpoint
ALTER TABLE "student_experiences" ADD COLUMN "manual_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assistant_advice" ADD CONSTRAINT "assistant_advice_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_advice" ADD CONSTRAINT "assistant_advice_run_id_shopee_collection_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."shopee_collection_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_advice_run_unique" ON "assistant_advice" USING btree ("user_id","run_id");--> statement-breakpoint
ALTER TABLE "student_experiences" ADD CONSTRAINT "student_experiences_manual_assigned_by_user_id_fk" FOREIGN KEY ("manual_assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;