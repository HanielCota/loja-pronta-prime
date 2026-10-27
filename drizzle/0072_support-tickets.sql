CREATE TABLE "staff_audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "staff_audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" text,
	"area" text NOT NULL,
	"action" text NOT NULL,
	"target_id" text,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_access_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_faq_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"topic_id" text NOT NULL,
	"situation_id" text,
	"title" text NOT NULL,
	"steps" jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_faq_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"answer_id" text NOT NULL,
	"user_id" text,
	"topic_id" text NOT NULL,
	"situation_id" text,
	"resolved" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_holidays" (
	"date" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_impersonation_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"staff_id" text,
	"student_id" text,
	"action" text NOT NULL,
	"path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_known_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"topic_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"ends_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_reply_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"status_after" text,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"weekly_hours" jsonb NOT NULL,
	"deadline_minutes" jsonb NOT NULL,
	"auto_close_days" integer DEFAULT 7 NOT NULL,
	"auto_assign" boolean DEFAULT false NOT NULL,
	"max_open_per_person" integer DEFAULT 15 NOT NULL,
	"paused_until" timestamp,
	"pause_message" text,
	"attachment_retention_days" integer DEFAULT 180 NOT NULL,
	"ticket_retention_years" integer DEFAULT 5 NOT NULL,
	"seeded_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_situations" (
	"topic_id" text NOT NULL,
	"id" text NOT NULL,
	"label" text NOT NULL,
	"legend" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"question" text NOT NULL,
	"example" text NOT NULL,
	"attachment_tip" text NOT NULL,
	"notice" text,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_situations_topic_id_id_pk" PRIMARY KEY("topic_id","id")
);
--> statement-breakpoint
CREATE TABLE "support_staff_status" (
	"user_id" text PRIMARY KEY NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"purged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_ticket_attachments_size_check" CHECK ("support_ticket_attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "support_ticket_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "support_ticket_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"ticket_id" uuid NOT NULL,
	"actor_id" text,
	"automatic" boolean DEFAULT false NOT NULL,
	"type" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"from_staff" boolean DEFAULT false NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_ticket_reads" (
	"ticket_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp NOT NULL,
	CONSTRAINT "support_ticket_reads_ticket_id_user_id_pk" PRIMARY KEY("ticket_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"requester_id" text,
	"requester_email" text NOT NULL,
	"requester_name" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"queue" text DEFAULT 'general' NOT NULL,
	"topic_id" text NOT NULL,
	"situation_id" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"assignee_id" text,
	"awaiting_since" timestamp,
	"due_at" timestamp,
	"first_response_at" timestamp,
	"closed_at" timestamp,
	"closed_reason" text,
	"product" text,
	"lesson_id" text,
	"store_phase" smallint,
	"error_digest" text,
	"page_path" text,
	"channel" text DEFAULT 'platform' NOT NULL,
	"email_confirmed_at" timestamp,
	"assistant_answer_id" text,
	"submission_id" text,
	"email_replies" boolean DEFAULT true NOT NULL,
	"rating" smallint,
	"rating_comment" text,
	"rated_at" timestamp,
	"late_notified_at" timestamp,
	"anonymized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_rating_check" CHECK ("support_tickets"."rating" is null or "support_tickets"."rating" between 1 and 5),
	CONSTRAINT "support_tickets_phase_check" CHECK ("support_tickets"."store_phase" is null or "support_tickets"."store_phase" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "support_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"question" text NOT NULL,
	"example" text NOT NULL,
	"position" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"default_assignee_id" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_whatsapp_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"source" text NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_audit_log" ADD CONSTRAINT "staff_audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_tokens" ADD CONSTRAINT "support_access_tokens_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_faq_feedback" ADD CONSTRAINT "support_faq_feedback_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_impersonation_log" ADD CONSTRAINT "support_impersonation_log_staff_id_user_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_impersonation_log" ADD CONSTRAINT "support_impersonation_log_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_known_issues" ADD CONSTRAINT "support_known_issues_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_situations" ADD CONSTRAINT "support_situations_topic_id_support_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."support_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_staff_status" ADD CONSTRAINT "support_staff_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_message_id_support_ticket_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."support_ticket_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_events" ADD CONSTRAINT "support_ticket_events_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_events" ADD CONSTRAINT "support_ticket_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_reads" ADD CONSTRAINT "support_ticket_reads_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_ticket_reads" ADD CONSTRAINT "support_ticket_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_topics" ADD CONSTRAINT "support_topics_default_assignee_id_user_id_fk" FOREIGN KEY ("default_assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_whatsapp_clicks" ADD CONSTRAINT "support_whatsapp_clicks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_audit_log_created_idx" ON "staff_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "staff_audit_log_area_idx" ON "staff_audit_log" USING btree ("area","created_at");--> statement-breakpoint
CREATE INDEX "staff_audit_log_actor_idx" ON "staff_audit_log" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "support_access_tokens_ticket_idx" ON "support_access_tokens" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_faq_answers_topic_idx" ON "support_faq_answers" USING btree ("topic_id","situation_id");--> statement-breakpoint
CREATE INDEX "support_faq_feedback_created_idx" ON "support_faq_feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "support_impersonation_log_student_idx" ON "support_impersonation_log" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "support_known_issues_period_idx" ON "support_known_issues" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "support_ticket_attachments_message_idx" ON "support_ticket_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "support_ticket_attachments_ticket_idx" ON "support_ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "support_ticket_events_ticket_idx" ON "support_ticket_events" USING btree ("ticket_id","id");--> statement-breakpoint
CREATE INDEX "support_ticket_events_type_idx" ON "support_ticket_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_idx" ON "support_ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_ticket_messages_author_idx" ON "support_ticket_messages" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_number_idx" ON "support_tickets" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "support_tickets_submission_idx" ON "support_tickets" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "support_tickets_requester_idx" ON "support_tickets" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "support_tickets_status_assignee_idx" ON "support_tickets" USING btree ("status","assignee_id");--> statement-breakpoint
CREATE INDEX "support_tickets_queue_status_idx" ON "support_tickets" USING btree ("queue","status");--> statement-breakpoint
CREATE INDEX "support_tickets_due_idx" ON "support_tickets" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "support_tickets_topic_idx" ON "support_tickets" USING btree ("topic_id","situation_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_updated_idx" ON "support_tickets" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "support_whatsapp_clicks_created_idx" ON "support_whatsapp_clicks" USING btree ("created_at");