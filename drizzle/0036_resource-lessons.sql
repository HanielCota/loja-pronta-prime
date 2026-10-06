CREATE TABLE "learning_resource_lessons" (
	"resource_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	CONSTRAINT "learning_resource_lessons_resource_id_lesson_id_pk" PRIMARY KEY("resource_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "learning_resource_lessons" ADD CONSTRAINT "learning_resource_lessons_resource_id_learning_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."learning_resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_resource_lessons" ADD CONSTRAINT "learning_resource_lessons_lesson_id_learning_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."learning_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_resource_lessons_lesson_idx" ON "learning_resource_lessons" USING btree ("lesson_id");