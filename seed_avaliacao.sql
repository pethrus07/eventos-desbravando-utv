-- ============================================================
-- FORMULÁRIO DE AVALIAÇÃO DA EXPEDIÇÃO
--
-- Pedido do cliente em 03/09/2026: "no mesmo estilo do cardápio, para os
-- clientes avaliarem a expedição — nome, nota, comentário". Três campos, e
-- só esses três: formulário de avaliação com mais campos é formulário que
-- ninguém termina.
--
-- Depende da migração v4.5 (coluna nota_rodape). Aplicar nesta ordem:
--   npx wrangler d1 execute eventos --remote --file=migracao_v4_5.sql
--   npx wrangler d1 execute eventos --remote --file=seed_avaliacao.sql
--   npx wrangler deploy -c wrangler.cardapio.toml
--   npx wrangler deploy                      (painel + API)
--
-- O evento sai do MESMO evento do último formulário de cardápio, que é a
-- expedição que acabou de acontecer. Se for para avaliar outra, trocar o
-- evento_id à mão antes de aplicar.
--
-- A promessa do rodapé é diferente da do cardápio de propósito: prometer
-- que "nada é publicado" num formulário de avaliação impediria usar o
-- elogio depois. Aqui a promessa é pedir autorização antes de publicar.
-- ============================================================

INSERT INTO cardapio_forms
  (evento_id, slug, titulo, sobretitulo, subtitulo, descricao, perguntas,
   aberto, prazo, agradecimento, nota_rodape, token_planilha)
VALUES (
  (SELECT evento_id FROM cardapio_forms ORDER BY id DESC LIMIT 1),
  'avaliacao-expedicao',
  'Avaliação da expedição',
  'Desbravando UTV',
  'Dois minutos, três campos. Sua opinião é o que faz a próxima expedição ser melhor que esta.',
  '',
  '[{"id":"nome","rotulo":"Seu nome","tipo":"texto","obrigatorio":true},{"id":"nota","rotulo":"Sua nota para a expedição","tipo":"nota","escala":5,"pontas":["Não gostei","Perfeita"],"obrigatorio":true},{"id":"comentario","rotulo":"Comentário","tipo":"obs","ajuda":"Conte o que funcionou e o que a gente pode melhorar — é isso que a equipe lê."}]',
  1,
  '',
  'Obrigado! Sua avaliação chegou para a equipe da Desbravando.',
  'Sua avaliação vai direto para a equipe da Desbravando. Se a gente quiser publicar seu comentário, pedimos sua autorização antes.',
  '57d6d52f33be4253b2b104cc976f6416'
);
