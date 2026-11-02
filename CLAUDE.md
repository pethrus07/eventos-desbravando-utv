# CLAUDE.md · guia do repositório

Sistema de gestão das expedições da Desbravando UTV, **em produção**. Guarda dado pessoal
(CPF, financeiro). Visão geral no [README.pt-BR.md](README.pt-BR.md), funcionamento em
[docs/ARQUITETURA.md](docs/ARQUITETURA.md). Regra de ouro: **código quebrado se recupera;
dado apagado não.**

## 🛑 Antes de qualquer deploy

Existem **duas cópias** do código publicando no mesmo Worker `eventos`, e a que está no ar
desde 21/10/2026 não saiu deste repositório (ARQUITETURA §11). Antes de `wrangler deploy`:

1. `npx wrangler deployments list` e `node tools/recuperar-da-producao.mjs --saida=<pasta fora do repo>`;
2. comparar com o checkout. Se a produção tem o que o `main` não tem, **não publicar**;
3. com tudo junto, rodar as travas e os testes (abaixo) e só então publicar.

## Stack

- `worker.js` (Worker) + D1 + R2 (`ANEXOS`) + `ui.html` (interface de arquivo único). Sem build.
- `mcp.js` conector MCP; `auditoria.js` registro de escrita; `briefing.js` briefing.
- `cardapio.js` formulário público. `/cardapio/<slug>` grava sem chave e roda no Worker
  `cardapio` (`wrangler.cardapio.toml`).

## Rodar, testar, publicar

```bash
npm install
npx wrangler dev          # local, chaves num .dev.vars (fora do git)
npm test                  # API contra wrangler dev local
npm run travas            # a tela compila, regras do worker, o .zip, o formulário público
npm run travas:tela       # abre todas as abas num Chromium (Playwright do qa-parresia)
npx wrangler deploy       # PRODUÇÃO. Só depois do bloco acima
```

Regra nova no worker ou tipo de campo novo no formulário entra na trava **no mesmo commit**.
Os motivos de cada trava estão no cabeçalho de cada arquivo em `tools/` e em
[docs/HISTORICO.md](docs/HISTORICO.md).

## Banco (D1 "eventos")

- Estrutura em `schema.sql`; mudanças em `migrations/`, em ordem (ver `migrations/README.md`).
- Antes de migração, DELETE ou UPDATE em massa: `npx wrangler d1 export eventos --remote --output backup.sql`.
- Aplicar: `npx wrangler d1 execute eventos --remote --file=migrations/<arquivo>.sql`.
- **Não** usar `wrangler d1 migrations apply` (o banco não tem `d1_migrations`).
- Toda tabela nova entra no `schema.sql` no mesmo commit.
- Dado real nunca no git: `seed_dados_reais.sql`, `backup*.sql`, `backup*.json` são ignorados.

## Segredos

`APP_KEY`, `TEAM_KEY`, `MCP_SIGNING_KEY`, `CLIENTE_KEY` são secrets do Wrangler. Sem
`MCP_SIGNING_KEY`, a `APP_KEY` assina os tokens do conector: trocá-la derruba o conector.
Conferir com `wrangler secret list` antes de rotacionar.

## Convenções

- Português, no estilo do arquivo, sem dependência nova sem necessidade real.
- Commits sem trailer `Co-Authored-By`.
- Nome de pessoa da equipe ou de cliente final não entra em código, comentário nem doc.

## Depois de publicar

- `curl https://eventos.desbravando-utv.workers.dev/` responde 200.
- A interface abre, o login funciona, um anexo abre.
