# CLAUDE.md — guia do repositório

Sistema de gestão das expedições da **Desbravando UTV**, **em produção** (movimenta
dinheiro real e guarda dados pessoais — CPF/financeiro/LGPD). Visão geral no [README.md](README.md).

Você tem acesso pra editar o código e publicar direto na produção. Pode experimentar —
mas leia a seção **Segurança** antes de mexer. A regra de ouro: **código quebrado se
recupera; dado apagado não.**

## Stack
- **Cloudflare Worker** (`worker.js`) + **D1** (SQLite) + **SPA de arquivo único** (`ui.html`). Sem build, sem dependências.
- `mcp.js` = conector MCP (o que liga o Claude ao sistema).
- Rotas: `/` serve a interface; `/api/*` é a API; `/mcp` (e o alias `/api/mcp`) é o conector.

## Rodar e publicar
```bash
npx wrangler dev        # roda local (chaves num .dev.vars, fora do git)
npx wrangler deploy     # PUBLICA EM PRODUÇÃO — é o sistema no ar de verdade
npx wrangler tail       # acompanha erros ao vivo
```

## Banco (D1 "eventos")
- Estrutura em `schema.sql`; mudanças incrementais em `migracao_*.sql`.
- Aplicar migração: `npx wrangler d1 execute eventos --remote --file=migracao_x.sql`
- Dados reais **nunca** no git: `seed_dados_reais.sql` e `backup*.sql` são gitignored.

## Convenções
- Escreva em **português** e no estilo do arquivo (single-file, sem framework, sem dependência nova sem necessidade real).
- Nos commits deste repo, **NÃO** adicione o trailer `Co-Authored-By`.

## Segurança — leia antes de mexer
1. **Commit antes de mudança grande.** Se a produção quebrar, é rápido voltar:
   `git revert HEAD && npx wrangler deploy` (ou volte pro último commit bom e redeploye).
2. **Dado é o que não volta.** Antes de rodar migração, DELETE ou UPDATE em massa na produção, faça backup:
   `npx wrangler d1 export eventos --remote --output backup.sql`
3. **Segredos** (`APP_KEY`, `TEAM_KEY`) são secrets do Wrangler — nunca no código nem no git.
4. (Opcional) Existe um ambiente de teste: `npx wrangler deploy --env staging` publica no Worker
   `eventos-staging` (banco próprio, sem dado real) — use se quiser testar algo arriscado sem tocar na produção. Não é obrigatório.

## Conferir que não quebrou (pós-deploy)
- `curl https://eventos.desbravando-utv.workers.dev/` deve responder **200**.
- A interface abre e o login com a chave funciona.
