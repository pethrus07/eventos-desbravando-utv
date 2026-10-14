-- v4.7 · BRIEFING DE COMUNICAÇÃO (S2 do docs/ROADMAP.md, 14/10/2026)
--
-- É a estrutura que torna os R$ 500/mês viáveis. Hoje um pedido de arte nasce numa mensagem,
-- vira conversa, volta como pergunta e só então vira peça — e são essas voltas, não o desenho,
-- que consomem a maior parte das 15,9 h/mês. O briefing elimina o meio.
--
-- TRÊS DECISÕES QUE VALE EXPLICAR:
--
-- 1. O CATÁLOGO VIVE NO BANCO, não no código. Cliente e RYZE precisam olhar para a mesma
--    lista quando discutirem escopo; lista em código é lista que só um lado enxerga. É também
--    o que impede o Claude do cliente de inventar peça: o que não está aqui não existe.
--
-- 2. CADA CAMPO GUARDA SUA ORIGEM ('sistema' ou 'pessoa'). O briefing nasce meio preenchido —
--    datas, dias, programação e cardápio já estão no banco — e a pessoa só completa o buraco.
--    Sem a coluna `origem` não dá para distinguir o que o sistema deduziu do que alguém
--    afirmou, e um palpite errado do sistema viraria fato sem ninguém notar.
--
-- 3. `pedido_extra` NASCE INERTE, em 'pendente_orcamento'. É a cláusula do acordo virando
--    código: fora do catálogo não existe verbo para "faça isto para mim", só para "quero um
--    orçamento disto". A trava é a AUSÊNCIA do verbo, não uma regra escrita em algum lugar.
--
-- Aplicar:  npx wrangler d1 execute eventos --remote --file=migracao_v4_7.sql
-- Antes:    npx wrangler d1 export eventos --remote --output backup.sql
-- Confira:  npx wrangler whoami   (o Desbravando é na conta ryzecode08)

CREATE TABLE IF NOT EXISTS catalogo_pecas (
  slug   TEXT PRIMARY KEY,
  nome   TEXT NOT NULL,
  oque   TEXT NOT NULL,              -- o que o valor cobre, na linguagem do acordo
  campos TEXT NOT NULL DEFAULT '[]', -- JSON: [{campo, rotulo, origem, obrigatorio}]
  ordem  INTEGER NOT NULL DEFAULT 0,
  ativo  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS briefing (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'aberto',   -- aberto | fechado
  aberto_em   TEXT NOT NULL DEFAULT (datetime('now')),
  fechado_em  TEXT,
  fechado_por TEXT
);

CREATE TABLE IF NOT EXISTS briefing_campo (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  briefing_id INTEGER NOT NULL,
  peca        TEXT NOT NULL,
  campo       TEXT NOT NULL,
  valor       TEXT,
  origem      TEXT NOT NULL DEFAULT 'pessoa',   -- sistema | pessoa
  UNIQUE (briefing_id, peca, campo)
);
CREATE INDEX IF NOT EXISTS idx_briefing_campo ON briefing_campo(briefing_id, peca);

CREATE TABLE IF NOT EXISTS pedido_extra (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id     INTEGER,
  pedido        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendente_orcamento',  -- pendente_orcamento | orcado | aprovado | recusado
  valor         INTEGER,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por    TEXT NOT NULL DEFAULT '',
  respondido_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_pedido_status ON pedido_extra(status, id DESC);

-- ---------------------------------------------------------------------------
-- O catálogo acordado em 13/10/2026: as dez peças da lista do cliente.
-- `origem: sistema` marca o campo que o pré-preenchimento resolve sozinho.
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO catalogo_pecas (slug, nome, oque, ordem, campos) VALUES
 ('adesivo', 'Adesivo', 'adesivo da expedição, em vetor, pronto para a gráfica', 1,
  '[{"campo":"local","rotulo":"Local no selo","origem":"pessoa","obrigatorio":1},
    {"campo":"numeros","rotulo":"Números de UTV","origem":"sistema","obrigatorio":1}]'),

 ('contagem', 'Contagem regressiva', 'a série de contagem até a saída, no padrão de redes', 2,
  '[{"campo":"data_saida","rotulo":"Data da saída","origem":"sistema","obrigatorio":1},
    {"campo":"marcos","rotulo":"Quantos dias antes publicar","origem":"pessoa","obrigatorio":0}]'),

 ('cardapio', 'Cardápio', 'o cardápio nos formatos de sempre, a partir do que foi escolhido no formulário', 3,
  '[{"campo":"refeicoes","rotulo":"Refeições e pratos","origem":"sistema","obrigatorio":1}]'),

 ('formulario', 'Formulário', 'o formulário público da expedição no ar, com as respostas no painel', 4,
  '[{"campo":"perguntas","rotulo":"O que perguntar","origem":"pessoa","obrigatorio":1},
    {"campo":"prazo","rotulo":"Prazo de resposta","origem":"pessoa","obrigatorio":0}]'),

 ('camiseta', 'Camiseta', 'as estampas da camiseta da expedição, frente e costas', 5,
  '[{"campo":"frase","rotulo":"Frase ou palavra das costas","origem":"pessoa","obrigatorio":1},
    {"campo":"tamanhos","rotulo":"Grade de tamanhos","origem":"sistema","obrigatorio":0}]'),

 ('cronograma_geral', 'Cronograma geral', 'a visão da expedição inteira numa peça', 6,
  '[{"campo":"dias","rotulo":"Dias e trechos","origem":"sistema","obrigatorio":1}]'),

 ('cronograma_dia', 'Cronograma por dia', 'uma peça por dia de expedição, montada da programação do sistema', 7,
  '[{"campo":"agenda","rotulo":"Agenda de cada dia","origem":"sistema","obrigatorio":1},
    {"campo":"briefing_hora","rotulo":"Hora do briefing diário","origem":"pessoa","obrigatorio":0}]'),

 ('carta', 'Carta de boas-vindas', 'a carta entregue ao participante na chegada', 8,
  '[{"campo":"texto","rotulo":"Texto da carta","origem":"pessoa","obrigatorio":1},
    {"campo":"assinatura","rotulo":"Quem assina","origem":"pessoa","obrigatorio":0}]'),

 ('conduta', 'Off-road consciente', 'o código de conduta na identidade da expedição', 9,
  '[{"campo":"itens","rotulo":"Itens do código","origem":"pessoa","obrigatorio":0}]'),

 ('guia_logistico', 'Guia logístico', 'o guia com roteiro, pontos de apoio e orientações práticas', 10,
  '[{"campo":"hospedagem","rotulo":"Hospedagem","origem":"sistema","obrigatorio":1},
    {"campo":"pontos_apoio","rotulo":"Pontos de apoio","origem":"pessoa","obrigatorio":1},
    {"campo":"o_que_levar","rotulo":"O que levar","origem":"pessoa","obrigatorio":1}]');
