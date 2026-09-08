-- ============================================================
-- Cadastro da Origens · acrescenta PILOTO / ACOMPANHANTE
--
-- Pedido do cliente em 08/09/2026: "uma opção do cliente colocar se é piloto ou
-- acompanhante e o nome do piloto caso for acompanhante".
--
-- Entram duas perguntas depois do nome:
--   tipo_participante — escolha Piloto | Acompanhante (obrigatória)
--   piloto_nome       — texto, CONDICIONAL: só aparece, e só é obrigatório,
--                       quando tipo_participante = "Acompanhante"
--
-- É UPDATE e não INSERT de propósito: o formulário já está no ar e já tem
-- resposta gravada. Recriar mudaria o link e o token, e quem já respondeu
-- ficaria num formulário órfão. As respostas antigas continuam válidas — o
-- CSV mostra coluna vazia para quem respondeu antes das perguntas existirem.
--
-- Aplicar:
--   npx wrangler d1 execute eventos --remote --file=upd_cadastro_piloto.sql
-- ============================================================

UPDATE cardapio_forms
   SET perguntas = '[{"id":"nome_completo","rotulo":"Nome completo","tipo":"texto","obrigatorio":true},{"id":"tipo_participante","rotulo":"Você vai como","tipo":"escolha","opcoes":["Piloto","Acompanhante"],"obrigatorio":true},{"id":"piloto_nome","rotulo":"Nome do piloto","tipo":"texto","obrigatorio":true,"ajuda":"Quem vai pilotar o UTV em que você vai","depende":{"campo":"tipo_participante","valor":"Acompanhante"}},{"id":"cpf","rotulo":"CPF","tipo":"cpf","obrigatorio":true},{"id":"rg","rotulo":"RG","tipo":"texto","obrigatorio":true,"ajuda":"Número e órgão emissor, se estiver à mão"},{"id":"endereco","rotulo":"Endereço — rua e número","tipo":"texto","obrigatorio":true,"ajuda":"Inclua complemento e bairro, se houver"},{"id":"cep","rotulo":"CEP","tipo":"cep","obrigatorio":true},{"id":"nacionalidade","rotulo":"Nacionalidade","tipo":"texto","obrigatorio":true,"ajuda":"Ex.: brasileira"},{"id":"estado_civil","rotulo":"Estado civil","tipo":"escolha","opcoes":["Solteiro(a)","Casado(a)","União estável","Divorciado(a)","Viúvo(a)"],"obrigatorio":true}]'
 WHERE slug = 'cadastro-origens';
