# Roadmap · Controle de Eventos

Plano curto e em ordem. O diário que estava aqui até 01/11/2026 está em [HISTORICO.md](HISTORICO.md).

## Agora

1. **Fechar as duas cópias.** A versão no ar desde 21/10/2026 (versão `9ff53cdf`) saiu de
   outra cópia do código, não deste `main`. O fonte dela, com comentários, foi recuperado do
   source map publicado e está fora do git (ver ARQUITETURA §11). Decidir qual base vira a
   verdade, juntar as duas e só então publicar daqui.
2. **Conferir os anexos em produção.** As versões publicadas em 15/10 saíram deste checkout
   sem o binding `ANEXOS`. A de 21/10 tem o binding. O `wrangler.toml` agora declara o bucket.
3. **Mesclar o branch `revisao-2026-11`**: `upd()` só com parâmetros ligados (sem aspa
   escapada à mão) e limite no `POST /oauth/register`.
4. **Rotacionar a `APP_KEY`**, que já apareceu em chat. Antes, conferir com
   `wrangler secret list` se `MCP_SIGNING_KEY` existe: sem ela, a `APP_KEY` assina os tokens
   do conector e trocá-la derruba o conector.

## Depois

- S5 · exclusão vira arquivamento, com lixeira e restaurar.
- S7 · render em lote das peças a partir do briefing fechado.
- Adotar `wrangler d1 migrations` (ver `migrations/README.md`).
- Separar o `worker.js` em módulos por área, partindo do fonte com comentários recuperado.
- Trazer para o `schema.sql` as tabelas que só existem em produção.

## Talvez

- Chave própria da RYZE sem acesso a dado pessoal (S4 do histórico).
- Migrar Workers, D1 e R2 para a conta Cloudflare do cliente.
