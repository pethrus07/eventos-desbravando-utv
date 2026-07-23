-- ============================================================
-- CONTROLE DE EVENTOS · Desbravando UTV
-- Esquema do banco (Cloudflare D1)
-- Aplicar com:
--   npx wrangler d1 execute eventos --remote --file=schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS eventos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  arquivado  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS itens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  ordem          INTEGER,
  dia            TEXT NOT NULL DEFAULT '',      -- 'Pré', '26/08', 'Pós'...
  item           TEXT NOT NULL,
  setor          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'afazer', -- afazer | andamento | concluido
  prioridade     INTEGER,                        -- 1 a 4, ou NULL
  data_limite    TEXT NOT NULL DEFAULT '',
  responsavel    TEXT NOT NULL DEFAULT '',
  fornecedor     TEXT NOT NULL DEFAULT '',
  quantidade     TEXT NOT NULL DEFAULT '',
  valor          REAL,                           -- em reais
  horario        TEXT NOT NULL DEFAULT '',       -- v3.5: "14h", "08:30"…
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_itens_evento ON itens(evento_id);

-- v3.5: subtarefas simples de um item do checklist (título + concluído)
CREATE TABLE IF NOT EXISTS subitens (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   INTEGER NOT NULL,
  ordem     INTEGER,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subitens_item ON subitens(item_id);

-- ============ v2: Participantes + Financeiro ============
CREATE TABLE IF NOT EXISTS clientes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id         INTEGER NOT NULL,
  grupo             TEXT NOT NULL DEFAULT '',   -- reserva/família (coluna "Utv" da planilha)
  nome              TEXT NOT NULL,
  cpf               TEXT NOT NULL DEFAULT '',
  telefone          TEXT NOT NULL DEFAULT '',
  tipo              TEXT NOT NULL DEFAULT 'adulto',  -- adulto | crianca
  camiseta          TEXT NOT NULL DEFAULT '',
  utv               TEXT NOT NULL DEFAULT '',   -- '4 lugares' | '2 lugares' | ''
  nf                TEXT NOT NULL DEFAULT '',   -- situação da NF (livre: ok, pendente…)
  contrato_enviado  INTEGER NOT NULL DEFAULT 0,
  contrato_assinado INTEGER NOT NULL DEFAULT 0,
  pacote            REAL,
  forma_pagamento   TEXT NOT NULL DEFAULT '',
  staff             INTEGER NOT NULL DEFAULT 0, -- 1 = equipe (sai da receita; vira custo)
  observacoes       TEXT NOT NULL DEFAULT '',
  contato_id        INTEGER,                    -- vínculo com crm_contatos (a pessoa)
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cli_evento ON clientes(evento_id);
CREATE INDEX IF NOT EXISTS idx_cli_contato ON clientes(contato_id);

CREATE TABLE IF NOT EXISTS pagamentos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id  INTEGER NOT NULL,
  valor       REAL NOT NULL,
  data        TEXT NOT NULL DEFAULT '',
  forma       TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por  TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_pag_cliente ON pagamentos(cliente_id);

-- ============ v2: Simulador de custos ============
CREATE TABLE IF NOT EXISTS cenarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL,
  nome        TEXT NOT NULL,
  pessoas     INTEGER NOT NULL DEFAULT 1,
  diarias     INTEGER NOT NULL DEFAULT 1,
  dias_trilha INTEGER NOT NULL DEFAULT 1,
  refeicoes   INTEGER NOT NULL DEFAULT 1,
  eventos_qtd INTEGER NOT NULL DEFAULT 1,
  modelo      INTEGER NOT NULL DEFAULT 0,   -- 1 = cenário reutilizável como modelo em outras expedições
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cen_evento ON cenarios(evento_id);

CREATE TABLE IF NOT EXISTS cenario_linhas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cenario_id INTEGER NOT NULL,
  ordem      INTEGER,
  item       TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'pessoa',  -- pessoa: média×preço×mult por pessoa | fixo: valor total rateado
  media      REAL NOT NULL DEFAULT 1,          -- consumo médio por pessoa (tipo=pessoa)
  preco      REAL NOT NULL DEFAULT 0,          -- preço unitário (pessoa) ou valor total (fixo)
  mult       TEXT NOT NULL DEFAULT 'nenhum'    -- nenhum | diarias | dias_trilha | refeicoes | eventos
);
CREATE INDEX IF NOT EXISTS idx_lin_cenario ON cenario_linhas(cenario_id);

