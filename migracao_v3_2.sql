-- ============================================================
-- Migração v3.1 → v3.2 — Módulo de Custos + Fornecedores
-- APENAS para quem já tem o banco no ar. (instalação nova usa o schema.sql)
-- É ADITIVA: cria tabelas novas, não altera nem apaga nada existente.
-- Rodar UMA VEZ:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_2.sql
-- ============================================================

-- Fornecedores (globais — compartilhados entre todas as expedições)
CREATE TABLE IF NOT EXISTS fornecedores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  contato        TEXT NOT NULL DEFAULT '',
  telefone       TEXT NOT NULL DEFAULT '',
  cidade         TEXT NOT NULL DEFAULT '',
  observacoes    TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);

-- Custos (itens de custo reais de cada expedição — editáveis, com status e fornecedor)
CREATE TABLE IF NOT EXISTS custos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  ordem          INTEGER,
  item           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  quantidade     REAL NOT NULL DEFAULT 1,
  valor          REAL,                             -- valor total do item, em reais
  fornecedor_id  INTEGER,                          -- vínculo com fornecedores (opcional)
  status         TEXT NOT NULL DEFAULT 'pendente', -- pago | andamento | pendente
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_custos_evento ON custos(evento_id);
CREATE INDEX IF NOT EXISTS idx_custos_forn   ON custos(fornecedor_id);
