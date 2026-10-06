ALTER TABLE "learning_node_drafts" DROP CONSTRAINT "learning_node_drafts_kind_check";
ALTER TABLE "learning_node_drafts" ADD CONSTRAINT "learning_node_drafts_kind_check" CHECK ("learning_node_drafts"."kind" in ('track', 'stage', 'module', 'lesson', 'resource', 'banner'));
ALTER TABLE "learning_node_history" DROP CONSTRAINT "learning_node_history_kind_check";
ALTER TABLE "learning_node_history" ADD CONSTRAINT "learning_node_history_kind_check" CHECK ("learning_node_history"."kind" in ('track', 'stage', 'module', 'lesson', 'resource', 'banner'));
