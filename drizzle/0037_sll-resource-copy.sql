-- Textos dos Recursos do SLL que vieram do site antigo e a página corrigia na hora de mostrar.
-- Agora a correção fica nos dados, e a página e o admin mostram o mesmo texto. Cada UPDATE só troca
-- o texto antigo exato: o que o admin já editou fica como está.
UPDATE "learning_resources" SET "group_title" = 'Ajuda para sua loja', "updated_at" = now()
WHERE "group_title" = 'GPTs personalizados SLL';
--> statement-breakpoint
UPDATE "learning_node_drafts" SET "data" = jsonb_set("data", '{groupTitle}', '"Ajuda para sua loja"'), "updated_at" = now()
WHERE "kind" = 'resource' AND "data"->>'groupTitle' = 'GPTs personalizados SLL';
--> statement-breakpoint
UPDATE "learning_resources" SET "title" = 'Mentora Pri', "updated_at" = now()
WHERE "slug" = 'mentora-pri' AND "title" = 'Mentora Pri (Atendimento 24 horas)';
--> statement-breakpoint
UPDATE "learning_resources" SET "description" = 'Fornecedores para sua loja na Shopee.', "updated_at" = now()
WHERE "slug" = 'envio-velox'
  AND "description" = 'Fornecedores curados para dropshipping Shopee. O endereço visto no site antigo não abriu.';
--> statement-breakpoint
-- "Abrir GPT" não diz o que acontece: o botão passa a dizer a ação de cada ferramenta.
UPDATE "learning_resources" SET "button_label" = CASE "slug"
    WHEN 'mentora-pri' THEN 'Conversar com a Pri'
    WHEN 'artista-de-loja' THEN 'Criar logo e descrição'
    WHEN 'fotografo-profissional' THEN 'Criar fotos do produto'
    WHEN 'anuncio-lucrativo' THEN 'Montar meu anúncio'
    ELSE 'Abrir ferramenta'
  END, "updated_at" = now()
WHERE "button_label" = 'Abrir GPT';
