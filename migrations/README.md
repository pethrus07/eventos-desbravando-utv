# Migrações

Mudanças incrementais do banco D1 `eventos`, na ordem em que foram aplicadas em produção.
O número na frente do nome é só a ordem. A versão (`v4_6`) é a do sistema na época.

Instalação nova: rodar o `schema.sql` da raiz. Ele já traz quase tudo. Banco que já tem dado:
aplicar, em ordem, só as que faltam.

```bash
npx wrangler d1 export eventos --remote --output backup-antes.sql   # sempre antes
npx wrangler d1 execute eventos --remote --file=migrations/160_v4_9.sql
```

## Atenção: não usar `wrangler d1 migrations apply` ainda

O banco de produção não tem a tabela `d1_migrations`. Se alguém rodar
`wrangler d1 migrations apply`, o Wrangler acha que nenhuma destas foi aplicada e tenta rodar
todas de novo. Para adotar o comando um dia: criar a tabela e registrar nela cada arquivo
desta pasta como já aplicado, e só depois usar o comando.

## Lista

| Arquivo | O que faz | Em produção |
|---|---|---|
| `010_v3_1.sql` | ajustes da v3.1 | aplicada |
| `020_v3_2.sql` | custos e fornecedores | aplicada |
| `025_backfill_custos_v3_2.sql` | copia os valores do checklist para custos (rodar uma vez) | aplicada |
| `030_v3_3.sql` | cenário de simulação como modelo | aplicada |
| `040_v3_4.sql` | staff e financeiro nos custos | aplicada |
| `050_v3_5.sql` | horário e subtarefas no checklist | aplicada |
| `060_v3_6.sql` | ordem, horário e subtarefas nas tarefas gerais | aplicada |
| `070_v4_1.sql` | sistema operacional e campo | aplicada |
| `080_v4_2.sql` | tabelas do conector MCP | aplicada |
| `090_v4_3.sql` | formulários públicos | aplicada |
| `100_v4_4.sql` | sobretítulo do formulário | aplicada |
| `110_v4_5.sql` | nota de rodapé do formulário | aplicada |
| `120_upd_cadastro_piloto.sql` | dados: piloto e acompanhante no formulário de cadastro | aplicada |
| `121_upd_cadastro_pagamento.sql` | dados: e-mail e forma de pagamento no cadastro | aplicada |
| `122_upd_cadastro_v3.sql` | dados: telefone, camiseta e emergência no cadastro | aplicada |
| `130_v4_6.sql` | auditoria | aplicada |
| `140_v4_7.sql` | briefing de comunicação | aplicada |
| `160_v4_9.sql` | permissão por pessoa | aplicada (coluna `usuarios.permissoes` conferida em 01/11/2026) |

A `v4_8` foi descartada em 14/10/2026 e não deixou rastro no banco. O conteúdo dela está em
[docs/historico/migracao_v4_8-descartada.sql](../docs/historico/migracao_v4_8-descartada.sql),
só como registro. O número 150 fica vago de propósito.

Os arquivos `120` a `122` mudam dados de um formulário criado por
`seeds/seed_cadastro_origens.sql`, e só fazem sentido depois dele.
