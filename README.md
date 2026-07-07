# Controle de Eventos · Desbravando UTV

Sistema de gestão para uma operação real de expedições de UTV. Substituiu um
emaranhado de planilhas ("controle geral", "cadastro de clientes", "simulador
de custos") por um app único que a equipe abre no celular, em campo. Roda
inteiro em um **Cloudflare Worker + D1** (SQLite serverless), no plano gratuito
— nada de servidor pra manter.

> Está em produção e é usado no dia a dia. Este repositório é só o código: os
> dados reais (CPF, financeiro, CRM) ficam de fora de propósito — ver
> [Privacidade](#privacidade-lgpd).

## O que ele resolve

A operação vendia expedições, montava checklist de logística, cobrava pacotes
em parcelas, alocava gente em quartos e simulava o custo de cada trilha — tudo
em abas de planilha que ninguém conseguia editar ao mesmo tempo sem quebrar
fórmula. O app junta isso em módulos que conversam entre si e permite que
2–5 pessoas mexam juntas sem se atropelar.

## Arquitetura

- **Um Worker faz as duas pontas:** entrega o front (`ui.html`) na raiz e
  responde à API em `/api/*`. Sem framework — o roteamento é na mão, por regex
  de caminho + método HTTP.
- **Front é uma SPA de arquivo único**, sem build e sem dependência: HTML + CSS
  + JS puro, roteado por hash (`#/`, `#/e/:id/:aba`, `#/tarefas`). Pensado pra
  celular primeiro, porque é onde a equipe usa.
- **Gravação por campo, não por tela.** Cada alteração vira um `PATCH` pequeno
  (um item, um valor), então várias pessoas editando ao mesmo tempo não
  sobrescrevem o trabalho uma da outra. As telas dão um *poll* leve pra refletir
  mudanças dos outros.
- **Acesso por chave, em dois níveis**, sem cadastro de usuário: a chave vai no
  header `x-app-key` e nunca aparece no HTML — fica só no aparelho de quem usa.

## Stack

Cloudflare Workers · D1 (SQLite) · JavaScript sem dependências · Wrangler.

## Módulos

Checklist de logística · Participantes + Financeiro (pacote, pagamentos,
parcelas) · Simulador de custos · Hospedagem (quartos e alocação) · Custos +
Fornecedores (acompanhamento financeiro real por expedição, com status
pago/parcial/pendente) · Tarefas gerais do dia a dia · Mini-CRM (a ficha
central de cada pessoa, ligada às expedições em que ela entrou).

**Dois níveis de acesso:** `APP_KEY` (admin — tudo, inclusive dados pessoais,
financeiro, custos e CRM) e `TEAM_KEY` (equipe — checklist, hospedagem e
tarefas; sem CPF, financeiro nem CRM; opcional).

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `worker.js` | API (`/api/*`) + entrega da interface |
| `ui.html` | Interface completa (SPA de arquivo único) |
| `schema.sql` | Estrutura do banco — rodar uma vez |
| `migracao_v3_*.sql` | Migrações incrementais (cada uma rodada uma vez sobre um banco já no ar) |
| `wrangler.toml` | Configuração do Worker/D1 (o `database_id` é do seu banco) |

> O `seed_dados_reais.sql` (dados reais das planilhas) **não está no repositório**
> e nunca esteve — é ignorado pelo git por conter dados pessoais.

## Rodando / publicando

```bash
npx wrangler login                                    # se ainda não estiver logado
npx wrangler d1 create eventos                        # 1) cria o banco
#   → cole o database_id impresso no wrangler.toml
npx wrangler d1 execute eventos --remote --file=schema.sql   # 2) estrutura
npx wrangler secret put APP_KEY                       # 3) chave admin
npx wrangler secret put TEAM_KEY                      #    chave equipe (opcional)
npx wrangler deploy                                   # 4) publica
```

A URL final (`https://eventos.SEU-USUARIO.workers.dev`) é o app completo — abra,
informe a chave e o seu nome. Para desenvolvimento local: `npx wrangler dev`
(as chaves vão num `.dev.vars`, também fora do git).

## API

Autenticação: header `x-app-key`. Papel "ambos" = admin e equipe; "admin" = só a chave admin.

| Rota | Método | Papel | Faz |
| --- | --- | --- | --- |
| `/api/me` | GET | ambos | Retorna o papel da chave |
| `/api/eventos` | GET | ambos | Lista eventos com progresso e custo total |
| `/api/eventos` | POST | admin | Cria evento; `{copiar_de, limpar_valores}` duplica outro como modelo |
| `/api/eventos/:id` | PATCH / DELETE | admin | Renomeia/arquiva · exclui tudo do evento |
| `/api/eventos/:id/itens` | GET / POST | ambos | Checklist: lista · adiciona |
| `/api/itens/:id` | PATCH / DELETE | ambos | Atualiza · exclui item |
| `/api/eventos/:id/clientes` | GET / POST | admin | Participantes (com soma de pagos) · adiciona |
| `/api/clientes/:id` | GET / PATCH / DELETE | admin | Ficha + pagamentos · atualiza · exclui |
| `/api/clientes/:id/pagamentos` | POST | admin | Registra pagamento `{valor, data, forma}` |
| `/api/pagamentos/:id` | DELETE | admin | Remove pagamento |
| `/api/clientes/:id/notas` | POST | admin | Anotação livre na ficha do participante |
| `/api/cliente-notas/:id` | DELETE | admin | Remove anotação |
| `/api/eventos/:id/cenarios` | GET / POST | admin | Cenários do simulador + linhas · cria (padrão ou `copiar_de`) |
| `/api/cenarios/modelos` | GET | admin | Cenários marcados como modelo, reusáveis entre expedições |
| `/api/cenarios/:id` | PATCH / DELETE | admin | Parâmetros · exclui |
| `/api/cenarios/:id/linhas` | POST | admin | Nova linha de custo |
| `/api/linhas/:id` | PATCH / DELETE | admin | Edita · remove linha |
| `/api/eventos/:id/custos` | GET / POST | admin | Custos reais da expedição (+ lista de staff) · adiciona |
| `/api/eventos/:id/custos/importar` | POST | admin | Gera itens de custo a partir de um cenário do simulador |
| `/api/eventos/:id/custos/reordenar` | POST | admin | Salva a nova ordem (drag & drop) |
| `/api/custos/:id` | PATCH / DELETE | admin | Edita (valor, pago, parcelas, forma, status) · exclui |
| `/api/fornecedores` | GET / POST | admin | Fornecedores globais (com nº de itens e total) · adiciona |
| `/api/fornecedores/:id` | PATCH / DELETE | admin | Edita · exclui (desamarra os custos) |
| `/api/eventos/:id/quartos` | GET / POST | GET ambos / POST admin | Quartos + alocações · cria quarto |
| `/api/quartos/:id` | PATCH / DELETE | admin | Edita · exclui quarto |
| `/api/quartos/:id/alocacoes` | POST | ambos | Aloca `{cliente_id}` (admin) ou `{nome_livre}` |
| `/api/alocacoes/:id` | PATCH / DELETE | ambos | Situação do hóspede · remove do quarto |
| `/api/tarefas` | GET / POST | ambos | Tarefas gerais: lista · adiciona |
| `/api/tarefas/:id` | PATCH / DELETE | ambos | Atualiza · exclui tarefa |
| `/api/crm` | GET / POST | admin | Contatos do CRM · adiciona |
| `/api/crm/:id` | GET / PATCH / DELETE | admin | Ficha + interações + expedições vinculadas · atualiza · exclui |
| `/api/crm/:id/interacoes` | POST | admin | Registra interação `{data, canal, resumo}` |
| `/api/crm-interacoes/:id` | DELETE | admin | Remove interação |

## Modelo de dados e cálculos

- **Simulador** (mesma lógica da planilha original): linha `pessoa` = média ×
  preço × multiplicador (nenhum / diárias / dias de trilha / refeições /
  eventos), somado por pessoa; linha `fixo` = valor × multiplicador, rateado
  entre as pessoas.
- **Custos:** cada item guarda `valor`, `valor_pago`, `parcelas` e
  `forma_pagamento`. O status (`pago` / `parcial` / `andamento` / `pendente`)
  é derivado do quanto já foi pago em relação ao total.
- **Staff:** um participante marcado como staff sai da receita e passa a contar
  como custo da expedição, aparecendo no módulo de Custos.
- **Status** de itens e tarefas: `afazer`, `andamento`, `concluido`.
  **Etapas** do CRM: `lead`, `contato`, `proposta`, `confirmado`, `pos_evento`,
  `perdido`.

## Privacidade (LGPD)

- Os dados pessoais reais (CPF, telefone, financeiro, CRM) **nunca entram no
  git**: ficam num seed ignorado (`seed_dados_reais.sql`) e num banco privado.
- As chaves de acesso são *secrets* do Wrangler, não vão no código nem no HTML;
  trocar é um comando (`npx wrangler secret put …`) e desloga quem usava a antiga.
- CPF/telefone e todo o financeiro só aparecem com a chave admin; a equipe opera
  checklist, hospedagem e tarefas sem ver dado pessoal.
