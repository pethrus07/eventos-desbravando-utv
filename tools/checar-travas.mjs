/**
 * TRAVAS DE DESTRUIÇÃO E REGISTRO — os portões do S0 e do S1 do docs/ROADMAP.md.
 *
 *   node --import ./tools/html-como-texto.mjs tools/checar-travas.mjs
 *
 * O roadmap diz que sprint sem portão verificável não termina, só para de ser mencionado.
 * Este arquivo é o portão: ou os casos abaixo respondem o esperado, ou o S0 e o S1 não
 * estão prontos.
 *
 * O que confere, nas DUAS portas:
 *
 *   S0 · apagar expedição sem confirmar devolve 400 com a contagem do que sumiria, e não
 *        toca em nada; com o nome exato, apaga
 *   S0 · excluir_tarefa pelo MCP sem confirmar devolve o resumo e NÃO apaga; com o título,
 *        apaga
 *   S1 · escrita pelo painel vira linha de auditoria, com papel e porta certos
 *   S1 · escrita pelo MCP vira linha de auditoria com o NOME DA FERRAMENTA, não "POST /mcp"
 *   S1 · leitura não polui o log
 *   S1 · corpo de requisição nunca chega ao log (é a regra de LGPD do auditoria.js)
 *
 * O banco é falso de propósito: estas travas são sobre DECISÃO (apagar ou não, registrar ou
 * não), e decisão se testa sem rede e sem dado real. O comportamento do D1 em si é problema
 * do wrangler, não deste arquivo.
 */
import { handleMcp } from "../mcp.js";
import worker from "../worker.js";

const CHAVE_ADMIN = "chave-admin-de-teste";
const CHAVE_EQUIPE = "chave-equipe-de-teste";
const env = { APP_KEY: CHAVE_ADMIN, TEAM_KEY: CHAVE_EQUIPE, MCP_SIGNING_KEY: "assinatura-de-teste" };

const falhas = [];
const ok = (t) => console.log(`  ok    ${t}`);
const falhou = (t, d) => {
  console.log(`  FALHA ${t}`);
  if (d) console.log(`        ${d}`);
  falhas.push(t);
};

/* ---------------------------------------------- banco falso */
/* Responde por trecho do SQL. O que não casar devolve null, que é o que o D1 faz quando
   não acha — assim um SELECT que eu esqueci não finge sucesso. */
function banco(respostas) {
  const feito = [];
  const achar = (sql) => {
    for (const [trecho, valor] of Object.entries(respostas)) if (sql.includes(trecho)) return valor;
    return null;
  };
  const db = {
    feito,
    prepare(sql) {
      const st = {
        _args: [],
        bind(...a) {
          st._args = a;
          return st;
        },
        async first() {
          feito.push({ sql, args: st._args, op: "first" });
          return achar(sql);
        },
        async all() {
          feito.push({ sql, args: st._args, op: "all" });
          return { results: achar(sql) ?? [] };
        },
        async run() {
          feito.push({ sql, args: st._args, op: "run" });
          return { meta: { changes: 1, last_row_id: 7 } };
        },
      };
      return st;
    },
  };
  return db;
}

const apagou = (db) => db.feito.filter((f) => f.op === "run" && /^\s*DELETE FROM/i.test(f.sql));
const logs = (db) => db.feito.filter((f) => /INSERT INTO auditoria/.test(f.sql));
const colunas = ["papel", "porta", "acao", "alvo", "resumo", "resultado"];
const linhaLog = (f) => Object.fromEntries(colunas.map((c, i) => [c, f.args[i]]));

