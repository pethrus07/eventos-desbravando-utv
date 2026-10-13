-- v4.6 · AUDITORIA (S1 do docs/ROADMAP.md, 13/10/2026)
--
-- Registro de quem fez o quê, pelas duas portas (painel e conector MCP). Até aqui nenhuma
-- escrita deixava rastro: se metade de um checklist sumisse, não havia como saber por onde
-- nem com qual chave.
--
-- Tabela NOVA, e não a `historico` que já existe: aquela é feed de comentário por item
-- (parent_tipo/parent_id/texto), feita para a pessoa anotar algo num item. Misturar as duas
-- faria o painel mostrar auditoria como recado, e um dia alguém apagaria o log achando que
-- era nota velha.
--
-- 🛑 Corpo de requisição NUNCA entra aqui: o sistema guarda CPF, RG, endereço e forma de
-- pagamento, e copiar isso para o log duplicaria dado pessoal num lugar com outra régua de
-- acesso. Guarda-se O QUE foi feito e em qual alvo, nunca o conteúdo.
--
-- Aplicar:  npx wrangler d1 execute eventos --remote --file=migracao_v4_6.sql
-- Antes:    npx wrangler d1 export eventos --remote --output backup.sql

CREATE TABLE IF NOT EXISTS auditoria (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  quando    TEXT NOT NULL DEFAULT (datetime('now')),
  papel     TEXT NOT NULL,              -- admin | equipe   (ryze entra no S4)
  porta     TEXT NOT NULL,              -- painel | mcp
  acao      TEXT NOT NULL,              -- "DELETE /api/eventos/12" ou "excluir_tarefa"
  alvo      TEXT,                       -- id, slug ou nome curto do alvo
  resumo    TEXT,                       -- contexto curto, escrito à mão, SEM dado de pessoa
  resultado TEXT NOT NULL               -- ok | negado | recusado | erro
);

CREATE INDEX IF NOT EXISTS idx_auditoria_quando ON auditoria(quando DESC);
