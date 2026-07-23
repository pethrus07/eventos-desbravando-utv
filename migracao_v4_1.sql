-- ============================================================
-- v4.1 · Sistema Operacional (Ciclo Operacional + Operação em Campo)
--
-- Nova camada hierárquica por cima do checklist:
--   Expedição → 7 Etapas → Itens (Nome+Categoria) → 6 Fases → Microtarefas
--   + Operação em Campo por Dias → Tarefas cronológicas → Subtarefas
--
-- É ADITIVO: não altera nem apaga nada do que já existe (itens, clientes,
-- custos, CRM…). Só cria tabelas novas.
--
-- Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_1.sql
-- ============================================================

-- ---------- Ciclo Operacional de Aquisição ----------

-- Um item concreto de uma etapa (Hotel, Bebidas, Camiseta, Banda…).
-- O usuário informa só Nome + Categoria; o sistema cria as 6 fases.
CREATE TABLE IF NOT EXISTS op_itens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  etapa          TEXT NOT NULL DEFAULT '',   -- validacao|marketing|vendas|contratacoes|pre_expedicao|operacao_campo|fechamento
  categoria      TEXT NOT NULL DEFAULT '',   -- Hotel, Bebidas, Almoço, Camiseta…
  nome           TEXT NOT NULL,
  ordem          INTEGER,
  homologado     INTEGER NOT NULL DEFAULT 0, -- parceiro já homologado (pode pular fases)
  observacoes    TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_op_itens_evento ON op_itens(evento_id);

-- As 6 fases fixas de cada item (criadas automaticamente ao salvar o item).
CREATE TABLE IF NOT EXISTS op_fases (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL,
  tipo           TEXT NOT NULL,              -- pesquisa|negociacao|contratacao|confirmacao|execucao|avaliacao
  ordem          INTEGER NOT NULL,           -- 1..6
  status         TEXT NOT NULL DEFAULT 'afazer', -- afazer|andamento|concluido|nao_utilizada
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_op_fases_item ON op_fases(item_id);

-- Microtarefas de cada fase. Os campos data/horario/responsavel/tipo só
-- são usados quando a fase é Execução/Entrega (agenda cronológica).
CREATE TABLE IF NOT EXISTS op_microtarefas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fase_id     INTEGER NOT NULL,
  titulo      TEXT NOT NULL,
  concluido   INTEGER NOT NULL DEFAULT 0,
  ordem       INTEGER,
  -- extras da fase Execução/Entrega:
  data        TEXT NOT NULL DEFAULT '',      -- 'YYYY-MM-DD' ou rótulo do dia
  horario     TEXT NOT NULL DEFAULT '',      -- horário previsto: "08:00"
  responsavel TEXT NOT NULL DEFAULT '',
  tipo        TEXT NOT NULL DEFAULT 'fixa',  -- ajustavel|fixa (comportamento na agenda)
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_op_micro_fase ON op_microtarefas(fase_id);

-- ---------- Operação em Campo (por dias, cronológico) ----------

-- Cada dia da expedição (Dia 0 – Pré, Dia 1, Day Off, Encerramento…).
CREATE TABLE IF NOT EXISTS campo_dias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL,
  rotulo    TEXT NOT NULL,                   -- "Dia 1 — Chegada e boas-vindas"
  data      TEXT NOT NULL DEFAULT '',        -- 'YYYY-MM-DD' (opcional)
  ordem     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_campo_dias_evento ON campo_dias(evento_id);

-- Uma tarefa = um acontecimento cronológico do dia. Ajustável cascateia
-- reajuste de horário; Fixa não move as demais.
CREATE TABLE IF NOT EXISTS campo_tarefas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dia_id         INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  h_planejado    TEXT NOT NULL DEFAULT '',   -- "08:00"
  h_realizado    TEXT NOT NULL DEFAULT '',   -- "08:12"
  responsavel    TEXT NOT NULL DEFAULT '',
  tipo           TEXT NOT NULL DEFAULT 'ajustavel', -- ajustavel|fixa
  status         TEXT NOT NULL DEFAULT 'afazer',    -- afazer|andamento|concluido
  ordem          INTEGER,
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_campo_tarefas_dia ON campo_tarefas(dia_id);

-- Subtarefas de check de uma tarefa de campo.
CREATE TABLE IF NOT EXISTS campo_subtarefas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id INTEGER NOT NULL,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  ordem     INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campo_sub_tarefa ON campo_subtarefas(tarefa_id);
