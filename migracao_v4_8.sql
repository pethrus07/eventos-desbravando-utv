-- v4.8 · USUÁRIOS E PERMISSÕES (14/10/2026)
--
-- Troca o modelo de "duas chaves compartilhadas" por usuários individuais com permissão por
-- módulo — SEM derrubar ninguém. A migração é ADITIVA de propósito:
--
--   · APP_KEY continua valendo e resolve para o "Administrador principal";
--   · TEAM_KEY continua valendo e resolve para o usuário "Equipe", com as permissões que o
--     papel equipe já tinha hoje;
--   · chaves individuais entram AO LADO, e as pessoas migram uma a uma;
--   · a TEAM_KEY só é aposentada quando ninguém mais usar, num passo separado e deliberado.
--
-- Isso importa porque o token do conector MCP carrega `papel`, não usuário, e é assinado com
-- MCP_SIGNING_KEY **ou, se ela não existir, com a própria APP_KEY**. Trocar a APP_KEY
-- invalidaria todo token já emitido de uma vez — o Claude do cliente cairia no mesmo
-- instante. Nada aqui encosta nesses dois segredos.
--
-- 🛑 A CHAVE NÃO É GUARDADA: guarda-se o SHA-256 dela. Chave em tabela é chave que vaza em
-- todo backup, e os backups deste banco já existem. A chave é mostrada uma única vez, na
-- criação, e nunca mais — nem para o administrador.
--
-- As permissões ficam como JSON na própria linha do usuário, e não numa tabela de grants:
-- assim a checagem custa UMA leitura de linha por requisição em vez de treze. Medido contra
-- os limites da Cloudflare em 14/10: 1.300 req no pior dia útil = 1,3% do limite gratuito.
--
-- Aplicar:  npx wrangler d1 execute eventos --remote --file=migracao_v4_8.sql
-- Antes:    npx wrangler d1 export eventos --remote --output backup.sql

CREATE TABLE IF NOT EXISTS usuarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  chave_hash TEXT NOT NULL UNIQUE,          -- SHA-256 da chave, ou sentinela __APP_KEY__/__TEAM_KEY__
  ativo      INTEGER NOT NULL DEFAULT 1,
  principal  INTEGER NOT NULL DEFAULT 0,    -- o admin principal: acesso irrestrito, não editável
  permissoes TEXT NOT NULL DEFAULT '{}',    -- JSON {modulo: "ver"|"editar"}
  observacao TEXT NOT NULL DEFAULT '',
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_usuarios_hash ON usuarios(chave_hash);

-- O administrador principal. Acesso irrestrito por desenho, sem lista de permissões: o
-- briefing pede que ele mantenha acesso completo, e lista é coisa que se esquece de atualizar
-- quando nasce um módulo novo. `principal = 1` responde "sim" a qualquer pergunta.
INSERT OR IGNORE INTO usuarios (nome, chave_hash, principal, permissoes, observacao)
VALUES ('Administrador principal', '__APP_KEY__', 1, '{}',
        'Resolve pela APP_KEY. Acesso irrestrito; não aparece para edição.');

-- A equipe de hoje, com exatamente o que o papel "equipe" já enxergava — nem mais, nem menos.
-- Era: checklist, operação, campo, agenda, hospedagem e tarefas; sem custos, participantes,
-- simulador, cardápio, CRM e fornecedores. Quem usa a TEAM_KEY não perde nem ganha nada no
-- dia do deploy, que é a única forma de a migração ser invisível.
INSERT OR IGNORE INTO usuarios (nome, chave_hash, principal, permissoes, observacao)
VALUES ('Equipe (chave compartilhada)', '__TEAM_KEY__', 0,
        '{"eventos":"ver","checklist":"editar","operacao":"editar","campo":"editar",' ||
        '"agenda":"ver","hospedagem":"editar","tarefas":"editar"}',
        'Resolve pela TEAM_KEY. Legado: aposentar quando todos tiverem chave individual.');
