ALTER TABLE "legacy_catalog_publications" ADD COLUMN "authorization_id" uuid;
--> statement-breakpoint
-- Existing confirmations cannot prove which authorization was active when approved.
UPDATE "legacy_catalog_publications"
SET "status" = 'blocked', "failure" = 'authorization-changed',
    "lease_id" = NULL, "lease_until" = NULL, "updated_at" = now()
WHERE "authorization_id" IS NULL AND "status" IN ('pending', 'preparing');
