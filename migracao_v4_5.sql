-- ============================================================
-- v4.5 — NOTA DE RODAPÉ POR FORMULÁRIO
--
-- O rodapé do formulário público prometia, em texto fixo no código:
-- "Usamos estas respostas só para planejar a alimentação da expedição.
--  Nada é publicado nem repassado para terceiros."
--
-- Isso nasceu correto para o cardápio e fica ERRADO em qualquer outro
-- formulário. No de avaliação chega a ser um problema: promete que nada
-- é publicado justamente onde o cliente pode querer publicar o elogio.
-- A promessa passa a ser dado do formulário.
--
-- O UPDATE preserva a promessa original nos formulários que já existem —
-- quem respondeu o cardápio leu aquele texto, e ele continua valendo.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_5.sql
-- ============================================================

ALTER TABLE cardapio_forms ADD COLUMN nota_rodape TEXT NOT NULL DEFAULT '';

UPDATE cardapio_forms
   SET nota_rodape = 'Usamos estas respostas só para planejar a alimentação da expedição. Nada é publicado nem repassado para terceiros.'
 WHERE nota_rodape = '';
