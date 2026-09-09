-- ============================================================
-- Cadastro da Origens · TELEFONE, CAMISETA, EMERGÊNCIA e o e-mail condicional
--
-- Pedido do cliente em 09/09/2026 (segunda leva do dia):
--   telefone · tamanho da camiseta (P a G4) · nome e telefone de emergência
--   tirar a frase de que o contrato vai por e-mail
--   e-mail só é necessário para quem paga por BOLETO
--
-- ⚠️ O e-mail virou pergunta CONDICIONAL da forma de pagamento, e isso obrigou a
-- REORDENAR o formulário: a dependência só pode apontar para pergunta que já veio
-- antes (senão o campo ficaria invisível para sempre), então o bloco de pagamento
-- subiu e o e-mail passou a ser o último campo. Também lê melhor assim: escolheu
-- boleto, então me dê o e-mail.
--
-- Consequência a ter em mente: quem paga por Pix não deixa e-mail nenhum. O contato
-- desse cliente passa a ser o TELEFONE, que entrou nesta mesma leva — as duas
-- mudanças se encaixam.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=upd_cadastro_v3.sql
-- ============================================================

UPDATE cardapio_forms
   SET perguntas = '[{"id":"nome_completo","rotulo":"Nome completo","tipo":"texto","obrigatorio":true},{"id":"tipo_participante","rotulo":"Você vai como","tipo":"escolha","opcoes":["Piloto","Acompanhante"],"obrigatorio":true},{"id":"piloto_nome","rotulo":"Nome do piloto","tipo":"texto","obrigatorio":true,"ajuda":"Quem vai pilotar o UTV em que você vai","depende":{"campo":"tipo_participante","valor":"Acompanhante"}},{"id":"telefone","rotulo":"Telefone","tipo":"telefone","obrigatorio":true,"ajuda":"Com WhatsApp, se tiver"},{"id":"cpf","rotulo":"CPF","tipo":"cpf","obrigatorio":true},{"id":"rg","rotulo":"RG","tipo":"texto","obrigatorio":true,"ajuda":"Número e órgão emissor, se estiver à mão"},{"id":"endereco","rotulo":"Endereço — rua e número","tipo":"texto","obrigatorio":true,"ajuda":"Inclua complemento e bairro, se houver"},{"id":"cep","rotulo":"CEP","tipo":"cep","obrigatorio":true},{"id":"nacionalidade","rotulo":"Nacionalidade","tipo":"texto","obrigatorio":true,"ajuda":"Ex.: brasileira"},{"id":"estado_civil","rotulo":"Estado civil","tipo":"escolha","opcoes":["Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Viúvo(a)"],"obrigatorio":true},{"id":"camiseta","rotulo":"Tamanho da camiseta","tipo":"escolha","opcoes":["P","M","G","GG","XG","XXG","G2","G3","G4"],"obrigatorio":true,"ajuda":"A expedição inclui 2 camisetas personalizadas"},{"id":"emergencia_nome","rotulo":"Contato de emergência — nome","tipo":"texto","obrigatorio":true,"ajuda":"Quem a gente aciona se precisar"},{"id":"emergencia_telefone","rotulo":"Contato de emergência — telefone","tipo":"telefone","obrigatorio":true},{"id":"info_pagamento","rotulo":"Pacote completo · R$ 2.300 por pessoa","tipo":"informe","ajuda":"A última parcela precisa ser paga antes da data da expedição."},{"id":"forma_pagamento","rotulo":"Forma de pagamento","tipo":"escolha","opcoes":["Pix","2x no boleto"],"notas":{"2x no boleto":"Vencimentos em 15/09 e 15/10."},"obrigatorio":true},{"id":"email","rotulo":"E-mail","tipo":"email","obrigatorio":true,"ajuda":"Para o envio do boleto","depende":{"campo":"forma_pagamento","valor":"2x no boleto"}}]'
 WHERE slug = 'cadastro-origens';
