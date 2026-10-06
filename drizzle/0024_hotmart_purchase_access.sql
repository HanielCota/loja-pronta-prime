CREATE TABLE "hotmart_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"transaction" text NOT NULL,
	"buyer_email" text NOT NULL,
	"product_ucode" text NOT NULL,
	"result" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotmart_product_mappings" (
	"product_ucode" text NOT NULL,
	"access" text NOT NULL,
	CONSTRAINT "hotmart_product_mappings_product_ucode_access_pk" PRIMARY KEY("product_ucode","access")
);
--> statement-breakpoint
CREATE TABLE "hotmart_purchases" (
	"transaction" text PRIMARY KEY NOT NULL,
	"buyer_email" text NOT NULL,
	"product_ucode" text NOT NULL,
	"user_id" text,
	"active" boolean NOT NULL,
	"last_event_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotmart_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"encrypted_hottok" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manual_product_grants" (
	"user_id" text NOT NULL,
	"product" text NOT NULL,
	CONSTRAINT "manual_product_grants_user_id_product_pk" PRIMARY KEY("user_id","product")
);
--> statement-breakpoint
ALTER TABLE "hotmart_purchases" ADD CONSTRAINT "hotmart_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotmart_settings" ADD CONSTRAINT "hotmart_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_product_grants" ADD CONSTRAINT "manual_product_grants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotmart_events_received_idx" ON "hotmart_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "hotmart_purchases_user_idx" ON "hotmart_purchases" USING btree ("user_id");
--> statement-breakpoint
-- Os acessos já existentes vieram de testes ou do painel; preservá-los em reembolsos futuros.
INSERT INTO "manual_product_grants" ("user_id", "product")
SELECT "user_id", "product" FROM "student_products";
