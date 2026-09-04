-- ============================================================
-- FORMULÁRIO DE CADASTRO — Expedição Origens (23–25/10/2026)
--
-- Pedido do cliente em 04/09/2026: mesmo estilo dos anteriores, para os
-- clientes preencherem os dados que ele precisa para o cadastro e o
-- contrato. Amarrado ao evento 27 ("Origens", 23/10) — é a expedição que
-- está recebendo reserva; os outros formulários são do evento 12 (Urubici).
--
-- DADO SENSÍVEL. Este é o primeiro formulário que coleta CPF, RG e
-- endereço. A promessa do rodapé é específica: uso para cadastro e
-- contrato, e nada além disso. E o token do CSV passa a ser credencial de
-- verdade — quem tiver o link baixa o CPF de todo mundo. Ver a nota no
-- README antes de colar a fórmula em planilha compartilhada.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=seed_cadastro_origens.sql
-- ============================================================

INSERT INTO cardapio_forms
  (evento_id, slug, titulo, sobretitulo, subtitulo, descricao, perguntas,
   aberto, prazo, agradecimento, nota_rodape, token_planilha)
VALUES (
  27,
  'cadastro-origens',
  'Seus dados para a reserva',
  'Expedição Origens · 23 a 25 de outubro',
  'Precisamos de alguns dados para finalizar sua reserva, fazer o seu cadastro e preparar o contrato.',
  '',
  '[{"id":"nome_completo","rotulo":"Nome completo","tipo":"texto","obrigatorio":true},{"id":"cpf","rotulo":"CPF","tipo":"cpf","obrigatorio":true},{"id":"rg","rotulo":"RG","tipo":"texto","obrigatorio":true,"ajuda":"Número e órgão emissor, se estiver à mão"},{"id":"endereco","rotulo":"Endereço — rua e número","tipo":"texto","obrigatorio":true,"ajuda":"Inclua complemento e bairro, se houver"},{"id":"cep","rotulo":"CEP","tipo":"cep","obrigatorio":true},{"id":"nacionalidade","rotulo":"Nacionalidade","tipo":"texto","obrigatorio":true,"ajuda":"Ex.: brasileira"},{"id":"estado_civil","rotulo":"Estado civil","tipo":"escolha","opcoes":["Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Viúvo(a)"],"obrigatorio":true}]',
  1,
  '',
  'Recebemos seus dados. A equipe da Desbravando segue com o cadastro e o contrato.',
  'Estes dados são usados apenas para o seu cadastro e para preparar o contrato desta expedição. Não são publicados nem repassados para terceiros.',
  'ac0e6d9bc4084c86874a17b4b8f445d9'
);
