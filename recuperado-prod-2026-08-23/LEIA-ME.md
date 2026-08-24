# Snapshot da produção — versão 89624c80 (23/08/2026 12:39)

**Isto foi baixado da Cloudflare, não saiu de nenhum repositório.** Em 24/08/2026 o
formulário de cardápio (`/cardapio/<slug>`) estava respondendo 404 e a investigação
mostrou por quê: a versão em produção foi publicada por `wrangler deploy` em
23/08 12:39, de uma cópia do projeto **que não está neste git nem nesta máquina** e que
não contém o módulo do cardápio.

## Como foi recuperado

    GET /accounts/{acc}/workers/scripts/eventos/content/v2
    Authorization: Bearer <oauth_token do wrangler>

A resposta é `multipart/form-data` com os módulos. O endpoint `/content` recusa
(`10405 Method not allowed for this authentication scheme`) — o que funciona com o token
de OAuth do wrangler é o `/content/v2`.

## O que tem aqui

| arquivo | o que é |
|---|---|
| `worker.bundle.js` | 187 kB — **saída empacotada** do esbuild, com o `mcp.js` embutido. Não é o fonte original. |
| `ui.html` | 383 kB — este é o arquivo original, idêntico ao que foi publicado. |

## Divergência entre esta versão e o `main` deste repo

| | produção (23/08) | main deste repo |
|---|---|---|
| ui.html | 383 kB | 182 kB |
| binding R2 `ANEXOS` (`eventos-anexos`) | sim | não |
| secret `CLIENTE_KEY` | sim | não |
| módulo do cardápio (`/cardapio/<slug>`) | **não** | sim |
| `op_microtarefas` (agenda que funde microtarefas) | não | sim |

As duas linhas divergiram: produção tem anexos em R2 e uma UI muito maior; o `main` tem o
cardápio e a agenda. **Nenhuma das duas contém a outra.**

## Por que este snapshot importa

O `ui.html` de 383 kB e a feature de anexos existiam em um único lugar: o bundle
publicado. Se aquela cópia de trabalho se perder, o fonte se perde — o bundle dá para
rodar, mas não para manter.

O caminho certo é a cópia que gerou este deploy fazer `git pull` do `origin/main` (os dois
commits do cardápio já estão lá), commitar o que ela tem de novo e publicar do git.
