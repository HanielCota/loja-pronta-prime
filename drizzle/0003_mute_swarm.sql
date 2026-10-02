CREATE TABLE "stores" (
	"user_id" text PRIMARY KEY NOT NULL,
	"phase" smallint DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stores_phase_check" CHECK ("stores"."phase" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "student_products" (
	"user_id" text NOT NULL,
	"product" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"first_visited_at" timestamp,
	"last_visited_at" timestamp,
	CONSTRAINT "student_products_user_id_product_pk" PRIMARY KEY("user_id","product"),
	CONSTRAINT "student_products_product_check" CHECK ("student_products"."product" in ('sll', 'loja-pronta'))
);
--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_products" ADD CONSTRAINT "student_products_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;