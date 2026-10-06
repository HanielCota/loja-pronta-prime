CREATE TABLE "learning_node_drafts" (
	"kind" text NOT NULL,
	"node_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_node_drafts_kind_node_id_pk" PRIMARY KEY("kind","node_id"),
	CONSTRAINT "learning_node_drafts_kind_check" CHECK ("learning_node_drafts"."kind" in ('track', 'stage', 'module', 'lesson')),
	CONSTRAINT "learning_node_drafts_data_check" CHECK (jsonb_typeof("learning_node_drafts"."data") = 'object')
);
