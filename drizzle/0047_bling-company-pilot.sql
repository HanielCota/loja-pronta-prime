CREATE TABLE "bling_authorization_states" (
	"state_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"client_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "bling_authorization_states_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "bling_authorization_states_hash_check" CHECK ("bling_authorization_states"."state_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "bling_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"company_id" text NOT NULL,
	"company_cnpj" text NOT NULL,
	"company_name" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bling_connections_pilot_check" CHECK ("bling_connections"."id" = 'main'),
	CONSTRAINT "bling_connections_cnpj_check" CHECK ("bling_connections"."company_cnpj" ~ '^[0-9]{14}$')
);
--> statement-breakpoint
ALTER TABLE "bling_authorization_states" ADD CONSTRAINT "bling_authorization_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bling_connections" ADD CONSTRAINT "bling_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;