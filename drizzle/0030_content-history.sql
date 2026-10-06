CREATE TABLE "learning_node_history" (
	"kind" text NOT NULL,
	"node_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "learning_node_history_kind_node_id_pk" PRIMARY KEY("kind","node_id"),
	CONSTRAINT "learning_node_history_kind_check" CHECK ("learning_node_history"."kind" in ('track', 'stage', 'module', 'lesson')),
	CONSTRAINT "learning_node_history_data_check" CHECK (jsonb_typeof("learning_node_history"."data") = 'object')
);
