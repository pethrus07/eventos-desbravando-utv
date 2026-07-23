-- ============================================================
-- v4.2 · Conector MCP (OAuth 2.1 para claude.ai)
--
-- Tabelas de apoio ao servidor MCP remoto que deixa o Claude do
-- cliente conversar com o sistema. Só guardam registros do OAuth
-- (clientes dinâmicos e códigos de autorização de curta duração).
-- Os tokens em si são assinados (stateless), não ficam em tabela.
--
-- Aditivo. Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_2.sql
-- ============================================================

-- Clientes registrados via Dynamic Client Registration (RFC 7591).
CREATE TABLE IF NOT EXISTS mcp_clients (
  client_id     TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL DEFAULT '[]',   -- JSON array de URIs permitidas
  nome          TEXT NOT NULL DEFAULT '',
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Códigos de autorização (Authorization Code + PKCE), curta duração.
CREATE TABLE IF NOT EXISTS mcp_codes (
  code           TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  redirect_uri   TEXT NOT NULL,
  code_challenge TEXT NOT NULL DEFAULT '',
  papel          TEXT NOT NULL DEFAULT 'equipe',  -- admin | equipe
  expira_em      INTEGER NOT NULL                 -- epoch segundos
);
