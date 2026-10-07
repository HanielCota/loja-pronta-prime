-- A calculadora agora tem uma rota protegida e deve ser acessível pelo catálogo de Recursos.
UPDATE "learning_resources"
SET "destination" = '/sll/recursos/calculadora-shopee', "updated_at" = now()
WHERE "slug" = 'calculadora-preco-shopee' AND "destination" IS NULL;
--> statement-breakpoint
UPDATE "learning_node_drafts" AS d
SET "data" = jsonb_set(d."data", '{destination}', '"/sll/recursos/calculadora-shopee"')
FROM "learning_resources" AS r
WHERE d."kind" = 'resource'
  AND d."node_id" = r."id"
  AND r."slug" = 'calculadora-preco-shopee'
  AND (d."data"->>'destination' IS NULL OR d."data"->>'destination' = '');
--> statement-breakpoint
UPDATE "learning_node_history" AS h
SET "data" = jsonb_set(h."data", '{destination}', '"/sll/recursos/calculadora-shopee"')
FROM "learning_resources" AS r
WHERE h."kind" = 'resource'
  AND h."node_id" = r."id"
  AND r."slug" = 'calculadora-preco-shopee'
  AND (h."data"->>'destination' IS NULL OR h."data"->>'destination' = '');
