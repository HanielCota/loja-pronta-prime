-- Vincula somente aulas existentes do catálogo; nunca publica conteúdo ou muda progresso.
-- O deploy leva esta migração na imagem standalone e a executa antes de iniciar o servidor.
DO $$
DECLARE
  item record;
  target_lesson uuid;
  video_count integer;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('comece-aqui', 'boas-vindas', 'aulas', 'boas-vindas', '9d49ad09-6743-43db-9672-d9a90c68575d'),
      ('comece-aqui', 'boas-vindas', 'aulas', 'a-tribo-das-soberanas', '0bebd2fd-4c28-47d5-b570-459e5ba74133'),
      ('comece-aqui', 'boas-vindas', 'aulas', 'a-decisao-para-se-tornar-uma-soberana', '31cd6a6f-b7dc-4542-9da6-ed2d464cd360'),
      ('comece-aqui', 'boas-vindas', 'aulas', 'de-clt-a-2-milhoes', '8d4e27be-7211-41e7-b481-8c2cc33de949'),
      ('comece-aqui', 'boas-vindas', 'aulas', 'entrevista-lari-e-leo', '59426f57-bb38-42c8-9fb3-2701bcf37c35'),
      ('comece-aqui', 'boas-vindas', 'aulas', 'agir-por-decisao', '58b7f164-5ae2-4ccb-b107-3bf2ae5868aa'),
      ('metodo-sll', 'etapa-1', 'passo-1', 'comece-por-aqui', '44408d11-f282-4a43-9949-8b3c44b94ee4'),
      ('metodo-sll', 'etapa-1', 'passo-1', 'credenciamento-shopee-vinculacao-escala-shop', '0b7a6732-eb05-417b-9882-5f82fd0d1a58'),
      ('metodo-sll', 'etapa-1', 'passo-2', 'se-ambientando-envio-velox', '505dc639-8eef-419e-9b85-0d32b6468887'),
      ('metodo-sll', 'etapa-1', 'passo-2', 'conectando-loja-envio-velox-fornecedor', 'ed0c85a8-f080-45b0-9d74-3c0fac16b79a'),
      ('metodo-sll', 'etapa-1', 'passo-2', 'configuracoes-essenciais-loja-pos-fornecedor', '0f6faae7-e265-43a0-999e-fde1b914fe80'),
      ('metodo-sll', 'etapa-1', 'passo-3', 'anuncios-automaticos-fotos', 'f32dabf6-93be-456b-a359-a9576a07752d'),
      ('metodo-sll', 'etapa-1', 'passo-3', 'titulos-descricao-precificacao', '9e6a17d5-b60f-4c04-8275-cd9e05f2e8b8'),
      ('metodo-sll', 'etapa-1', 'passo-3', 'categoria-produto-gps-venda', '0f2c3049-11bc-49ef-bc4c-7dc244317104'),
      ('metodo-sll', 'etapa-1', 'passo-3', 'especificacoes-produto', 'f02ea8c0-ae4a-4cb7-a0bc-7917a3c89721'),
      ('metodo-sll', 'etapa-1', 'passo-3', 'informacoes-fiscais', '2a05978e-4bd9-4e1c-b912-99dd524b737f'),
      ('metodo-sll', 'etapa-1', 'passo-4', 'ativar-uma-promocao', '8fb68ac0-9d48-4f1d-b2c7-06c2b4c599d8'),
      ('metodo-sll', 'etapa-1', 'passo-4', 'impulsionar-anuncios-gratuitamente', 'ca93c11e-550f-42cf-976e-1bf79285c56c'),
      ('metodo-sll', 'etapa-1', 'passo-4', 'envio-pedidos-nao-assinante-envio-velox', 'a356dda4-b74b-490e-8be1-ca2d6f22db06'),
      ('metodo-sll', 'etapa-1', 'passo-4', 'envio-pedidos-assinante-envio-velox', 'bc34236a-8395-4d5b-9a12-6047a61f7f60'),
      ('metodo-sll', 'etapa-1', 'passo-4', 'proximos-passos-o-que-fazer-agora', '2eb94f03-3d8d-4870-b139-fbb80c455356'),
      ('metodo-sll', 'etapa-3', 'conheca-sua-nova-fonte-de-renda', 'o-que-e-um-marketplace', '017c676d-533b-4bfa-b70a-d125da557377'),
      ('metodo-sll', 'etapa-3', 'conheca-sua-nova-fonte-de-renda', 'por-que-a-shopee', '7721d5e3-de57-41ea-a514-9cdb9fd618e3'),
      ('metodo-sll', 'etapa-3', 'pedido', 'como-gerar-etiqueta', '9d9bdbfc-e5a9-41cd-bd6d-daa7c6125331'),
      ('metodo-sll', 'etapa-3', 'central-de-marketing', 'desconto', '2438bd11-391a-43dd-90ae-b9e6d7fffade'),
      ('metodo-sll', 'etapa-3', 'central-de-marketing', 'oferta-relampago-da-loja', '621a6734-9668-4767-95a3-b3d5cd2f9462'),
      ('metodo-sll', 'etapa-3', 'central-de-marketing', 'cupons', 'bc02f9c3-7867-411a-b4c0-cc4aa787c0a8'),
      ('metodo-sll', 'etapa-3', 'central-de-marketing', 'campanha-ofertas-oficiais', '8bd4b495-bd00-43ee-93b3-ee7f6557a437'),
      ('metodo-sll', 'etapa-3', 'estrategias-de-visibilidade', 'duplicando-anuncios-do-jeito-certo', '85eff1db-bb6e-42e7-878c-8460063c96b5'),
      ('metodo-sll', 'etapa-3', 'estrategias-de-visibilidade', 'teste-de-categoria', '2252af34-236a-4d03-b6f8-8e3b5dba3d6b'),
      ('metodo-sll', 'etapa-3', 'estrategias-de-visibilidade', 'videos-shopee-videos', 'dafc236c-7d4d-41fd-a439-e6895db53fb4'),
      ('metodo-sll', 'etapa-3', 'estrategias-de-visibilidade', 'primeiras-avaliacoes', '0d4bd4db-04af-4743-876d-189634dd1bb5'),
      ('metodo-sll', 'etapa-3', 'atendimento-ao-cliente', 'chat-de-ouro-avaliacoes-reputacao', 'e114fc65-322d-46ae-aa41-8e2ef3730df7'),
      ('metodo-sll', 'etapa-3', 'financas', 'minha-renda', 'a916b27d-9068-45aa-aebb-a3cd81a1a6c3'),
      ('metodo-sll', 'etapa-3', 'financas', 'saldo-da-carteira', 'cb00889e-db36-46cc-8cc8-51dfd5c1dc6c'),
      ('metodo-sll', 'etapa-3', 'dados', 'informacoes-gerenciais', '34cd7ce9-b04e-4a00-b91e-08aabd32bc10'),
      ('metodo-sll', 'etapa-3', 'dados', 'desempenho-da-conta', 'eef9de3d-33d3-4d48-b5be-d4334237805d'),
      ('metodo-sll', 'etapa-3', 'loja', 'decoracao-da-loja', '72ea4381-792b-421f-a5c7-0a760b6d8fd9'),
      ('metodo-sll', 'etapa-3', 'loja', 'configuracoes-da-loja', '0f6faae7-e265-43a0-999e-fde1b914fe80'),
      ('metodo-sll', 'etapa-3', 'loja', 'gestao-de-contestacao', 'ae0c4aa6-d107-4469-9bef-73a03409437f'),
      ('shopee-ads-completo', 'curso', 'aulas', 'introducao-as-aulas-ze', 'f2004b88-65d2-4eef-977e-030e64599ac3'),
      ('shopee-ads-completo', 'curso', 'aulas', 'introducao-ao-curso', '40075dbd-3dc1-45fd-9541-3abf18e4a1bc'),
      ('shopee-ads-completo', 'curso', 'aulas', 'introducao-ao-shopee-ads', 'e51f2107-b3c8-4b5f-8231-70434b02c601'),
      ('shopee-ads-completo', 'curso', 'aulas', 'os-3-erros-que-iniciantes-cometem', '26da5ac0-e5fc-4419-a500-f29c4b3cddda'),
      ('shopee-ads-completo', 'curso', 'aulas', 'encontrando-seu-roas-perfeito', '3acd66c7-8ae0-4045-89df-8e4198abf30e'),
      ('shopee-ads-completo', 'curso', 'aulas', 'promover-novos-produtos', 'a569923d-1a24-48a8-b045-e6e74ac673d6'),
      ('shopee-ads-completo', 'curso', 'aulas', 'promover-produtos-com-avaliacao', '180bce6b-920e-4aa8-b95f-792596fd5334'),
      ('shopee-ads-completo', 'curso', 'aulas', 'gmv-max-da-loja', '40848968-0d15-432b-8340-dc52bef27902'),
      ('shopee-ads-completo', 'curso', 'aulas', 'metricas-dos-anuncios', 'fc2788ef-e122-4bc3-8826-c36b1ded1d84'),
      ('shopee-ads-completo', 'curso', 'aulas', 'o-que-fazer-para-melhorar-o-anuncio', 'd5ea6dde-c0d4-4f65-9649-53adda2103ce'),
      ('shopee-ads-completo', 'curso', 'aulas', 'como-evitar-o-prejuizo', 'b246ebeb-dbc1-40fa-b59d-29fa72784c0a'),
      ('shopee-ads-completo', 'curso', 'aulas', 'metricas-dos-anuncios-parte-2', 'c828bba3-19e0-4c89-aa28-48f9cb3305b7'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'introducao', '10537723-617d-4681-90ca-61cbfad26485'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'como-funciona-para-o-afiliado', '2959c340-f620-466b-8a76-ee1da23b7d91'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'qual-comissao-oferecer', '3016b4e7-a32c-42ef-b76c-586766c23fe2'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'campanha-aberta', 'f07252da-01a1-4586-b0c4-146c0d3d4364'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'como-atrair-organicamente', 'ae513e51-131c-44cc-8447-1de087e47e54'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'campanha-exclusiva', '783c2dad-fe8d-495e-87ad-b10191c15950'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'vale-a-pena-para-o-meu-produto', '447b0244-085b-4311-9068-2cdb72675ede'),
      ('afiliados-do-vendedor', 'curso', 'aulas', 'atualizacoes-fiscais', '15aa3e01-d081-4591-b60d-521acb6d2a90'),
      ('mentalidade-blindada', 'curso', 'aulas', 'seja-bem-vinda', 'd48212fc-f743-4670-9f4d-389878b0d3f2'),
      ('mentalidade-blindada', 'curso', 'aulas', 'quem-e-prisciane-pereira', 'aaedcf24-765a-46ac-b230-615c34a8524b'),
      ('mentalidade-blindada', 'curso', 'aulas', 'o-foco-no-que-voce-controla', '1dbffddb-d462-434e-9d95-62696970edc8'),
      ('mentalidade-blindada', 'curso', 'aulas', 'a-comparacao', '1b1d2f08-4ff9-4064-a5a3-b0d64d34684c'),
      ('mentalidade-blindada', 'curso', 'aulas', 'o-ambiente-forma-quem-voce-e', '36eec2f6-8fce-4e58-9287-0afca8f65f82'),
      ('mentalidade-blindada', 'curso', 'aulas', 'um-plano-ruim-bem-executado', '3438a9aa-07a7-4a93-bfa9-e1788b3767ad'),
      ('mentalidade-blindada', 'curso', 'aulas', 'o-que-me-fez-ser-prospera', '92e2e817-5fbb-44b3-8587-9fd0de5190ba'),
      ('mentalidade-blindada', 'curso', 'aulas', 'proposito-e-diferente-de-meta', '41864503-836e-4360-a35b-d8435d9bbf76'),
      ('mentalidade-blindada', 'curso', 'aulas', 'voce-acredita-em-deus', 'deb51b06-7745-4029-bfc9-331ffa06b3e1'),
      ('mentalidade-blindada', 'curso', 'aulas', 'voce-nasceu-para-prosperar', 'e227ecc1-89eb-4fa5-80a8-793423d52508'),
      ('mentalidade-blindada', 'curso', 'aulas', 'relacao-verdadeira-com-deus', 'cbe6c71f-2a08-42af-b990-d3bcdfddb79a')
    ) AS catalog(track_slug, stage_slug, module_slug, lesson_slug, video_id)
  LOOP
    target_lesson := NULL;
    SELECT lesson.id INTO target_lesson
    FROM learning_lessons AS lesson
    JOIN learning_modules AS module ON module.id = lesson.module_id
    JOIN learning_stages AS stage ON stage.id = module.stage_id
    JOIN learning_tracks AS track ON track.id = stage.track_id
    WHERE track.slug = item.track_slug AND stage.slug = item.stage_slug
      AND module.slug = item.module_slug AND lesson.slug = item.lesson_slug
      AND track.archived_at IS NULL AND stage.archived_at IS NULL
      AND module.archived_at IS NULL AND lesson.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM learning_node_drafts AS draft
        WHERE draft.kind = 'lesson' AND draft.node_id = lesson.id
      )
    FOR UPDATE OF lesson;

    -- Bancos sem a estrutura ainda não têm aulas para vincular. O importador continua disponível.
    IF target_lesson IS NULL THEN CONTINUE; END IF;
    SELECT count(*) INTO video_count FROM learning_content_blocks
    WHERE lesson_id = target_lesson AND kind = 'video';

    IF video_count = 0 THEN
      -- Preserva a ordem relativa e os IDs dos materiais já existentes.
      UPDATE learning_content_blocks SET position = position + 1
      WHERE lesson_id = target_lesson;
      INSERT INTO learning_content_blocks (lesson_id, kind, data, position)
      VALUES (target_lesson, 'video', jsonb_build_object('provider', 'pandavideo', 'videoId', item.video_id), 0);
    ELSIF video_count = 1 THEN
      -- Não troca vídeos escolhidos no admin; conserva anotações e vínculos de anexos.
      UPDATE learning_content_blocks
      SET data = data || jsonb_build_object('videoId', item.video_id)
      WHERE lesson_id = target_lesson AND kind = 'video'
        AND data->>'provider' = 'pandavideo' AND data->>'videoId' = '';
    END IF;
  END LOOP;
END $$;
