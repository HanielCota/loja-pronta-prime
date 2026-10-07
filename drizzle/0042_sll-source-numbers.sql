-- Preserva a numeração já editada e preenche somente as aulas originais com número vazio.
UPDATE "learning_lessons" AS lesson
SET "source_number" = source."source_number"
FROM (VALUES
	('conheca-sua-nova-fonte-de-renda', 'o-que-e-um-marketplace', 18),
	('conheca-sua-nova-fonte-de-renda', 'por-que-a-shopee', 19),
	('pedido', 'como-gerar-etiqueta', 20),
	('central-de-marketing', 'desconto', 27),
	('central-de-marketing', 'oferta-relampago-da-loja', 28),
	('central-de-marketing', 'cupons', 29),
	('central-de-marketing', 'campanha-ofertas-oficiais', 30),
	('estrategias-de-visibilidade', 'duplicando-anuncios-do-jeito-certo', 31),
	('estrategias-de-visibilidade', 'teste-de-categoria', 32),
	('estrategias-de-visibilidade', 'videos-shopee-videos', 33),
	('estrategias-de-visibilidade', 'primeiras-avaliacoes', 34),
	('atendimento-ao-cliente', 'chat-de-ouro-avaliacoes-reputacao', 35),
	('financas', 'minha-renda', 36),
	('financas', 'saldo-da-carteira', 38),
	('dados', 'informacoes-gerenciais', 39),
	('dados', 'desempenho-da-conta', 40),
	('loja', 'decoracao-da-loja', 42),
	('loja', 'configuracoes-da-loja', 43),
	('loja', 'gestao-de-contestacao', 44)
) AS source("module_slug", "lesson_slug", "source_number")
JOIN "learning_modules" AS module ON module."slug" = source."module_slug"
JOIN "learning_stages" AS stage ON stage."id" = module."stage_id" AND stage."slug" = 'etapa-3'
JOIN "learning_tracks" AS track ON track."id" = stage."track_id" AND track."slug" = 'metodo-sll'
WHERE lesson."module_id" = module."id"
	AND lesson."slug" = source."lesson_slug"
	AND lesson."source_number" IS NULL;
