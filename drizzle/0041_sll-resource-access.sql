-- Custom SQL migration file, put your code below! --
-- Textos e acessos da Etapa 14. Cada correção limita-se ao texto importado anteriormente;
-- alterações feitas pela administração continuam preservadas.
UPDATE "learning_resources"
SET "group_title" = 'Assistentes no ChatGPT', "updated_at" = now()
WHERE "group_key" = 'assistentes' AND "group_title" = 'Ajuda para sua loja';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Ajuda a tirar dúvidas sobre sua loja e a encontrar aulas relacionadas no ChatGPT.', "updated_at" = now()
WHERE "slug" = 'mentora-pri' AND "description" = 'Tua mentora 24/7: tira dúvidas, entrega diagnósticos e recomenda aulas.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Ajuda a criar uma sugestão de logo e descrição da loja no ChatGPT.', "updated_at" = now()
WHERE "slug" = 'artista-de-loja' AND "description" = 'Logo em 5 minutos: cria logo estratégica e descrição da loja.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Ajuda a criar fotos de produto para a vitrine no ChatGPT.', "updated_at" = now()
WHERE "slug" = 'fotografo-profissional' AND "description" = 'Gera fotos profissionais de produto para a vitrine.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Ajuda a montar título, descrição e preço de um anúncio no ChatGPT.', "updated_at" = now()
WHERE "slug" = 'anuncio-lucrativo' AND "description" = 'Título, descrição e preço para montar o anúncio.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Parceiro externo de fornecedores para sua loja na Shopee. O destino está em preparação.', "updated_at" = now()
WHERE "slug" = 'envio-velox' AND "description" = 'Fornecedores para sua loja na Shopee.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Página externa com os planos do ChatGPT. A assinatura não está incluída no SLL.', "updated_at" = now()
WHERE "slug" = 'chatgpt-plus' AND "description" = 'Plano pago apresentado como forma de potencializar os GPTs do SLL.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Serviço externo para gestão pós-venda, notas fiscais e estoque. Confira as condições no site.', "updated_at" = now()
WHERE "slug" = 'bling' AND "description" = 'Gestão pós-venda e nota fiscal automática, com integração com Shopee e controle de estoque.';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Mostra o preço de cadastro depois que as taxas e os custos forem confirmados.', "updated_at" = now()
WHERE "slug" = 'calculadora-preco-shopee' AND "description" = 'Pra entrar sem prejuízo ou pra lucrar o quanto você escolher.';
--> statement-breakpoint
UPDATE "learning_node_drafts" AS d
SET "data" = jsonb_set(d."data", '{description}', to_jsonb(CASE r."slug"
  WHEN 'mentora-pri' THEN 'Ajuda a tirar dúvidas sobre sua loja e a encontrar aulas relacionadas no ChatGPT.'
  WHEN 'artista-de-loja' THEN 'Ajuda a criar uma sugestão de logo e descrição da loja no ChatGPT.'
  WHEN 'fotografo-profissional' THEN 'Ajuda a criar fotos de produto para a vitrine no ChatGPT.'
  WHEN 'anuncio-lucrativo' THEN 'Ajuda a montar título, descrição e preço de um anúncio no ChatGPT.'
  WHEN 'envio-velox' THEN 'Parceiro externo de fornecedores para sua loja na Shopee. O destino está em preparação.'
  WHEN 'chatgpt-plus' THEN 'Página externa com os planos do ChatGPT. A assinatura não está incluída no SLL.'
  WHEN 'bling' THEN 'Serviço externo para gestão pós-venda, notas fiscais e estoque. Confira as condições no site.'
  WHEN 'calculadora-preco-shopee' THEN 'Mostra o preço de cadastro depois que as taxas e os custos forem confirmados.'
  ELSE r."description"
END))
FROM "learning_resources" AS r
WHERE d."kind" = 'resource' AND d."node_id" = r."id"
  AND d."data"->>'description' IN (
    'Tua mentora 24/7: tira dúvidas, entrega diagnósticos e recomenda aulas.',
    'Logo em 5 minutos: cria logo estratégica e descrição da loja.',
    'Gera fotos profissionais de produto para a vitrine.',
    'Título, descrição e preço para montar o anúncio.',
    'Fornecedores para sua loja na Shopee.',
    'Plano pago apresentado como forma de potencializar os GPTs do SLL.',
    'Gestão pós-venda e nota fiscal automática, com integração com Shopee e controle de estoque.',
    'Pra entrar sem prejuízo ou pra lucrar o quanto você escolher.'
  );
