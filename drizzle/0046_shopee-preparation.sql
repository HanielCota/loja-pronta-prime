CREATE TABLE "shopee_authorization_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "shopee_authorization_states_hash_check" CHECK ("shopee_authorization_states"."state_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "shopee_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"shop_id" bigint NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopee_connections_shop_check" CHECK ("shopee_connections"."shop_id" > 0 and "shopee_connections"."shop_id" <= 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "supplier_catalog" (
	"supplier_id" text NOT NULL,
	"sku" text NOT NULL,
	"product" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "supplier_catalog_supplier_id_sku_pk" PRIMARY KEY("supplier_id","sku")
);
--> statement-breakpoint
ALTER TABLE "shopee_authorization_states" ADD CONSTRAINT "shopee_authorization_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopee_connections" ADD CONSTRAINT "shopee_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopee_authorization_states_expiry_idx" ON "shopee_authorization_states" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "shopee_connections_shop_unique" ON "shopee_connections" USING btree ("shop_id");