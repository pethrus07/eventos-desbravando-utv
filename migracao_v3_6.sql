-- ============================================================
-- v3.6 · Tarefas gerais: reordenar (ordem) + horário + subtarefas
-- Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_6.sql
-- ============================================================

-- Ordem manual (arrastar) e horário livre nas tarefas gerais
ALTER TABLE tarefas ADD COLUMN ordem   INTEGER;
ALTER TABLE tarefas ADD COLUMN horario TEXT NOT NULL DEFAULT '';

-- Subtarefas simples de uma tarefa geral (título + concluído)
CREATE TABLE IF NOT EXISTS subtarefas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id  INTEGER NOT NULL,
  ordem      INTEGER,
  titulo     TEXT NOT NULL,
  concluido  INTEGER NOT NULL DEFAULT 0,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa ON subtarefas(tarefa_id);
