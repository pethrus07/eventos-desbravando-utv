-- ============================================================
-- FORMULÁRIO DAS BEBIDAS DO COOLER — Expedição Origens
--
-- Pedido do cliente em 16/09/2026: formulário para o cliente escolher as bebidas do
-- cooler, com a regra de funcionamento explícita — "ao selecionar a bebida, na
-- sequência escolher a quantidade".
--
-- Como isso virou estrutura: UMA pergunta de múltipla escolha com as seis bebidas, e
-- SEIS perguntas de quantidade, cada uma condicionada à sua própria bebida estar
-- marcada. Quem marca duas bebidas vê dois campos de quantidade, e só esses dois são
-- obrigatórios. É o mesmo mecanismo do "nome do piloto" do cadastro, agora valendo
-- também para caixa de seleção.
--
-- A frase de responsabilidade entra como tipo `aviso`: pequeno, mas com filete e cor
-- cheia. Não foi para a `nota_rodape` porque aquela linha é a promessa de privacidade,
-- no tom mais apagado da página — e "se beber, não pilote" não é letra miúda.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=seed_bebidas_origens.sql
-- ============================================================

INSERT INTO cardapio_forms
  (evento_id, slug, titulo, sobretitulo, subtitulo, descricao, perguntas,
   aberto, prazo, agradecimento, nota_rodape, token_planilha)
VALUES (
  27,
  'bebidas-origens',
  'Bebidas do seu cooler',
  'Expedição Origens · 23 a 25 de outubro',
  'Marque o que você quer levar e a quantidade de cada item. É isso que a equipe coloca no seu cooler.',
  '',
  '[{"id":"nome_completo","rotulo":"Nome completo","tipo":"texto","obrigatorio":true},{"id":"bebidas","rotulo":"O que vai no seu cooler","tipo":"multi","opcoes":["Água sem gás","Coca-Cola normal 200ml","Coca-Cola zero 200ml","Guaraná 200ml","Cerveja Heineken 350ml","Cerveja Original 350ml"],"obrigatorio":true,"ajuda":"Marque tudo que você quer — a quantidade de cada um aparece em seguida"},{"id":"qtd_agua","rotulo":"Água sem gás — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Água sem gás"}},{"id":"qtd_coca","rotulo":"Coca-Cola normal 200ml — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Coca-Cola normal 200ml"}},{"id":"qtd_coca_zero","rotulo":"Coca-Cola zero 200ml — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Coca-Cola zero 200ml"}},{"id":"qtd_guarana","rotulo":"Guaraná 200ml — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Guaraná 200ml"}},{"id":"qtd_heineken","rotulo":"Cerveja Heineken 350ml — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Cerveja Heineken 350ml"}},{"id":"qtd_original","rotulo":"Cerveja Original 350ml — quantas unidades","tipo":"numero","obrigatorio":true,"depende":{"campo":"bebidas","valor":"Cerveja Original 350ml"}},{"id":"aviso_responsabilidade","rotulo":"Aproveite seu cooler com responsabilidade. Se beber, não pilote.","tipo":"aviso"}]',
  1,
  '',
  'Anotado! Seu cooler já entrou na lista da equipe.',
  'Usamos estas respostas só para montar os coolers da expedição. Nada é publicado nem repassado para terceiros.',
  '0659e7241cb8c55fad08acbec86e0cbc'
);
