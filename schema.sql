-- ============================================================
-- SCHEMA DO D1 "eventos" — exportado da PRODUÇÃO em 14/10/2026.
--
-- POR QUE ESTE ARQUIVO FOI REFEITO: ele tinha 25 tabelas e a produção tem 53. A diferença
-- não era descuido de uma migração: este checkout estava parado desde agosto enquanto OUTRA
-- cópia do código publicava no mesmo worker, criando módulos inteiros que aqui nunca
-- existiram — financeiro, perfis e sessões, programação, prazos, anexos.
--
-- Um `schema.sql` defasado é pior que nenhum: ele dá a confiança de estar olhando a verdade.
-- Foi lendo este arquivo que eu construí uma tabela `usuarios` que já existia em produção,
-- com outro desenho e melhor — a migração falhou com "no such column: chave_hash" e só aí o
-- problema apareceu.
--
-- Daqui em diante: refazer com
--   cf.ps1 usar ryze npx wrangler d1 export eventos --remote --no-data --output schema.sql
-- sempre que uma migração for aplicada, e no mesmo commit.
-- ============================================================

PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE eventos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  arquivado  INTEGER NOT NULL DEFAULT 0
, data_evento TEXT NOT NULL DEFAULT '', data_evento_fim TEXT NOT NULL DEFAULT '', hospedagem_diarias INTEGER);
CREATE TABLE itens (
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
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, horario TEXT NOT NULL DEFAULT '');
CREATE TABLE clientes (
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
  observacoes       TEXT NOT NULL DEFAULT '',
  contato_id        INTEGER,                    -- vínculo com crm_contatos (a pessoa)
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por    TEXT NOT NULL DEFAULT ''
, staff INTEGER NOT NULL DEFAULT 0, papel TEXT NOT NULL DEFAULT 'piloto', desistente INTEGER NOT NULL DEFAULT 0, cegonha INTEGER, endereco TEXT NOT NULL DEFAULT '', nacionalidade TEXT NOT NULL DEFAULT '', estado_civil TEXT NOT NULL DEFAULT '', rg TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', emergencia_nome TEXT NOT NULL DEFAULT '', emergencia_parentesco TEXT NOT NULL DEFAULT '', emergencia_telefone TEXT NOT NULL DEFAULT '', utv_recebido INTEGER NOT NULL DEFAULT 0, utv_recebido_em TEXT NOT NULL DEFAULT '', utv_devolvido INTEGER NOT NULL DEFAULT 0, utv_devolvido_em TEXT NOT NULL DEFAULT '');
CREATE TABLE pagamentos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id  INTEGER NOT NULL,
  valor       REAL NOT NULL,
  data        TEXT NOT NULL DEFAULT '',
  forma       TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE cenarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL,
  nome        TEXT NOT NULL,
  pessoas     INTEGER NOT NULL DEFAULT 1,
  diarias     INTEGER NOT NULL DEFAULT 1,
  dias_trilha INTEGER NOT NULL DEFAULT 1,
  refeicoes   INTEGER NOT NULL DEFAULT 1,
  eventos_qtd INTEGER NOT NULL DEFAULT 1,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
, modelo INTEGER NOT NULL DEFAULT 0);
CREATE TABLE cenario_linhas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cenario_id INTEGER NOT NULL,
  ordem      INTEGER,
  item       TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'pessoa',  -- pessoa: média×preço×mult por pessoa | fixo: valor total rateado
  media      REAL NOT NULL DEFAULT 1,          -- consumo médio por pessoa (tipo=pessoa)
  preco      REAL NOT NULL DEFAULT 0,          -- preço unitário (pessoa) ou valor total (fixo)
  mult       TEXT NOT NULL DEFAULT 'nenhum'    -- nenhum | diarias | dias_trilha | refeicoes | eventos
