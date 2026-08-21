-- ============================================================
-- v4.4 — sobretítulo do formulário de cardápio
--
-- Linha curta acima do título, no cabeçalho da página pública:
-- "3ª Expedição Família · Urubici SC · 26 a 30 de agosto".
-- Dá contexto a quem abre o link sem saber de onde veio.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_4.sql
-- ============================================================

ALTER TABLE cardapio_forms ADD COLUMN sobretitulo TEXT NOT NULL DEFAULT '';
