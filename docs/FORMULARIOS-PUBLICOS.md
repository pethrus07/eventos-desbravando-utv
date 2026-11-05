# Formulários públicos e dado sensível

Texto que estava no README até 01/11/2026. O formulário roda no Worker `cardapio` (ver `docs/ARQUITETURA.md` §8 e §11).

- Os dados pessoais reais (CPF, telefone, financeiro, CRM) **nunca entram no git**: ficam num seed ignorado (`seed_dados_reais.sql`) e num banco privado — este repositório é só o código.
- As chaves de acesso são *secrets* do Wrangler, não vão no código nem no HTML; trocar é um comando e desloga quem usava a antiga.
- CPF/telefone e todo o financeiro só aparecem com a chave admin; a equipe opera checklist, hospedagem e tarefas sem ver dado pessoal.
- O formulário de cardápio é a única rota pública que grava **dado de gente** no banco. (O `POST /oauth/register` do conector MCP também grava sem chave, mas só a linha técnica de um cliente OAuth — é o que o registro dinâmico exige, e registrar não dá acesso a nada.) Ele aceita só as perguntas que o formulário declara — campo desconhecido e opção fora da lista são descartados no servidor —, guarda nome e WhatsApp de quem responde e nada mais, e pode ser encerrado com um clique. O CSV para planilha tem token próprio, separado das chaves do sistema: vazou, você gera outro e o antigo morre.

## Os formulários

Os formulários rodam no worker `cardapio` (mesmo banco do sistema). Desde 05/11/2026 o mesmo código também está publicado como `formulario` (`wrangler.formulario.toml`), e é **esse o endereço que se manda daqui em diante**: `formulario.desbravando-utv.workers.dev/<slug>`. O `cardapio` continua no ar porque os links e as fórmulas de planilha já enviados apontam para ele. Publicou um, publica o outro: os dois têm de servir a mesma página (conferido byte a byte nos cinco slugs e no CSV no dia da criação).

| slug | evento | o que coleta |
|---|---|---|
| `jantar-urubici` | Urubici · ago | escolha de jantar das 4 noites |
| `almoco-vinicola` | Urubici · ago | escolha do almoço na vinícola |
| `avaliacao-expedicao` | Urubici · ago | nome, nota de 1 a 5, comentário |
| `cadastro-origens` | Origens · 23–25/10 | **nome, piloto/acompanhante, telefone, CPF, RG, endereço, CEP, nacionalidade, estado civil, camiseta, contato de emergência, forma de pagamento, e-mail** |
| `bebidas-origens` | **Urubici · 16–20/09** | nome, bebidas do cooler e a quantidade de cada uma |
| `cadastro-lencois` | Lençóis Maranhenses · 24–30/05/2027 | os mesmos campos do `cadastro-origens` (criado em 03/11/2026 direto no banco, fora do git, porque o texto traz preço) |

⚠️ **O slug `bebidas-origens` está errado no nome, e fica assim.** O formulário foi criado amarrado à Origens por inferência (a descrição da Origens menciona "bebidas e gelo para trilha") e em 16/09 o cliente corrigiu: os coolers são da **Urubici de Setembro**. O evento e o sobretítulo foram corrigidos, o slug não — o link já estava circulando e tinha resposta de cliente. **Slug é endereço: trocar quebra o link na mão de quem já recebeu**, e isso é pior do que um nome interno feio. Ao criar formulário novo, confirmar o evento ANTES: o nome do slug é a única coisa que não se conserta depois.

⚠️ **O `cadastro-origens` é o primeiro que coleta documento.** Duas consequências práticas:

1. **O token do CSV virou credencial de verdade.** Ele existe porque o `=IMPORTDATA` do
   Google puxa o endereço em texto puro, então não pode ser a `APP_KEY`. Nos formulários de
   cardápio, um token vazado expõe preferência de jantar. Neste, expõe o CPF e o RG de todos
   os clientes. Não colar a fórmula em planilha compartilhada com o grupo, e **trocar o
   token no painel quando o cadastro terminar** — trocar invalida o link antigo, que é o
   objetivo.
2. **As respostas também aparecem no painel**, que é protegido por chave. Para poucos
   clientes, ler ali evita criar a planilha e evita o token circulando.

O CPF é validado pelos dígitos verificadores no servidor (`limparCpf`), e é gravado sempre
no formato `000.000.000-00`, independente de como foi digitado. CPF que não fecha a conta é
tratado como campo não respondido: o formulário recusa e diz que falta o CPF, em vez de
guardar documento quebrado que só apareceria quando o contrato voltasse.

### Pergunta condicional

Uma pergunta pode depender de outra: `depende: { campo, valor }` faz o campo aparecer — e
passar a ser obrigatório — só quando a pergunta de referência tem aquele valor. É o caso do
**nome do piloto** no `cadastro-origens`, que só existe para quem marca "Acompanhante".

Três detalhes que não são óbvios:

- O campo nasce **escondido e sem `required`**. Se nascesse obrigatório e oculto, o navegador
  barraria o envio apontando para um campo que ninguém vê.
- A **barra de progresso reconta o total** a cada passada, sobre os campos visíveis. Com o
  denominador fixo, marcar "Acompanhante" fazia a barra andar para trás.
- No servidor, dependência não satisfeita **apaga o valor** e dispensa o obrigatório. O
  cliente não vê o campo, então não pode ser cobrado por ele — e piloto que mandasse nome de
  piloto, por engano ou não, não sujaria a planilha do cadastro.

O `campo` da dependência é validado contra os ids já aceitos: apontar para uma pergunta que
vem depois, ou que não existe, criaria campo invisível para sempre.

**Vale para múltipla escolha também** (16/09): as seis quantidades do `bebidas-origens` dependem cada uma da sua bebida estar marcada, então quem marca duas vê dois campos e só esses dois são obrigatórios. Duas correções foram necessárias para isso — no cliente, `querySelectorAll` em vez de `querySelector` (com caixa de seleção o primeiro marcado não é o único) e no servidor, `includes` em vez de comparar com `String()` (resposta de múltipla é array, e `String(["a","b"])` nunca ia bater com `"a"`).

**Isso dita a ordem do formulário.** Quando o e-mail passou a depender da forma de pagamento (09/09 — só quem paga por boleto precisa dele), o bloco de pagamento teve de **subir** e o e-mail virou o último campo. Lê melhor assim, por sorte: escolheu boleto, então me dê o e-mail. Mas a restrição é técnica, não estética — pergunta condicional não pode apontar para frente.

⚠️ **Consequência de negócio de uma decisão técnica:** quem paga por Pix não deixa e-mail nenhum. O contato dessa pessoa passa a ser o telefone, que entrou na mesma leva de mudanças. As duas se encaixam por acaso — vale conferir antes de tornar outro campo condicional.
