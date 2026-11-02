# Controle de Eventos · Desbravando UTV

Português · [English](README.md)

Sistema de gestão das expedições off-road de UTV da Desbravando UTV. Um app web no lugar de
um conjunto de planilhas: checklist de logística, participantes, contas a receber, custos e
fornecedores, hospedagem, programação de campo e tarefas da equipe. A equipe usa no celular,
em campo.

## Status

Em produção desde julho de 2026 em `eventos.desbravando-utv.workers.dev`.

Lacuna conhecida (conferida em 01/11/2026): a versão no ar desde 21/10/2026 foi publicada a
partir de outra cópia do código, que não está neste repositório. O `main` e a produção estão
diferentes de novo. Leia a [docs/ARQUITETURA.md §11](docs/ARQUITETURA.md) antes de qualquer
deploy.

## O problema que resolve

A operação vendia expedições, acompanhava a logística, cobrava em parcelas e estimava custos
em planilhas separadas, editadas por várias pessoas ao mesmo tempo. Fórmula quebrava e uma
edição apagava a outra. O app junta o ciclo inteiro da expedição num lugar só, e grava campo
a campo para que várias pessoas editem juntas.

## Stack

- Cloudflare Worker (`worker.js`), JavaScript puro, sem framework e sem build
- Cloudflare D1 (SQLite) para os dados
- Cloudflare R2 para os anexos (binding `ANEXOS`)
- Interface de arquivo único (`ui.html`) servida pelo próprio Worker
- Servidor MCP com OAuth 2.1 (`mcp.js`) para o Claude operar o sistema
- Formulários públicos (`cardapio.js`) num Worker à parte (`worker-cardapio.js`)

## Rodar localmente

Precisa de Node 20 ou mais novo.

```bash
npm install
npx wrangler d1 execute eventos --local --file=schema.sql
npx wrangler dev
```

As chaves locais ficam em `.dev.vars` (fora do git):

```
APP_KEY=qualquer-chave-admin-local
TEAM_KEY=qualquer-chave-equipe-local
```

## Testes

```bash
npm test          # API contra um `wrangler dev` local (login, permissão por pessoa, CRUD de expedição, anexo no R2)
npm run travas    # travas antes do deploy: a tela compila, regras do worker, o .zip, o formulário público
npm run travas:tela   # abre todas as abas num Chromium (usa o Playwright do checkout do qa-parresia)
```

O `npm test` cria um D1 local temporário a partir do `schema.sql`, usa chaves de teste e
nunca encosta na produção.

## Estrutura de pastas

| Caminho | O que é |
|---|---|
| `worker.js` | API (`/api/*`), login, permissões e entrega da interface |
| `ui.html` | A interface inteira, num arquivo |
| `mcp.js` | Conector MCP e rotas de OAuth |
| `auditoria.js` | Registro de toda escrita |
| `briefing.js` | Briefing de comunicação por expedição |
| `cardapio.js`, `worker-cardapio.js`, `wrangler.cardapio.toml` | Worker dos formulários públicos |
| `marca.js` | Marca em vetor usada pelos formulários |
| `schema.sql` | Estrutura do banco para instalação nova |
| `migrations/` | Mudanças incrementais de SQL, em ordem (ver `migrations/README.md`) |
| `seeds/` | SQL que cria os formulários e o playbook operacional |
| `tools/` | Travas de deploy e scripts de apoio |
| `tests/` | Testes automáticos da API |
| `docs/` | Arquitetura, roadmap, histórico, diagramas |

## Arquitetura

Fluxo da requisição, módulos, banco e papéis estão em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
Diagramas em [docs/arquitetura/](docs/arquitetura/).

## Decisões e limites conhecidos

- `worker.js` e `mcp.js` foram recuperados do pacote publicado em 14/10/2026. Rodam e dá para
  ler, mas o empacotador tirou os comentários e acrescentou os `__name()`.
- Dado pessoal (CPF, telefone, pagamentos) nunca entra no git. Seed de dado real e backup do
  banco estão no `.gitignore`.
- Chaves de acesso e de assinatura são secrets do Wrangler, nunca ficam no código.
- As migrações são aplicadas à mão com `wrangler d1 execute`. Ainda não são geridas pelo
  `wrangler d1 migrations`.
- A rota dos formulários públicos é a única que grava sem sessão. O `POST /oauth/register`
  também aceita pedido sem sessão, como o registro dinâmico de cliente OAuth exige.

## Licença

Todos os direitos reservados. Publicado como portfólio; não licenciado para reuso. Veja o arquivo [LICENSE](LICENSE).
