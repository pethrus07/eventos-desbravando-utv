# Controle de Eventos · Desbravando UTV — v3

Sistema de gestão de expedições — substitui a planilha inteira ("Controle
geral", "Cadastro dos clientes", "Simulador de custos" e "Página8"). Roda
inteiro em um Cloudflare Worker + D1 (banco SQLite serverless), no plano
gratuito.

**Módulos:** Checklist · Participantes + Financeiro · Simulador de custos ·
Hospedagem · **Tarefas gerais** (o dia a dia fora dos eventos) · **Mini CRM**
(a ficha central de cada cliente: camiseta, CPF, telefone, etapa, histórico de
interações e as expedições em que participou/participará, com pacote e
pagamentos de cada uma — vinculado ao cadastro de participantes dos eventos).

**Dois níveis de acesso:** `APP_KEY` (admin — tudo) e `TEAM_KEY` (equipe —
checklist, custos, hospedagem e tarefas gerais, sem CPF, financeiro nem CRM;
opcional).

**Mesma base do Mini Drive:** um worker, uma chave de equipe, deploy com
`npx wrangler deploy`. A diferença é o miolo — em vez de guardar arquivos
(R2), guarda dados vivos (D1), com gravação por item para que 2–5 pessoas
editem ao mesmo tempo sem se atropelar.

## Arquivos

| Arquivo | O que é |
| --- | --- |
| `worker.js` | API (eventos e itens) + entrega da interface |
| `ui.html` | Interface completa (login, checklist, filtros, custos, modelos) |
| `wrangler.toml` | Configuração — **precisa colar o database_id** (passo 2) |
| `schema.sql` | Estrutura do banco (rodar uma vez) |
| `migracao_v3_1.sql` | Só para quem já tinha o banco v3 no ar: adiciona vínculo e campos novos (rodar uma vez) |
| `seed_dados_reais.sql` | **Dados reais das planilhas** (rodar uma vez): 4 expedições (Serra Catarinense Ago/Set, Costa Doce Nov/Dez) com checklist, participantes, pagamentos, quartos, alocações e cenários + Evento Copa + 78 tarefas gerais + 60 contatos do CRM |

## Publicação (resumo — o passo a passo completo está no Plano de Implantação)

```bash
cd eventos-worker
npx wrangler login                                   # se ainda não estiver logado
npx wrangler d1 create eventos                       # 1) cria o banco
#    → copie o database_id impresso e cole no wrangler.toml
npx wrangler d1 execute eventos --remote --file=schema.sql          # 2) estrutura
npx wrangler d1 execute eventos --remote --file=seed_dados_reais.sql   # 3) dados reais (opcional)
npx wrangler secret put APP_KEY                      # 4) chave admin
npx wrangler secret put TEAM_KEY                     #    chave equipe (opcional)
npx wrangler deploy                                  # 5) publica
```

A URL impressa no final (`https://eventos.SEU-USUARIO.workers.dev`) é a
plataforma completa — abra, informe a chave e o seu nome.

## API (para referência)

Autenticação: header `x-app-key` com a chave da equipe.

| Rota | Método | Papel | Faz |
| --- | --- | --- | --- |
| `/api/me` | GET | ambos | Retorna o papel da chave |
| `/api/eventos` | GET | ambos | Lista eventos com progresso e custo total |
| `/api/eventos` | POST | admin | Cria evento; `{copiar_de, limpar_valores}` duplica outro como modelo (itens, quartos e cenários) |
| `/api/eventos/:id` | PATCH / DELETE | admin | Renomeia/arquiva · exclui tudo do evento |
| `/api/eventos/:id/itens` | GET / POST | ambos | Checklist: lista · adiciona |
| `/api/itens/:id` | PATCH / DELETE | ambos | Atualiza · exclui item |
| `/api/eventos/:id/clientes` | GET / POST | admin | Participantes (com soma de pagos) · adiciona |
| `/api/clientes/:id` | GET / PATCH / DELETE | admin | Ficha + pagamentos · atualiza · exclui |
| `/api/clientes/:id/pagamentos` | POST | admin | Registra pagamento `{valor, data, forma}` |
| `/api/pagamentos/:id` | DELETE | admin | Remove pagamento |
| `/api/clientes/:id/notas` | POST | admin | Anotação livre `{texto}` na ficha do participante |
| `/api/cliente-notas/:id` | DELETE | admin | Remove anotação |
| `/api/eventos/:id/cenarios` | GET / POST | admin | Cenários + linhas · cria (padrão ou `copiar_de`) |
| `/api/cenarios/:id` | PATCH / DELETE | admin | Parâmetros · exclui |
| `/api/cenarios/:id/linhas` | POST | admin | Nova linha de custo |
| `/api/linhas/:id` | PATCH / DELETE | admin | Edita · remove linha |
| `/api/eventos/:id/quartos` | GET / POST | GET ambos / POST admin | Quartos + alocações (lista de participantes só p/ admin) · cria quarto |
| `/api/quartos/:id` | PATCH / DELETE | admin | Edita · exclui quarto |
| `/api/quartos/:id/alocacoes` | POST | ambos | Aloca `{cliente_id}` (admin) ou `{nome_livre}` |
| `/api/alocacoes/:id` | PATCH / DELETE | ambos | Situação do hóspede · remove do quarto |
| `/api/tarefas` | GET / POST | ambos | Tarefas gerais: lista · adiciona |
| `/api/tarefas/:id` | PATCH / DELETE | ambos | Atualiza · exclui tarefa |
| `/api/crm` | GET / POST | admin | Contatos do CRM (com nº de interações) · adiciona |
| `/api/crm/:id` | GET / PATCH / DELETE | admin | Ficha + interações + expedições vinculadas · atualiza · exclui (desamarra participações sem apagá-las) |
| `/api/crm/:id/interacoes` | POST | admin | Registra interação `{data, canal, resumo}` |
| `/api/crm-interacoes/:id` | DELETE | admin | Remove interação |

Cálculo do simulador (idêntico à planilha): linha `pessoa` = média × preço ×
multiplicador (nenhum / diárias / dias_trilha / refeições / eventos), somado
por pessoa; linha `fixo` = valor × multiplicador, rateado pelas pessoas.

Status possíveis (itens e tarefas): `afazer`, `andamento`, `concluido`.
Etapas do CRM: `lead`, `contato`, `proposta`, `confirmado`, `pos_evento`, `perdido`.
Campos de item: `dia, item, setor, status, prioridade (1–4), data_limite,
responsavel, fornecedor, quantidade, valor, observacoes`.

## Segurança e limites

- As chaves nunca ficam em HTML público: são digitadas na tela de acesso e
  guardadas só no aparelho de quem usa. Para trocar: `npx wrangler secret put
  APP_KEY` ou `TEAM_KEY` (quem usava a chave trocada é deslogado na hora).
- Dados pessoais (CPF/telefone) e financeiro são visíveis apenas com a chave
  admin; a chave equipe opera checklist, custos e hospedagem.
- Plano gratuito do D1: 5 GB e 5 milhões de leituras/dia — ordens de grandeza
  acima do uso de um controle de eventos.
