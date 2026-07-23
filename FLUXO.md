# Fluxo seguro de mudanças (código / arquitetura)

Este sistema está **em produção** e movimenta dinheiro e dados pessoais (LGPD).
Por isso, mudança em código/arquitetura **nunca vai direto pra produção**. Existe um
caminho seguro, com um ambiente de testes e uma revisão antes de publicar.

## Os dois ambientes

| | Produção | Staging (testes) |
|---|---|---|
| Worker | `eventos` · https://eventos.desbravando-utv.workers.dev | `eventos-staging` · https://eventos-staging.desbravando-utv.workers.dev |
| Banco (D1) | `eventos` (dados reais) | `eventos-staging` (só dados de teste, **sem CPF/financeiro real**) |
| Branch git | `main` | `dev` |
| Quem publica | **só o responsável técnico** | qualquer um pode testar à vontade |

## Os dois branches

- **`main`** = o que está no ar em produção. Protegido. Só recebe código **revisado**.
- **`dev`** = onde se experimenta e o Claude do dono trabalha. Pode quebrar à vontade — não afeta a produção.

## O caminho de uma mudança

```
1. Trabalhar no branch  dev           (editar código, arquitetura, o que for)
2. Testar no STAGING:   npx wrangler deploy --env staging
      → abre https://eventos-staging.desbravando-utv.workers.dev e valida
3. Deu certo? Avisar o responsável técnico / abrir um Pull Request de dev → main
4. REVISÃO do responsável técnico  (lê o diff, confere que não quebra nada)
5. Merge em  main
6. Publicar em PRODUÇÃO:  npx wrangler deploy         (só o responsável técnico)
```

## Regras de ouro

1. **Produção (`main` + `wrangler deploy`) só com revisão humana.** Nunca publicar direto do que um AI escreveu sem alguém olhar.
2. **Testar sempre no staging antes.** É de graça e não tem risco.
3. **Migração/seed de banco** (`wrangler d1 execute --remote`) na produção **só depois de rodar no staging** e revisar. É a parte que mais pode destruir dado.
4. **Segredos** (`APP_KEY`, `TEAM_KEY`) são secrets do Wrangler — **nunca** entram no código nem no git. Staging tem chaves próprias, diferentes das de produção.
5. **Dados reais** (CPF, financeiro, CRM) **nunca** vão pro git nem pro staging.

## Comandos rápidos

```bash
# testar no staging
npx wrangler deploy --env staging
npx wrangler d1 execute eventos-staging --remote --command="SELECT ..."

# produção (só responsável técnico, após revisão + merge em main)
npx wrangler deploy
npx wrangler d1 execute eventos --remote --file=migracao_xxx.sql

# acompanhar erros ao vivo
npx wrangler tail                 # produção
npx wrangler tail --env staging   # staging
```