-- ============ v2: Hospedagem ============
CREATE TABLE IF NOT EXISTS quartos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL,
  ordem       INTEGER,
  nome        TEXT NOT NULL,
  capacidade  INTEGER NOT NULL DEFAULT 2,
  diaria      REAL,
  adicional   REAL NOT NULL DEFAULT 0,
  observacoes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_qua_evento ON quartos(evento_id);

CREATE TABLE IF NOT EXISTS alocacoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quarto_id     INTEGER NOT NULL,
  cliente_id    INTEGER,               -- participante cadastrado…
  nome_livre    TEXT NOT NULL DEFAULT '', -- …ou nome digitado
  status        TEXT NOT NULL DEFAULT '', -- aguardo de pagamento, aguardo escolha…
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alo_quarto ON alocacoes(quarto_id);

-- ============ v3: Tarefas gerais (fora dos eventos) ============
CREATE TABLE IF NOT EXISTS tarefas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo         TEXT NOT NULL,
  setor          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'afazer',  -- afazer | andamento | concluido
  prioridade     INTEGER,                          -- 1 a 40, ou NULL
  data_limite    TEXT NOT NULL DEFAULT '',
  responsavel    TEXT NOT NULL DEFAULT '',
  ordem          INTEGER,                          -- v3.6: ordem manual (arrastar)
  horario        TEXT NOT NULL DEFAULT '',         -- v3.6: "14h", "08:30"…
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);

-- v3.6: subtarefas simples de uma tarefa geral (título + concluído)
CREATE TABLE IF NOT EXISTS subtarefas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id  INTEGER NOT NULL,
  ordem      INTEGER,
  titulo     TEXT NOT NULL,
  concluido  INTEGER NOT NULL DEFAULT 0,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subtarefas_tarefa ON subtarefas(tarefa_id);

-- ============ v3: Mini CRM ============
CREATE TABLE IF NOT EXISTS crm_contatos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT NOT NULL,
  grupo           TEXT NOT NULL DEFAULT '',   -- apelido/grupo da reserva
  telefone        TEXT NOT NULL DEFAULT '',
  cpf             TEXT NOT NULL DEFAULT '',
  camiseta        TEXT NOT NULL DEFAULT '',   -- tamanho padrão da pessoa
  cidade          TEXT NOT NULL DEFAULT '',
  origem          TEXT NOT NULL DEFAULT '',   -- indicação, instagram, planilha…
  etapa           TEXT NOT NULL DEFAULT 'lead', -- lead|contato|proposta|confirmado|pos_evento|perdido
  interesse       TEXT NOT NULL DEFAULT '',   -- expedição(ões) de interesse
  valor_potencial REAL,
  proxima_acao    TEXT NOT NULL DEFAULT '',
  proxima_data    TEXT NOT NULL DEFAULT '',
  observacoes     TEXT NOT NULL DEFAULT '',
  atualizado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS crm_interacoes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL,
  data       TEXT NOT NULL DEFAULT '',
  canal      TEXT NOT NULL DEFAULT '',        -- whatsapp, ligação, reserva…
  resumo     TEXT NOT NULL DEFAULT '',
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_int_contato ON crm_interacoes(contato_id);

-- ============ v3.1: Anotações livres por participante ============
CREATE TABLE IF NOT EXISTS cliente_notas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  texto      TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_nota_cliente ON cliente_notas(cliente_id);

-- ============ v3.2: Fornecedores + Custos (módulo financeiro) ============
-- Fornecedores globais (compartilhados entre todas as expedições)
CREATE TABLE IF NOT EXISTS fornecedores (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  contato        TEXT NOT NULL DEFAULT '',
  telefone       TEXT NOT NULL DEFAULT '',
  cidade         TEXT NOT NULL DEFAULT '',
  observacoes    TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);

-- Itens de custo reais de cada expedição (editáveis, com status e fornecedor)
CREATE TABLE IF NOT EXISTS custos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  ordem          INTEGER,
  item           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  quantidade     REAL NOT NULL DEFAULT 1,
  valor          REAL,                             -- valor total do item, em reais
  fornecedor_id  INTEGER,                          -- vínculo com fornecedores (opcional)
  status         TEXT NOT NULL DEFAULT 'pendente', -- pago | parcial | andamento | pendente
  forma_pagamento TEXT NOT NULL DEFAULT '',        -- Pix, Boleto, Cartão…
  parcelas       INTEGER,                          -- nº de parcelas (opcional)
  valor_pago     REAL NOT NULL DEFAULT 0,          -- quanto já foi pago (calcula saldo/status)
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_custos_evento ON custos(evento_id);
CREATE INDEX IF NOT EXISTS idx_custos_forn   ON custos(fornecedor_id);

