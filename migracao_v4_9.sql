-- v4.9 · PERMISSÃO POR PESSOA, sem perfil obrigatório (15/10/2026)
--
-- POR QUE
-- O Gustavo tentou cadastrar a Ana e parou na pergunta certa: "quais os módulos que essa
-- pessoa tem acesso". Hoje a resposta é indireta — cria-se um PERFIL com aquelas áreas e
-- põe-se a pessoa nele. Funciona quando as pessoas se agrupam em papéis de verdade
-- (comercial, operação), e vira um perfil por pessoa quando não se agrupam. O briefing do
-- cliente pedia o modelo direto desde o começo.
--
-- O QUE MUDA
-- `usuarios` ganha `permissoes` e passa a aceitar `perfil_id` nulo. São dois modos, e um
-- usuário está sempre em exatamente um deles:
--
--   · perfil_id preenchido  → manda o perfil, e mudar o perfil vale na hora para todos nele
--   · perfil_id nulo        → manda a lista em `permissoes`, só desta pessoa
--
-- Quem é ADMIN continua saindo só do perfil. Usuário de permissão individual nunca é
-- administrador: para dar acesso total, põe-se a pessoa no Administrador Geral. Um caminho
-- só para o poder total é mais fácil de auditar do que dois.
--
-- POR QUE RECONSTRUIR A TABELA
-- `perfil_id` era NOT NULL, e o SQLite não afrouxa NOT NULL com ALTER. A tabela é copiada.
-- Em 15/10/2026, às 15h, a produção tinha ZERO usuários — a cópia é de uma tabela vazia.
-- Ainda assim o INSERT copia linha por linha, porque este arquivo pode rodar depois, em
-- banco que já tenha gente, e aí jogar fora não seria aceitável.
--
-- Aplicar:  npx wrangler d1 execute eventos --remote --file=migracao_v4_9.sql
-- Antes:    npx wrangler d1 export eventos --remote --output backup.sql

CREATE TABLE usuarios_v49 (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash     TEXT NOT NULL,
  perfil_id      INTEGER,                      -- NULO = permissão individual, na coluna abaixo
  permissoes     TEXT NOT NULL DEFAULT '[]',   -- JSON, só vale quando perfil_id é nulo
  ativo          INTEGER NOT NULL DEFAULT 1,
  falhas_login   INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate  TEXT NOT NULL DEFAULT '',
  ultimo_acesso  TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO usuarios_v49 (id, nome, email, senha_hash, perfil_id, permissoes, ativo,
                          falhas_login, bloqueado_ate, ultimo_acesso, criado_em, atualizado_em)
  SELECT id, nome, email, senha_hash, perfil_id, '[]', ativo,
         falhas_login, bloqueado_ate, ultimo_acesso, criado_em, atualizado_em
  FROM usuarios;

DROP TABLE usuarios;

ALTER TABLE usuarios_v49 RENAME TO usuarios;
