-- ============================================================
-- Cadastro da Origens · E-MAIL + VALOR + FORMA DE PAGAMENTO
--
-- Pedido do cliente em 09/09/2026:
--   e-mail · valor do pacote R$ 2.300 · Pix ou 2x no boleto (15/09 e 15/10)
--   OBS: a última parcela tem de ser paga antes da data da expedição
--
-- Como entrou:
--   e-mail          -> campo novo, tipo `email`, validado no servidor e guardado em
--                      minúsculas (o contrato sai por e-mail; typo = contrato que não chega)
--   valor + OBS     -> `informe`: painel de informação dentro do formulário. Não é campo,
--                      ninguém digita o preço que vai pagar, e não vira coluna na planilha
--   forma de pagto  -> escolha Pix | 2x no boleto, com os vencimentos como nota da opção
--
-- ⚠️ As datas 15/09 e 15/10 são FIXAS no texto. Depois de 15/09 elas ficam vencidas para
-- quem preencher — trocar aqui quando virar, ou passar para "1ª na contratação, 2ª em 15/10".
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=upd_cadastro_pagamento.sql
-- ============================================================

UPDATE cardapio_forms
   SET perguntas = '[{"id":"nome_completo","rotulo":"Nome completo","tipo":"texto","obrigatorio":true},{"id":"tipo_participante","rotulo":"Você vai como","tipo":"escolha","opcoes":["Piloto","Acompanhante"],"obrigatorio":true},{"id":"piloto_nome","rotulo":"Nome do piloto","tipo":"texto","obrigatorio":true,"ajuda":"Quem vai pilotar o UTV em que você vai","depende":{"campo":"tipo_participante","valor":"Acompanhante"}},{"id":"cpf","rotulo":"CPF","tipo":"cpf","obrigatorio":true},{"id":"rg","rotulo":"RG","tipo":"texto","obrigatorio":true,"ajuda":"Número e órgão emissor, se estiver à mão"},{"id":"endereco","rotulo":"Endereço — rua e número","tipo":"texto","obrigatorio":true,"ajuda":"Inclua complemento e bairro, se houver"},{"id":"cep","rotulo":"CEP","tipo":"cep","obrigatorio":true},{"id":"nacionalidade","rotulo":"Nacionalidade","tipo":"texto","obrigatorio":true,"ajuda":"Ex.: brasileira"},{"id":"estado_civil","rotulo":"Estado civil","tipo":"escolha","opcoes":["Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Viúvo(a)"],"obrigatorio":true},{"id":"email","rotulo":"E-mail","tipo":"email","obrigatorio":true,"ajuda":"É por aqui que o contrato vai ser enviado"},{"id":"info_pagamento","rotulo":"Pacote completo · R$ 2.300 por pessoa","tipo":"informe","ajuda":"A última parcela precisa ser paga antes da data da expedição."},{"id":"forma_pagamento","rotulo":"Forma de pagamento","tipo":"escolha","opcoes":["Pix","2x no boleto"],"notas":{"2x no boleto":"Vencimentos em 15/09 e 15/10."},"obrigatorio":true}]'
 WHERE slug = 'cadastro-origens';