, categoria TEXT NOT NULL DEFAULT '', categoria_id INTEGER);
CREATE TABLE quartos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL,
  ordem       INTEGER,
  nome        TEXT NOT NULL,
  capacidade  INTEGER NOT NULL DEFAULT 2,
  diaria      REAL,
  adicional   REAL NOT NULL DEFAULT 0,
  observacoes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE alocacoes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  quarto_id     INTEGER NOT NULL,
  cliente_id    INTEGER,               -- participante cadastrado…
  nome_livre    TEXT NOT NULL DEFAULT '', -- …ou nome digitado
  status        TEXT NOT NULL DEFAULT '', -- aguardo de pagamento, aguardo escolha…
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE tarefas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo         TEXT NOT NULL,
  setor          TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'afazer',  -- afazer | andamento | concluido
  prioridade     INTEGER,                          -- 1 a 4, ou NULL
  data_limite    TEXT NOT NULL DEFAULT '',
  responsavel    TEXT NOT NULL DEFAULT '',
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, ordem   INTEGER, horario TEXT NOT NULL DEFAULT '');
CREATE TABLE crm_contatos (
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
CREATE TABLE crm_interacoes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  contato_id INTEGER NOT NULL,
  data       TEXT NOT NULL DEFAULT '',
  canal      TEXT NOT NULL DEFAULT '',        -- whatsapp, ligação, reserva…
  resumo     TEXT NOT NULL DEFAULT '',
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE cliente_notas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  texto      TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE fornecedores (
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
CREATE TABLE custos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  ordem          INTEGER,
  item           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  quantidade     REAL NOT NULL DEFAULT 1,
  valor          REAL,                             -- valor total do item, em reais
  fornecedor_id  INTEGER,                          -- vínculo com fornecedores (opcional)
  status         TEXT NOT NULL DEFAULT 'pendente', -- pago | andamento | pendente
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, forma_pagamento TEXT NOT NULL DEFAULT '', parcelas        INTEGER, valor_pago      REAL NOT NULL DEFAULT 0, vencimento TEXT NOT NULL DEFAULT '', data_pagamento TEXT NOT NULL DEFAULT '');
CREATE TABLE subitens (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   INTEGER NOT NULL,
  ordem     INTEGER,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE subtarefas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id  INTEGER NOT NULL,
  ordem      INTEGER,
  titulo     TEXT NOT NULL,
  concluido  INTEGER NOT NULL DEFAULT 0,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE op_itens (
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
, etapa_id INTEGER, categoria_id INTEGER, responsavel  TEXT NOT NULL DEFAULT '', status       TEXT NOT NULL DEFAULT 'afazer', data_limite  TEXT NOT NULL DEFAULT '', responsavel_auto INTEGER NOT NULL DEFAULT 0);
CREATE TABLE op_fases (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL,
  tipo           TEXT NOT NULL,              -- pesquisa|negociacao|contratacao|confirmacao|execucao|avaliacao
  ordem          INTEGER NOT NULL,           -- 1..6
  status         TEXT NOT NULL DEFAULT 'afazer', -- afazer|andamento|concluido|nao_utilizada
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE op_microtarefas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fase_id     INTEGER NOT NULL,
  titulo      TEXT NOT NULL,
  concluido   INTEGER NOT NULL DEFAULT 0,
  ordem       INTEGER,
  -- extras da fase Execução/Entrega:
  data        TEXT NOT NULL DEFAULT '',      -- 'YYYY-MM-DD' ou rótulo do dia
  horario     TEXT NOT NULL DEFAULT '',      -- horário previsto: "08:00"
  responsavel TEXT NOT NULL DEFAULT '',
  tipo        TEXT NOT NULL DEFAULT 'fixa',  -- ajustavel|fixa (comportamento na agenda)
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE campo_dias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id INTEGER NOT NULL,
  rotulo    TEXT NOT NULL,                   -- "Dia 1 — Chegada e boas-vindas"
  data      TEXT NOT NULL DEFAULT '',        -- 'YYYY-MM-DD' (opcional)
  ordem     INTEGER
);
CREATE TABLE campo_tarefas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  dia_id         INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  h_planejado    TEXT NOT NULL DEFAULT '',   -- "08:00"
  h_realizado    TEXT NOT NULL DEFAULT '',   -- "08:12"
  responsavel    TEXT NOT NULL DEFAULT '',
  tipo           TEXT NOT NULL DEFAULT 'ajustavel', -- ajustavel|fixa
  status         TEXT NOT NULL DEFAULT 'afazer',    -- afazer|andamento|concluido
  ordem          INTEGER,
  observacoes    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, data_limite TEXT NOT NULL DEFAULT '', fornecedor_id INTEGER);
CREATE TABLE campo_subtarefas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id INTEGER NOT NULL,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  ordem     INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE mcp_clients (
  client_id     TEXT PRIMARY KEY,
  redirect_uris TEXT NOT NULL DEFAULT '[]',   -- JSON array de URIs permitidas
  nome          TEXT NOT NULL DEFAULT '',
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE mcp_codes (
  code           TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  redirect_uri   TEXT NOT NULL,
  code_challenge TEXT NOT NULL DEFAULT '',
  papel          TEXT NOT NULL DEFAULT 'equipe',  -- admin | equipe
  expira_em      INTEGER NOT NULL                 -- epoch segundos
);
CREATE TABLE historico (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_tipo TEXT NOT NULL,        -- 'op_item' | 'campo_tarefa' | 'item'
  parent_id   INTEGER NOT NULL,
  texto       TEXT NOT NULL,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE anexos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_tipo  TEXT NOT NULL,        -- 'op_item' | 'campo_tarefa' | 'item'
  parent_id    INTEGER NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tipo_mime    TEXT NOT NULL DEFAULT '',
  tamanho      INTEGER NOT NULL DEFAULT 0,
  r2_key       TEXT NOT NULL,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por   TEXT NOT NULL DEFAULT ''
);
CREATE TABLE etapas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nome              TEXT NOT NULL,
  ordem             INTEGER,
  ativo             INTEGER NOT NULL DEFAULT 1,
  redireciona_campo INTEGER NOT NULL DEFAULT 0,  -- liga a etapa à tela "Operação em Campo" em vez de mostrar fases
  criado_em         TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por    TEXT NOT NULL DEFAULT ''
);
CREATE TABLE categorias (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  ordem          INTEGER,
  ativo          INTEGER NOT NULL DEFAULT 1,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE op_tarefas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id   INTEGER NOT NULL,
  ordem     INTEGER,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
, status       TEXT NOT NULL DEFAULT 'afazer', responsavel  TEXT NOT NULL DEFAULT '', data_limite  TEXT NOT NULL DEFAULT '', observacoes  TEXT NOT NULL DEFAULT '', responsavel_auto INTEGER NOT NULL DEFAULT 0);
CREATE TABLE prazos_padrao (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nivel          TEXT NOT NULL,
  etapa_id       INTEGER NOT NULL,
  categoria_id   INTEGER NOT NULL DEFAULT 0,
  topico_nome    TEXT NOT NULL DEFAULT '',
  dias           INTEGER,
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE prazos_evento (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  nivel          TEXT NOT NULL,
  etapa_id       INTEGER NOT NULL,
  categoria_id   INTEGER NOT NULL DEFAULT 0,
  topico_nome    TEXT NOT NULL DEFAULT '',
  dias           INTEGER,
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE focos_do_dia (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  texto          TEXT NOT NULL,
  ordem          INTEGER,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE responsaveis_evento (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  nivel          TEXT NOT NULL,
  etapa_id       INTEGER NOT NULL,
  categoria_id   INTEGER NOT NULL DEFAULT 0,
  topico_nome    TEXT NOT NULL DEFAULT '',
  responsavel    TEXT NOT NULL DEFAULT '',
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE financeiro_receber (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id       INTEGER NOT NULL,
  ordem           INTEGER,
  cliente         TEXT NOT NULL DEFAULT '',
  forma_pagamento TEXT NOT NULL DEFAULT '',
  parcela         TEXT NOT NULL DEFAULT '',
  valor_previsto  REAL,
  valor_recebido  REAL NOT NULL DEFAULT 0,
  vencimento      TEXT NOT NULL DEFAULT '',
  data_pagamento  TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pendente',   -- pendente | parcial | pago
  observacoes     TEXT NOT NULL DEFAULT '',
  atualizado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por  TEXT NOT NULL DEFAULT ''
, cliente_id INTEGER);
CREATE TABLE registros_utv (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id     INTEGER NOT NULL,
  condicao_geral TEXT NOT NULL DEFAULT '',
  observacoes    TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por     TEXT NOT NULL DEFAULT ''
);
CREATE TABLE centros_custo (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  ordem          INTEGER,
  ativo          INTEGER NOT NULL DEFAULT 1,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, lista_compras INTEGER NOT NULL DEFAULT 0);
CREATE TABLE financeiro_parcelas (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  receber_id       INTEGER NOT NULL,
  descricao        TEXT NOT NULL DEFAULT 'Parcela',
  vencimento       TEXT NOT NULL DEFAULT '',
  valor_previsto   REAL NOT NULL DEFAULT 0,
  valor_recebido   REAL,               -- NULL = ainda não recebida
  data_recebimento TEXT NOT NULL DEFAULT '',
  forma_pagamento  TEXT NOT NULL DEFAULT '',
  observacoes      TEXT NOT NULL DEFAULT '',
  criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em    TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por   TEXT NOT NULL DEFAULT ''
);
CREATE TABLE pagamentos_terceiros (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  descricao      TEXT NOT NULL DEFAULT '',
  cliente_id     INTEGER,
  cliente_nome   TEXT NOT NULL DEFAULT '',
  valor          REAL,
  pago           INTEGER NOT NULL DEFAULT 0,
  data_pagamento TEXT NOT NULL DEFAULT '',
  observacoes    TEXT NOT NULL DEFAULT '',
  ordem          INTEGER,
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
, fornecedor_id INTEGER);
CREATE TABLE op_subtarefas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id INTEGER NOT NULL,
  ordem     INTEGER,
  titulo    TEXT NOT NULL,
  concluido INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE prog_acontecimentos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL,
  data           TEXT NOT NULL DEFAULT '',
  nome           TEXT NOT NULL,
  categoria      TEXT NOT NULL DEFAULT '',
  ordem          INTEGER,
  status         TEXT NOT NULL DEFAULT 'afazer',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT NOT NULL DEFAULT ''
);
CREATE TABLE prog_tarefas (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  acontecimento_id  INTEGER NOT NULL,
  ordem             INTEGER,
  titulo            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'afazer',
  responsavel       TEXT NOT NULL DEFAULT '',
  data_limite       TEXT NOT NULL DEFAULT '',
  fornecedor_id     INTEGER,
  observacoes       TEXT NOT NULL DEFAULT '',
  criado_em         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE prog_subtarefas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tarefa_id  INTEGER NOT NULL,
  ordem      INTEGER,
  titulo     TEXT NOT NULL,
  concluido  INTEGER NOT NULL DEFAULT 0,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE cardapio_forms (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id      INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  -- pedaço do link público: /cardapio/<slug>
  slug           TEXT NOT NULL UNIQUE,
  titulo         TEXT NOT NULL DEFAULT 'Cardápio da expedição',
  subtitulo      TEXT NOT NULL DEFAULT '',
  descricao      TEXT NOT NULL DEFAULT '',
  -- perguntas em JSON: [{id,rotulo,tipo,opcoes[],obrigatorio,ajuda}]
  -- tipo: texto | numero | escolha | multi | sim_nao | obs
  perguntas      TEXT NOT NULL DEFAULT '[]',
  aberto         INTEGER NOT NULL DEFAULT 1,
  prazo          TEXT NOT NULL DEFAULT '',
  agradecimento  TEXT NOT NULL DEFAULT '',
  -- token do CSV: deixa a planilha do Google puxar sem expor a chave do sistema
  token_planilha TEXT NOT NULL,
  criado_em      TEXT DEFAULT (datetime('now','localtime'))
, sobretitulo TEXT NOT NULL DEFAULT '', nota_rodape TEXT NOT NULL DEFAULT '');
CREATE TABLE cardapio_respostas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id    INTEGER NOT NULL REFERENCES cardapio_forms(id) ON DELETE CASCADE,
  -- respostas em JSON: {id_da_pergunta: valor}
  respostas  TEXT NOT NULL DEFAULT '{}',
  -- desnormalizado só para listar e ordenar rápido
  nome       TEXT NOT NULL DEFAULT '',
  contato    TEXT NOT NULL DEFAULT '',
  criado_em  TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE tarefa_responsaveis (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  ordem     INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE perfis (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  admin         INTEGER NOT NULL DEFAULT 0,
  permissoes    TEXT NOT NULL DEFAULT '[]',   -- JSON: ["financeiro.acessar", ...]
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE usuarios (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash     TEXT NOT NULL,
  -- v4.9: NULO quer dizer permissão individual, na coluna abaixo. Exatamente um dos dois
  -- vale por pessoa; o servidor recusa mandar os dois (ver migracao_v4_9.sql).
  perfil_id      INTEGER,
  permissoes     TEXT NOT NULL DEFAULT '[]',
  ativo          INTEGER NOT NULL DEFAULT 1,
  falhas_login   INTEGER NOT NULL DEFAULT 0,  -- tentativas erradas seguidas
  bloqueado_ate  TEXT NOT NULL DEFAULT '',    -- 5 erros seguidos bloqueiam 15 min
  ultimo_acesso  TEXT NOT NULL DEFAULT '',
  criado_em      TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em   TEXT NOT NULL
);
CREATE TABLE auditoria (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  quando    TEXT NOT NULL DEFAULT (datetime('now')),
  papel     TEXT NOT NULL,              -- admin | equipe   (ryze entra no S4)
  porta     TEXT NOT NULL,              -- painel | mcp
  acao      TEXT NOT NULL,              -- "DELETE /api/eventos/12" ou "excluir_tarefa"
  alvo      TEXT,                       -- id, slug ou nome curto do alvo
  resumo    TEXT,                       -- contexto curto, escrito à mão, SEM dado de pessoa
  resultado TEXT NOT NULL               -- ok | negado | recusado | erro
);
CREATE TABLE catalogo_pecas (
  slug   TEXT PRIMARY KEY,
  nome   TEXT NOT NULL,
  oque   TEXT NOT NULL,              -- o que o valor cobre, na linguagem do acordo
  campos TEXT NOT NULL DEFAULT '[]', -- JSON: [{campo, rotulo, origem, obrigatorio}]
  ordem  INTEGER NOT NULL DEFAULT 0,
  ativo  INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE briefing (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id   INTEGER NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'aberto',   -- aberto | fechado
  aberto_em   TEXT NOT NULL DEFAULT (datetime('now')),
  fechado_em  TEXT,
  fechado_por TEXT
);
CREATE TABLE briefing_campo (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  briefing_id INTEGER NOT NULL,
  peca        TEXT NOT NULL,
  campo       TEXT NOT NULL,
  valor       TEXT,
  origem      TEXT NOT NULL DEFAULT 'pessoa',   -- sistema | pessoa
  UNIQUE (briefing_id, peca, campo)
);
CREATE TABLE pedido_extra (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id     INTEGER,
  pedido        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pendente_orcamento',  -- pendente_orcamento | orcado | aprovado | recusado
  valor         INTEGER,
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por    TEXT NOT NULL DEFAULT '',
  respondido_em TEXT
);
DELETE FROM sqlite_sequence;
CREATE INDEX idx_itens_evento ON itens(evento_id);
CREATE INDEX idx_cli_evento ON clientes(evento_id);
CREATE INDEX idx_cli_contato ON clientes(contato_id);
CREATE INDEX idx_pag_cliente ON pagamentos(cliente_id);
CREATE INDEX idx_cen_evento ON cenarios(evento_id);
CREATE INDEX idx_lin_cenario ON cenario_linhas(cenario_id);
CREATE INDEX idx_qua_evento ON quartos(evento_id);
CREATE INDEX idx_alo_quarto ON alocacoes(quarto_id);
CREATE INDEX idx_int_contato ON crm_interacoes(contato_id);
CREATE INDEX idx_nota_cliente ON cliente_notas(cliente_id);
CREATE INDEX idx_custos_evento ON custos(evento_id);
CREATE INDEX idx_custos_forn   ON custos(fornecedor_id);
CREATE INDEX idx_subitens_item ON subitens(item_id);
CREATE INDEX idx_subtarefas_tarefa ON subtarefas(tarefa_id);
CREATE INDEX idx_op_itens_evento ON op_itens(evento_id);
CREATE INDEX idx_op_fases_item ON op_fases(item_id);
CREATE INDEX idx_op_micro_fase ON op_microtarefas(fase_id);
CREATE INDEX idx_campo_dias_evento ON campo_dias(evento_id);
CREATE INDEX idx_campo_tarefas_dia ON campo_tarefas(dia_id);
CREATE INDEX idx_campo_sub_tarefa ON campo_subtarefas(tarefa_id);
CREATE INDEX idx_historico_parent ON historico(parent_tipo, parent_id);
CREATE INDEX idx_anexos_parent ON anexos(parent_tipo, parent_id);
CREATE INDEX idx_op_tarefas_item ON op_tarefas(item_id);
CREATE UNIQUE INDEX idx_prazos_padrao_chave
  ON prazos_padrao(nivel, etapa_id, categoria_id, topico_nome);
CREATE UNIQUE INDEX idx_prazos_evento_chave
  ON prazos_evento(evento_id, nivel, etapa_id, categoria_id, topico_nome);
CREATE INDEX idx_prazos_evento_evento ON prazos_evento(evento_id);
CREATE UNIQUE INDEX idx_responsaveis_evento_chave
  ON responsaveis_evento(evento_id, nivel, etapa_id, categoria_id, topico_nome);
CREATE INDEX idx_responsaveis_evento_evento ON responsaveis_evento(evento_id);
CREATE INDEX idx_financeiro_receber_evento ON financeiro_receber(evento_id);
CREATE INDEX idx_financeiro_receber_cliente ON financeiro_receber(cliente_id);
CREATE INDEX idx_registros_utv_cliente ON registros_utv(cliente_id);
CREATE INDEX idx_fin_parcelas_receber ON financeiro_parcelas(receber_id);
CREATE INDEX idx_pagterc_evento ON pagamentos_terceiros(evento_id);
CREATE INDEX idx_op_sub_tarefa ON op_subtarefas(tarefa_id);
CREATE INDEX idx_prog_ac_evento ON prog_acontecimentos(evento_id);
CREATE INDEX idx_prog_tarefas_ac ON prog_tarefas(acontecimento_id);
CREATE INDEX idx_prog_sub_tarefa ON prog_subtarefas(tarefa_id);
CREATE INDEX idx_cardapio_forms_evento ON cardapio_forms(evento_id);
CREATE INDEX idx_cardapio_respostas_form ON cardapio_respostas(form_id, id DESC);
CREATE INDEX idx_usuarios_perfil ON usuarios(perfil_id);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);
CREATE INDEX idx_auditoria_quando ON auditoria(quando DESC);
CREATE INDEX idx_briefing_campo ON briefing_campo(briefing_id, peca);
CREATE INDEX idx_pedido_status ON pedido_extra(status, id DESC);
