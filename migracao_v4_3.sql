-- ============================================================
-- v4.3 — FORMULÁRIO DE CARDÁPIO (público, com link)
--
-- Cada evento pode ter um formulário aberto para as famílias
-- responderem sobre o cardápio. O link é público (sem chave);
-- as respostas caem aqui e saem em planilha (CSV).
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_3.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS cardapio_forms (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  -- pedaço do link público: /cardapio/<slug>
  slug           TEXT NOT NULL UNIQUE,
  titulo         TEXT NOT NULL DEFAULT 'Cardápio da expedição',
  subtitulo      TEXT NOT NULL DEFAULT '',
  descricao      TEXT NOT NULL DEFAULT '',
  -- perguntas em JSON: [{id,rotulo,tipo,opcoes[],obrigatorio,ajuda}]
  -- tipo: texto | numero | escolha | multi | sim_nao | obs
  perguntas      TEXT NOT NULL DEFAULT '[]',
  aberto         INTEGER NOT NULL DEFAULT 1,
  prazo          TEXT NOT NULL DEFAULT '',
  agradecimento  TEXT NOT NULL DEFAULT '',
  -- token do CSV: deixa a planilha do Google puxar sem expor a chave do sistema
  token_planilha TEXT NOT NULL,
  criado_em      TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS cardapio_respostas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id    INTEGER NOT NULL REFERENCES cardapio_forms(id) ON DELETE CASCADE,
  -- respostas em JSON: {id_da_pergunta: valor}
  respostas  TEXT NOT NULL DEFAULT '{}',
  -- desnormalizado só para listar e ordenar rápido
  nome       TEXT NOT NULL DEFAULT '',
  contato    TEXT NOT NULL DEFAULT '',
  criado_em  TEXT DEFAULT (datetime('now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_cardapio_forms_evento ON cardapio_forms(evento_id);
CREATE INDEX IF NOT EXISTS idx_cardapio_respostas_form ON cardapio_respostas(form_id, id DESC);
