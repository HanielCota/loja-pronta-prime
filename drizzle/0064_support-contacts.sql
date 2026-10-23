CREATE TABLE "support_contacts" (
	"topic" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
