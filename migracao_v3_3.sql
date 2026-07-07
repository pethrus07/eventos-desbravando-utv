-- ============================================================
-- Migração v3.2 → v3.3 — Simulação como modelo reutilizável
-- APENAS para quem já tem o banco no ar. (instalação nova usa o schema.sql)
-- Aditiva: só adiciona a coluna 'modelo' em cenarios (default 0).
-- Rodar UMA VEZ:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_3.sql
-- ============================================================
ALTER TABLE cenarios ADD COLUMN modelo INTEGER NOT NULL DEFAULT 0;
