ALTER TABLE "learning_tracks" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;
UPDATE "learning_tracks" SET "featured" = true WHERE "slug" = 'shopee-ads-completo' AND "kind" = 'complementary_course';
