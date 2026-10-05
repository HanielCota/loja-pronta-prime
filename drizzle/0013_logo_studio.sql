CREATE TABLE "logo_studio" (
	"user_id" text PRIMARY KEY NOT NULL,
	"picks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"logos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generations" integer DEFAULT 0 NOT NULL,
	"uploads" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "logo_studio_picks_check" CHECK (jsonb_typeof("logo_studio"."picks") = 'object'),
	CONSTRAINT "logo_studio_logos_check" CHECK (jsonb_typeof("logo_studio"."logos") = 'array'),
	CONSTRAINT "logo_studio_generations_check" CHECK ("logo_studio"."generations" >= 0),
	CONSTRAINT "logo_studio_uploads_check" CHECK ("logo_studio"."uploads" >= 0)
);
--> statement-breakpoint
ALTER TABLE "logo_studio" ADD CONSTRAINT "logo_studio_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- O que vem do chat do logo: os logos da conversa (em ordem; os criados pela IA levam o resumo da
-- conversa, pros ajustes de um toque), as criações já gastas e os logos que ela mandou.
INSERT INTO "logo_studio" ("user_id", "logos", "generations", "uploads")
SELECT
	c."user_id",
	coalesce((
		SELECT jsonb_agg(
			CASE
				WHEN e.m ? 'uploaded' THEN jsonb_build_object('key', e.m->>'image', 'uploaded', true)
				WHEN jsonb_typeof(c."brief") = 'object' THEN jsonb_build_object('key', e.m->>'image', 'brief', c."brief")
				ELSE jsonb_build_object('key', e.m->>'image')
			END
			ORDER BY e.ord
		)
		FROM jsonb_array_elements(c."messages") WITH ORDINALITY AS e(m, ord)
		WHERE jsonb_typeof(e.m->'image') = 'string'
	), '[]'::jsonb),
	c."generations",
	(SELECT count(*) FROM jsonb_array_elements(c."messages") AS e(m) WHERE e.m ? 'uploaded')::int
FROM "logo_chat" c;
