-- ============================================================
-- v3.5 · Checklist: horário nos itens + subtarefas simples
-- Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_5.sql
-- ============================================================

-- Horário do item (livre: "14h", "08:30", "após o almoço"…)
ALTER TABLE itens ADD COLUMN horario TEXT NOT NULL DEFAULT '';

-- Subtarefas simples de um item do checklist (título + concluído)
CREATE TABLE IF NOT EXISTS subitens (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   INTEGER NOT NULL,
  ordem     INTEGER,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subitens_item ON subitens(item_id);
