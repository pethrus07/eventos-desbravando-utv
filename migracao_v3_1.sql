-- ============================================================
-- Migração v3 → v3.1 — APENAS para quem já tem o banco no ar.
-- (instalação nova não precisa: o schema.sql já cria tudo)
-- Rodar UMA VEZ:
--   npx wrangler d1 execute eventos --remote --file=migracao_v3_1.sql
-- ============================================================
ALTER TABLE clientes ADD COLUMN contato_id INTEGER;
ALTER TABLE crm_contatos ADD COLUMN cpf TEXT NOT NULL DEFAULT '';
ALTER TABLE crm_contatos ADD COLUMN camiseta TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_cli_contato ON clientes(contato_id);
