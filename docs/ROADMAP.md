# Roadmap · Controle de Eventos

> **Este arquivo é a verdade do que vem pela frente.** Sprint que termina é marcado aqui,
> no mesmo commit que entrega. Plano que vive só na cabeça volta a ser discutido toda semana.

Escrito em **13/10/2026**, logo depois de o acordo de R$ 500/mês ser aceito.

---

## Por que existe

O acordo que vale a partir de **26/10/2026** cobra **R$ 500/mês** por um trabalho que hoje
consome **15,9 h/mês**. Isso dá R$ 31/h — menos da metade do piso de R$ 70. O valor só fecha
se o tempo cair para cerca de **6,5 h/mês**, e esse corte não vem de esforço: vem do que está
neste roadmap.

**Cada mês sem o sistema custa cerca de R$ 600** em hora de trabalho não remunerada. O prazo
não é administrativo — é dinheiro correndo.

Em paralelo, e no mesmo worker, há uma dívida de segurança que o acordo tornou urgente: o
cliente vai passar a operar mais pelo sistema e menos por mensagem, então a superfície de
erro cresce junto.

## O estado de hoje, medido em 13/10/2026

| | |
|---|---|
| ferramentas no conector MCP | **33**, das quais **4 destroem** e nenhuma pede confirmação |
| rotas de escrita no painel | **71** |
| checagens de papel `admin` na API | **1**, em 1.379 linhas |
| `DELETE /api/eventos/:id` | **não checa papel nenhum** — a chave de equipe apaga a expedição em cascata, com CPF dentro |
| registro de ações | a tabela `historico` existe em produção com **0 linhas**, e **nem está no `schema.sql`** |
| deriva de schema | 44 tabelas em produção contra **24** no `schema.sql` |

O papel hoje tem **um eixo só: sigilo**. `admin` × `equipe` decide quem vê CPF, custo e CRM.
Não decide o que pode ser destruído, criado em massa, nem o que vira trabalho da RYZE.

## A régua: o que conta como pronto

Sprint sem portão verificável não termina, só para de ser mencionado. Cada um abaixo tem um
**portão** que é uma observação, não uma opinião: ou o comando responde o esperado, ou não.

- nada entra em produção sem `node tools/checar-antes-do-deploy.mjs` verde;
- mudança de estrutura em produção pede `wrangler d1 export` antes — **dado é o que não volta**;
- toda tabela nova entra no `schema.sql` no mesmo commit, para a deriva parar de crescer.

---

## S0 · Fechar a porta aberta
**13–14/10 · 1–2 h · risco vivo, independe de tudo**

A chamada mais destrutiva do sistema não tem guarda. Isso não é parte da negociação nem do
Briefing: é defeito num sistema com 259 clientes e CPF dentro, operado por três pessoas.

- guarda de `admin` em `DELETE /api/eventos/:id`
- confirmação explícita: o nome do evento tem de vir no pedido, senão 400
- a mesma trava em qualquer outra rota de cascata que apareça na varredura

**Portão:** com a chave de equipe, a chamada responde **403**; com a chave admin sem
confirmação, **400**; com confirmação, apaga. Os três casos conferidos por `curl`.

## S1 · Saber quem fez o quê
**15–19/10 · 3–4 h**

Sem registro, nenhuma regra dos sprints seguintes é auditável — e hoje não há nenhum. A
tabela já existe em produção e nunca foi escrita.

- `historico` entra no `schema.sql` (hoje só existe no backup)
- toda escrita, pelas **duas** portas, grava: quando, papel, porta, rota ou ferramenta, alvo e
  um resumo do que mudou
- aba de histórico no painel, filtrável por dia e por papel

**Portão:** 5 ações pelo painel e 5 pelo Claude; as 10 aparecem no histórico, com o papel
certo e a porta certa.

> **20–26/10 — Expedição Origens. Semana sem sprint.** O sistema vai estar em uso de campo e
> o Pedro em plantão. Semana de observar, não de mexer.

## S2 · O briefing nasce
**27/10–02/11 · 8–10 h · é aqui que o dinheiro está**

O catálogo de 10 peças deixa de ser texto no acordo e vira estrutura. E o briefing nasce
**meio preenchido**: datas, dias, programação, cardápio e bebidas já estão no banco — a maior
parte do tempo gasto hoje é recolher e transcrever informação que o sistema já tem.

- tabelas `catalogo_pecas`, `briefing`, `briefing_campos` (no `schema.sql`, com migração)
- o catálogo vive no **banco**, não no código: cliente e RYZE olham para a mesma lista
- pré-preenchimento a partir da expedição
- aba **Briefing** no painel: ver, completar, fechar

**Portão:** abrir o briefing de uma expedição real e encontrar **pelo menos 60% dos campos já
preenchidos** sem ninguém ter digitado nada.

## S3 · O Claude do cliente entra
**03–09/11 · 6–8 h · fecha a promessa de "briefing no ar em novembro"**

- `abrir_briefing`, `ver_briefing`, `preencher_briefing`, `fechar_briefing`, `baixar_pecas`
- `fechar_briefing` **valida a completude e trava** — é o instante em que o prazo começa a
  correr, e é a cláusula do acordo virando código
- `registrar_pedido_extra`: cria **orçamento pendente**, inerte. Não existe verbo para "faça
  isto para mim" fora do catálogo — a trava é a **ausência do verbo**, não uma regra escrita
