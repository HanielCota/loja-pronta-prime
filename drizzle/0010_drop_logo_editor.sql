ALTER TABLE "store_brand" DROP CONSTRAINT "store_brand_logo_check";--> statement-breakpoint
ALTER TABLE "store_brand" DROP CONSTRAINT "store_brand_logo_variations_check";--> statement-breakpoint
ALTER TABLE "store_brand" DROP CONSTRAINT "store_brand_logo_scene_check";--> statement-breakpoint
ALTER TABLE "store_brand" DROP CONSTRAINT "store_brand_completed_check";--> statement-breakpoint
ALTER TABLE "store_brand" DROP COLUMN "logo";--> statement-breakpoint
ALTER TABLE "store_brand" DROP COLUMN "logo_scene";--> statement-breakpoint
ALTER TABLE "store_brand" DROP COLUMN "logo_variations";--> statement-breakpoint
ALTER TABLE "store_brand" ADD CONSTRAINT "store_brand_completed_check" CHECK ("store_brand"."completed_at" is null or ("store_brand"."name" is not null and "store_brand"."description" is not null));