--> statement-breakpoint
UPDATE "learning_node_history" AS h
SET "data" = jsonb_set(h."data", '{description}', to_jsonb(CASE r."slug"
  WHEN 'mentora-pri' THEN 'Ajuda a tirar dúvidas sobre sua loja e a encontrar aulas relacionadas no ChatGPT.'
  WHEN 'artista-de-loja' THEN 'Ajuda a criar uma sugestão de logo e descrição da loja no ChatGPT.'
  WHEN 'fotografo-profissional' THEN 'Ajuda a criar fotos de produto para a vitrine no ChatGPT.'
  WHEN 'anuncio-lucrativo' THEN 'Ajuda a montar título, descrição e preço de um anúncio no ChatGPT.'
  WHEN 'envio-velox' THEN 'Parceiro externo de fornecedores para sua loja na Shopee. O destino está em preparação.'
  WHEN 'chatgpt-plus' THEN 'Página externa com os planos do ChatGPT. A assinatura não está incluída no SLL.'
  WHEN 'bling' THEN 'Serviço externo para gestão pós-venda, notas fiscais e estoque. Confira as condições no site.'
  WHEN 'calculadora-preco-shopee' THEN 'Mostra o preço de cadastro depois que as taxas e os custos forem confirmados.'
  ELSE r."description"
END))
FROM "learning_resources" AS r
WHERE h."kind" = 'resource' AND h."node_id" = r."id"
  AND h."data"->>'description' IN (
    'Tua mentora 24/7: tira dúvidas, entrega diagnósticos e recomenda aulas.',
    'Logo em 5 minutos: cria logo estratégica e descrição da loja.',
    'Gera fotos profissionais de produto para a vitrine.',
    'Título, descrição e preço para montar o anúncio.',
    'Fornecedores para sua loja na Shopee.',
    'Plano pago apresentado como forma de potencializar os GPTs do SLL.',
    'Gestão pós-venda e nota fiscal automática, com integração com Shopee e controle de estoque.',
    'Pra entrar sem prejuízo ou pra lucrar o quanto você escolher.'
  );
--> statement-breakpoint
UPDATE "learning_node_drafts" AS d
SET "data" = jsonb_set(d."data", '{groupTitle}', '"Assistentes no ChatGPT"')
FROM "learning_resources" AS r
WHERE d."kind" = 'resource' AND d."node_id" = r."id"
  AND r."group_key" = 'assistentes' AND d."data"->>'groupTitle' = 'Ajuda para sua loja';
--> statement-breakpoint
UPDATE "learning_node_history" AS h
SET "data" = jsonb_set(h."data", '{groupTitle}', '"Assistentes no ChatGPT"')
FROM "learning_resources" AS r
WHERE h."kind" = 'resource' AND h."node_id" = r."id"
  AND r."group_key" = 'assistentes' AND h."data"->>'groupTitle' = 'Ajuda para sua loja';
--> statement-breakpoint
INSERT INTO "learning_resource_lessons" ("resource_id", "lesson_id")
SELECT r."id", l."id"
FROM "learning_resources" AS r
JOIN "learning_lessons" AS l
  ON l."source_number" = 33 AND l."slug" = 'videos-shopee-videos'
WHERE r."slug" = 'fotografo-profissional'
ON CONFLICT ("resource_id", "lesson_id") DO NOTHING;
