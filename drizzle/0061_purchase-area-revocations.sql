CREATE TABLE "hotmart_purchase_access_revocations" (
	"transaction" text NOT NULL,
	"product" text NOT NULL,
	CONSTRAINT "hotmart_purchase_access_revocations_transaction_product_pk" PRIMARY KEY("transaction","product")
);
--> statement-breakpoint
ALTER TABLE "hotmart_purchase_access_revocations" ADD CONSTRAINT "hotmart_purchase_access_revocations_transaction_hotmart_purchases_transaction_fk" FOREIGN KEY ("transaction") REFERENCES "public"."hotmart_purchases"("transaction") ON DELETE cascade ON UPDATE no action;