const pedir = (caminho, { metodo = "GET", chave = CHAVE_ADMIN, corpo } = {}) =>
  new Request(`http://local${caminho}`, {
    method: metodo,
    headers: { "x-app-key": chave, "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

/* ---------------------------------------------- S0 · expedição */
const RESPOSTAS_EVENTO = {
  "SELECT nome FROM eventos": { nome: "Expedição Origens" },
  "COUNT(*) n FROM clientes": { n: 12 },
  "COUNT(*) n FROM itens": { n: 48 },
  "COUNT(*) n FROM custos": { n: 9 },
  "COUNT(*) n FROM pagamentos": { n: 20 },
};

{
  const db = banco(RESPOSTAS_EVENTO);
  const r = await worker.fetch(pedir("/api/eventos/13", { metodo: "DELETE", corpo: {} }), { ...env, DB: db });
  const corpo = await r.json();
  if (r.status !== 400) falhou("S0 · expedição sem confirmar barra", `status ${r.status}, esperava 400`);
  else if (!corpo.seria_apagado?.clientes) falhou("S0 · expedição sem confirmar barra", "não disse o que seria apagado");
  else if (apagou(db).length) falhou("S0 · expedição sem confirmar barra", `apagou ${apagou(db).length} tabela(s) mesmo assim`);
  else ok(`S0 · expedição sem confirmar barra (400, avisa ${corpo.seria_apagado.clientes} clientes, 0 DELETE)`);
}

{
  const db = banco(RESPOSTAS_EVENTO);
  const r = await worker.fetch(
    pedir("/api/eventos/13", { metodo: "DELETE", corpo: { confirmar: "Expedição errada" } }),
    { ...env, DB: db }
  );
  if (r.status !== 400) falhou("S0 · nome errado não apaga", `status ${r.status}`);
  else if (apagou(db).length) falhou("S0 · nome errado não apaga", "apagou com o nome errado");
  else ok("S0 · nome errado não apaga");
}

{
  const db = banco(RESPOSTAS_EVENTO);
  const r = await worker.fetch(
    pedir("/api/eventos/13", { metodo: "DELETE", corpo: { confirmar: "Expedição Origens" } }),
    { ...env, DB: db }
  );
  const n = apagou(db).length;
  if (r.status !== 200) falhou("S0 · com o nome exato, apaga", `status ${r.status}`);
  else if (n < 10) falhou("S0 · com o nome exato, apaga", `só ${n} DELETE — a cascata não rodou inteira`);
  else ok(`S0 · com o nome exato, apaga (${n} tabelas na cascata)`);
}

{
  const db = banco(RESPOSTAS_EVENTO);
  const r = await worker.fetch(
    pedir("/api/eventos/13", { metodo: "DELETE", chave: CHAVE_EQUIPE, corpo: { confirmar: "Expedição Origens" } }),
    { ...env, DB: db }
  );
  if (r.status !== 403) falhou("S0 · equipe não apaga expedição", `status ${r.status}, esperava 403`);
  else if (apagou(db).length) falhou("S0 · equipe não apaga expedição", "apagou mesmo assim");
  else ok("S0 · equipe não apaga expedição (403)");
}

/* ---------------------------------------------- S0 · MCP */
const chamarMcp = async (nome, args, chave = CHAVE_EQUIPE, db) => {
  const req = new Request("http://local/mcp", {
    method: "POST",
    headers: { "x-app-key": chave, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: nome, arguments: args } }),
  });
  const r = await handleMcp(req, { ...env, DB: db });
  const j = await r.json();
  let conteudo = j.result?.content?.[0]?.text;
  try {
    conteudo = JSON.parse(conteudo);
  } catch {}
  return conteudo;
};

const RESPOSTAS_TAREFA = {
  "SELECT titulo FROM tarefas": { titulo: "Comprar gelo e bebidas" },
  "COUNT(*) n FROM subtarefas": { n: 3 },
};

{
  const db = banco(RESPOSTAS_TAREFA);
  const out = await chamarMcp("excluir_tarefa", { tarefa_id: 5 }, CHAVE_EQUIPE, db);
  if (!out?.confirmacao_necessaria) falhou("S0 · MCP sem confirmar pede confirmação", JSON.stringify(out).slice(0, 90));
  else if (apagou(db).length) falhou("S0 · MCP sem confirmar pede confirmação", "apagou mesmo assim");
  else if (out.seria_apagado?.subtarefas !== 3) falhou("S0 · MCP sem confirmar pede confirmação", "não contou as subtarefas");
  else ok("S0 · MCP sem confirmar pede confirmação (0 DELETE, avisa 3 subtarefas)");
}

{
  const db = banco(RESPOSTAS_TAREFA);
  const out = await chamarMcp("excluir_tarefa", { tarefa_id: 5, confirmar: "Comprar gelo e bebidas" }, CHAVE_EQUIPE, db);
  if (out?.confirmacao_necessaria) falhou("S0 · MCP com o título, apaga", "ainda pediu confirmação");
  else if (apagou(db).length < 2) falhou("S0 · MCP com o título, apaga", `${apagou(db).length} DELETE, esperava 2`);
  else ok("S0 · MCP com o título, apaga (tarefa + subtarefas)");
}

/* ---------------------------------------------- S1 · registro */
{
  const db = banco(RESPOSTAS_EVENTO);
  await worker.fetch(pedir("/api/eventos/13", { metodo: "DELETE", corpo: {} }), { ...env, DB: db });
  const l = logs(db).map(linhaLog);
  if (l.length !== 1) falhou("S1 · painel registra a escrita", `${l.length} linha(s) de log`);
  else if (l[0].porta !== "painel" || l[0].papel !== "admin") falhou("S1 · painel registra a escrita", JSON.stringify(l[0]));
  else if (l[0].resultado !== "recusado") falhou("S1 · painel registra a escrita", `resultado "${l[0].resultado}", esperava "recusado"`);
  else ok(`S1 · painel registra a escrita (${l[0].papel} · ${l[0].acao} · ${l[0].resultado})`);
}

{
  const db = banco(RESPOSTAS_EVENTO);
  await worker.fetch(pedir("/api/eventos/13", { metodo: "GET" }), { ...env, DB: db });
  if (logs(db).length) falhou("S1 · leitura não polui o log", `${logs(db).length} linha(s) para um GET`);
  else ok("S1 · leitura não polui o log");
}

{
  const db = banco(RESPOSTAS_TAREFA);
  await chamarMcp("excluir_tarefa", { tarefa_id: 5, confirmar: "Comprar gelo e bebidas" }, CHAVE_EQUIPE, db);
  const l = logs(db).map(linhaLog);
  if (l.length !== 1) falhou("S1 · MCP registra pelo nome da ferramenta", `${l.length} linha(s)`);
  else if (l[0].acao !== "excluir_tarefa") falhou("S1 · MCP registra pelo nome da ferramenta", `acao "${l[0].acao}"`);
  else if (l[0].porta !== "mcp" || l[0].papel !== "equipe") falhou("S1 · MCP registra pelo nome da ferramenta", JSON.stringify(l[0]));
  else ok(`S1 · MCP registra pelo nome da ferramenta (${l[0].papel} · ${l[0].acao} · ${l[0].resultado})`);
}

{
  const db = banco(RESPOSTAS_TAREFA);
  await chamarMcp("listar_tarefas", {}, CHAVE_EQUIPE, db);
  if (logs(db).length) falhou("S1 · leitura pelo MCP não polui", `${logs(db).length} linha(s) para listar_tarefas`);
  else ok("S1 · leitura pelo MCP não polui");
}

{
  /* A regra de LGPD do auditoria.js: nenhum valor do CORPO pode acabar numa coluna do log. */
  const db = banco(RESPOSTAS_EVENTO);
  const segredo = "529.874.310-22";
  await worker.fetch(
    pedir("/api/eventos/13", { metodo: "DELETE", corpo: { confirmar: "errado", cpf: segredo } }),
    { ...env, DB: db }
  );
  const vazou = logs(db).some((f) => f.args.some((v) => String(v ?? "").includes(segredo)));
  if (vazou) falhou("S1 · corpo da requisição não chega ao log", "achei o CPF de teste numa coluna");
  else ok("S1 · corpo da requisição não chega ao log");
}

/* ---------------------------------------------- S2/S3 · briefing de comunicação */
const CATALOGO = [
  {
    slug: "cronograma_dia", nome: "Cronograma por dia", oque: "uma peça por dia",
    campos: JSON.stringify([
      { campo: "agenda", rotulo: "Agenda", origem: "sistema", obrigatorio: 1 },
      { campo: "briefing_hora", rotulo: "Hora do briefing", origem: "pessoa", obrigatorio: 0 },
    ]),
  },
  {
    slug: "carta", nome: "Carta de boas-vindas", oque: "a carta da chegada",
    campos: JSON.stringify([{ campo: "texto", rotulo: "Texto", origem: "pessoa", obrigatorio: 1 }]),
  },
];

const RESPOSTAS_BRIEFING = {
  "FROM catalogo_pecas": CATALOGO,
  "FROM briefing WHERE evento_id": { id: 1, evento_id: 13, status: "aberto", fechado_em: null },
  "FROM campo_tarefas t": [{ dia: "Sexta", hora: "08h30", nome: "Saída" }],
  "FROM briefing_campo WHERE briefing_id": [],
};

{
  const db = banco(RESPOSTAS_BRIEFING);
  const out = await chamarMcp("abrir_briefing", { evento_id: 13 }, CHAVE_EQUIPE, db);
  /* 'sistema' é literal no SQL, não argumento ligado — procurar em `args` falhava sempre. */
  const deduziu = db.feito.some((f) => /INSERT INTO briefing_campo/.test(f.sql) && /'sistema'/.test(f.sql));
  if (!out?.existe) falhou("S2 · abrir_briefing responde", JSON.stringify(out).slice(0, 90));
  else if (!deduziu) falhou("S2 · pré-preenche do que o sistema sabe", "nenhum campo com origem=sistema");
  else ok("S2 · abrir_briefing pré-preenche do que o sistema já sabe");
}

{
  const db = banco(RESPOSTAS_BRIEFING);
  const out = await chamarMcp(
    "preencher_briefing",
    { evento_id: 13, valores: [{ peca: "carta", campo: "texto", valor: "Bem-vindo" }, { peca: "carta", campo: "inventado", valor: "x" }] },
    CHAVE_EQUIPE, db
  );
  if (out?.gravados !== 1) falhou("S2 · campo fora do catálogo é recusado", `gravados=${out?.gravados}`);
  else if (out.recusados?.length !== 1) falhou("S2 · campo fora do catálogo é recusado", "o inventado passou");
  else ok("S2 · grava o que existe e DEVOLVE o campo inventado");
}

{
  const db = banco(RESPOSTAS_BRIEFING);
  const out = await chamarMcp("fechar_briefing", { evento_id: 13 }, CHAVE_EQUIPE, db);
  const travou = db.feito.some((f) => /UPDATE briefing SET status='fechado'/.test(f.sql));
  if (out?.fechado !== false) falhou("S3 · não fecha com obrigatório vazio", JSON.stringify(out).slice(0, 80));
  else if (travou) falhou("S3 · não fecha com obrigatório vazio", "travou mesmo assim");
  else ok(`S3 · não fecha com campo obrigatório vazio (${out.faltando.length} faltando)`);
}

{
  const db = banco({
    ...RESPOSTAS_BRIEFING,
    "FROM briefing_campo WHERE briefing_id": [
      { peca: "cronograma_dia", campo: "agenda", valor: "Sexta 08h30", origem: "sistema" },
      { peca: "carta", campo: "texto", valor: "Bem-vindo", origem: "pessoa" },
    ],
  });
  const out = await chamarMcp("fechar_briefing", { evento_id: 13, quem: "Gustavo" }, CHAVE_EQUIPE, db);
  const travou = db.feito.some((f) => /UPDATE briefing SET status='fechado'/.test(f.sql));
  if (out?.fechado !== true || !travou) falhou("S3 · fecha e trava quando completo", JSON.stringify(out).slice(0, 80));
  else ok("S3 · fecha e trava quando está completo (o prazo começa aqui)");
}

{
  const db = banco({});
  const out = await chamarMcp("registrar_pedido_extra", { pedido: "um banner gigante pro portal" }, CHAVE_EQUIPE, db);
  const virouTrabalho = db.feito.some((f) => /INSERT INTO (briefing_campo|itens|tarefas)/.test(f.sql));
  if (out?.status !== "pendente_orcamento") falhou("S3 · pedido extra nasce inerte", JSON.stringify(out).slice(0, 80));
  else if (virouTrabalho) falhou("S3 · pedido extra nasce inerte", "virou trabalho em alguma tabela");
  else ok("S3 · pedido fora do catálogo nasce inerte (0 trabalho criado)");
}

console.log(falhas.length ? `\n${falhas.length} falha(s). NÃO PUBLIQUE.` : "\nS0 e S1 passam — pode publicar.");
process.exit(falhas.length ? 1 : 0);