- a instrução que o cliente cola no Claude dele
- tipos novos entram na lista `AMOSTRAS` da trava de deploy **no mesmo commit**

**Portão:** pelo Claude, abrir → preencher → fechar um briefing completo sem tocar no painel.
E pedir uma peça fora do catálogo: tem de voltar orçamento pendente, nunca trabalho iniciado.

## S4 · A chave da RYZE e a infra do cliente
**10–16/11 · 4–5 h · fecha a promessa de "infraestrutura migrada em novembro"**

Hoje a `APP_KEY` é do cliente e o Pedro usa a chave dele: qualquer trava em "admin" trava os
dois. E a infra sai do preço pelo acordo.

- `RYZE_KEY` → papel `ryze`, **sem dado pessoal por padrão** (operador não é controlador —
  tira o Pedro da linha de frente da LGPD, e isso está escrito no acordo)
- escalada explícita e registrada quando precisar depurar com dado real
- migração de Workers, D1 e R2 para a conta Cloudflare do cliente
- combinar **antes** quem fica com cada chave depois da migração

**Portão:** com a `RYZE_KEY`, `listar_participantes` nega e o histórico registra a tentativa;
com a `APP_KEY`, responde. E `wrangler whoami` aponta para a conta do cliente.

## S5 · Nada mais some
**17–23/11 · 5–6 h**

- exclusão vira **arquivamento** em todas as entidades; `eventos.arquivado` já existe
- lixeira no painel, com restaurar
- destrutivo de verdade passa a ser privilégio de `admin` + confirmação em duas etapas: a
  primeira chamada devolve **o que será apagado** e um `token_confirmacao`; só a segunda
  executa — é o que impede um assistente de decidir sozinho, porque o resumo passa por um
  humano no meio

**Portão:** apagar um item e restaurá-lo pelo painel. E `grep -n "DELETE FROM" worker.js` não
encontra nenhuma linha no caminho do usuário comum.

## S6 · A regra desce para baixo das duas portas
**24–30/11 · 7–8 h**

Regra que mora só no `mcp.js` é teatro: o painel é a porta **mais larga** — tem 71 rotas de
escrita e a cascata que o MCP nem expõe.

- `regras.js` entre as rotas e o D1; `mcp.js` e `worker.js` viram consumidores
- cada ferramenta e cada rota declara seu `efeito`: `leitura` · `escrita` · `destrutivo` · `pedido`
- matriz papel × efeito, num lugar só
- teto por chamada e por janela nos `criar_*`, contra laço de assistente

**Portão:** uma tabela de teste percorre cada par (papel, efeito) e confere o veredito. E a
mesma ação negada no MCP é negada no painel — conferido nas duas portas, não numa.

## S7 · A volta: o lote e a entrega
**01–14/12 · 10–12 h · fecha a promessa de "entrega pelo painel em dezembro"**

- `render.mjs expedicao --evento=N` lê o briefing **fechado** e produz o catálogo inteiro
- a esteira `/qa` roda no lote: nenhuma peça chega ao cliente sem ter sido medida
- as peças sobem para o R2 e aparecem para download no painel

**Portão:** um comando produz as 10 peças de uma expedição real, todas medidas, e elas
aparecem no painel do cliente. **E o tempo gasto nesse lote é cronometrado** — é o número que
diz se os R$ 500 fecham. Se der mais que 3 h, o modelo precisa de outra volta, não de mais
esforço.

---

## A conta

| | horas |
|---|---:|
| S0 · trava do DELETE | 1–2 |
| S1 · registro | 3–4 |
| S2 · briefing no banco | 8–10 |
| S3 · Claude do cliente | 6–8 |
| S4 · chave RYZE + infra | 4–5 |
| S5 · arquivamento | 5–6 |
| S6 · regras nas duas portas | 7–8 |
| S7 · lote e entrega | 10–12 |
| **total** | **44–55** |

Investimento da RYZE, não cobrança do cliente: cobrar a ferramenta que barateia o cliente não
se defende. Paga-se em menos de seis meses só com o tempo economizado neste cliente, e o
núcleo serve os próximos.

## O que fica de fora

- **reescrever o painel.** O `ui.html` continua como está; os sprints mexem em regra e em
  módulo novo, não em redesenho.
- **fechar a deriva de schema inteira** (44 tabelas em produção × 24 no arquivo). Cada sprint
  traz para o `schema.sql` só o que tocar. Fechar tudo de uma vez é outro projeto.
- **CRM**, morto desde 04/07. Enquanto ninguém usar, não entra em roadmap.

## Riscos

| risco | o que fazer |
|---|---|
| **S7 medir mais que 3 h por lote** | o acordo não fecha. Por isso o portão do S7 é cronometrado: descobrir em dezembro é caro, descobrir em março é pior |
| **Migração de infra no meio da temporada** | S4 cai depois da Origens e antes da virada do ciclo; backup e janela combinada com o cliente |
| **O cliente não usar o briefing** | é a hipótese central do acordo. O sinal de alerta é a primeira expedição em que o pedido voltar a chegar por mensagem — e a resposta é conversa, não exceção silenciosa |
| **Expedição fora de hora** | semana de expedição é semana sem sprint. Duas expedições no mesmo mês empurram o roadmap, e isso é esperado |
