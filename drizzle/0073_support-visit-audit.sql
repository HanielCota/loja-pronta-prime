ALTER TABLE "support_impersonation_log" ADD COLUMN "kind" text DEFAULT 'action' NOT NULL;--> statement-breakpoint
ALTER TABLE "support_impersonation_log" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "support_impersonation_log" ADD COLUMN "ticket_id" uuid;--> statement-breakpoint
ALTER TABLE "support_impersonation_log" ADD CONSTRAINT "support_impersonation_log_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_impersonation_log_session_idx" ON "support_impersonation_log" USING btree ("session_id");