-- ============ v4.1: Sistema Operacional (Ciclo + Operação em Campo) ============
-- Camada hierárquica: Expedição → 7 Etapas → Itens → 6 Fases → Microtarefas
-- + Operação em Campo por Dias → Tarefas cronológicas → Subtarefas

-- Item concreto de uma etapa (Hotel, Bebidas, Camiseta…); só Nome+Categoria
CREATE TABLE IF NOT EXISTS op_itens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  etapa          TEXT NOT NULL DEFAULT '',   -- validacao|marketing|vendas|contratacoes|pre_expedicao|operacao_campo|fechamento
  categoria      TEXT NOT NULL DEFAULT '',   -- Hotel, Bebidas, Almoço, Camiseta…
  nome           TEXT NOT NULL,
  ordem          INTEGER,
  homologado     INTEGER NOT NULL DEFAULT 0, -- parceiro já homologado (pode pular fases)
  observacoes    TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_op_itens_evento ON op_itens(evento_id);

-- 6 fases fixas de cada item (criadas automaticamente ao salvar o item)
CREATE TABLE IF NOT EXISTS op_fases (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL,
  tipo           TEXT NOT NULL,              -- pesquisa|negociacao|contratacao|confirmacao|execucao|avaliacao
  ordem          INTEGER NOT NULL,           -- 1..6
  status         TEXT NOT NULL DEFAULT 'afazer', -- afazer|andamento|concluido|nao_utilizada
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_op_fases_item ON op_fases(item_id);

-- Microtarefas de cada fase (data/horario/responsavel/tipo só na fase Execução)
CREATE TABLE IF NOT EXISTS op_microtarefas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fase_id     INTEGER NOT NULL,
  titulo      TEXT NOT NULL,
  concluido   INTEGER NOT NULL DEFAULT 0,
  ordem       INTEGER,
  data        TEXT NOT NULL DEFAULT '',      -- 'YYYY-MM-DD' ou rótulo do dia
  horario     TEXT NOT NULL DEFAULT '',      -- horário previsto: "08:00"
  responsavel TEXT NOT NULL DEFAULT '',
  tipo        TEXT NOT NULL DEFAULT 'fixa',  -- ajustavel|fixa (agenda)
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_op_micro_fase ON op_microtarefas(fase_id);

-- Operação em Campo: dias da expedição
CREATE TABLE IF NOT EXISTS campo_dias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL,
  rotulo    TEXT NOT NULL,                   -- "Dia 1 — Chegada e boas-vindas"
  data      TEXT NOT NULL DEFAULT '',
  ordem     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_campo_dias_evento ON campo_dias(evento_id);

-- Tarefa cronológica de um dia (Ajustável cascateia reajuste; Fixa não)
CREATE TABLE IF NOT EXISTS campo_tarefas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dia_id         INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  h_planejado    TEXT NOT NULL DEFAULT '',
  h_realizado    TEXT NOT NULL DEFAULT '',
  responsavel    TEXT NOT NULL DEFAULT '',
  tipo           TEXT NOT NULL DEFAULT 'ajustavel', -- ajustavel|fixa
  status         TEXT NOT NULL DEFAULT 'afazer',    -- afazer|andamento|concluido
  ordem          INTEGER,
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_campo_tarefas_dia ON campo_tarefas(dia_id);

-- Subtarefas de check de uma tarefa de campo
CREATE TABLE IF NOT EXISTS campo_subtarefas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id INTEGER NOT NULL,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  ordem     INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campo_sub_tarefa ON campo_subtarefas(tarefa_id);

-- ============ v4.2: Conector MCP (OAuth 2.1 para claude.ai) ============
CREATE TABLE IF NOT EXISTS mcp_clients (
  client_id     TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL DEFAULT '[]',
  nome          TEXT NOT NULL DEFAULT '',
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS mcp_codes (
  code           TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  redirect_uri   TEXT NOT NULL,
  code_challenge TEXT NOT NULL DEFAULT '',
  papel          TEXT NOT NULL DEFAULT 'equipe',
  expira_em      INTEGER NOT NULL
);
