-- A 0037 corrigiu os textos antigos dos Recursos nos dados publicados. Rascunhos e versões
-- anteriores guardam cópias desses textos, e publicar um deles ou "Voltar à versão anterior"
-- traria o texto antigo de volta. Mesma regra: só troca o texto antigo exato.
UPDATE "learning_node_drafts" SET "data" = jsonb_set("data", '{groupTitle}', '"Ajuda para sua loja"')
WHERE "kind" = 'resource' AND "data"->>'groupTitle' = 'GPTs personalizados SLL';
--> statement-breakpoint
UPDATE "learning_node_history" SET "data" = jsonb_set("data", '{groupTitle}', '"Ajuda para sua loja"')
WHERE "kind" = 'resource' AND "data"->>'groupTitle' = 'GPTs personalizados SLL';
--> statement-breakpoint
UPDATE "learning_node_drafts" SET "data" = jsonb_set("data", '{title}', '"Mentora Pri"')
WHERE "kind" = 'resource' AND "data"->>'title' = 'Mentora Pri (Atendimento 24 horas)';
--> statement-breakpoint
UPDATE "learning_node_history" SET "data" = jsonb_set("data", '{title}', '"Mentora Pri"')
WHERE "kind" = 'resource' AND "data"->>'title' = 'Mentora Pri (Atendimento 24 horas)';
--> statement-breakpoint
UPDATE "learning_node_drafts" SET "data" = jsonb_set("data", '{description}', '"Fornecedores para sua loja na Shopee."')
WHERE "kind" = 'resource'
  AND "data"->>'description' = 'Fornecedores curados para dropshipping Shopee. O endereço visto no site antigo não abriu.';
--> statement-breakpoint
UPDATE "learning_node_history" SET "data" = jsonb_set("data", '{description}', '"Fornecedores para sua loja na Shopee."')
WHERE "kind" = 'resource'
  AND "data"->>'description' = 'Fornecedores curados para dropshipping Shopee. O endereço visto no site antigo não abriu.';
--> statement-breakpoint
UPDATE "learning_node_drafts" AS d SET "data" = jsonb_set(d."data", '{buttonLabel}', to_jsonb(CASE r."slug"
    WHEN 'mentora-pri' THEN 'Conversar com a Pri'
    WHEN 'artista-de-loja' THEN 'Criar logo e descrição'
    WHEN 'fotografo-profissional' THEN 'Criar fotos do produto'
    WHEN 'anuncio-lucrativo' THEN 'Montar meu anúncio'
    ELSE 'Abrir ferramenta'
  END))
FROM "learning_resources" AS r
WHERE d."kind" = 'resource' AND d."node_id" = r."id" AND d."data"->>'buttonLabel' = 'Abrir GPT';
--> statement-breakpoint
UPDATE "learning_node_history" AS h SET "data" = jsonb_set(h."data", '{buttonLabel}', to_jsonb(CASE r."slug"
    WHEN 'mentora-pri' THEN 'Conversar com a Pri'
    WHEN 'artista-de-loja' THEN 'Criar logo e descrição'
    WHEN 'fotografo-profissional' THEN 'Criar fotos do produto'
    WHEN 'anuncio-lucrativo' THEN 'Montar meu anúncio'
    ELSE 'Abrir ferramenta'
  END))
FROM "learning_resources" AS r
WHERE h."kind" = 'resource' AND h."node_id" = r."id" AND h."data"->>'buttonLabel' = 'Abrir GPT';
