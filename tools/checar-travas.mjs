/**
 * TRAVA DE COMPORTAMENTO — reancorada em 14/10/2026 na base RECUPERADA DA PRODUÇÃO.
 *
 *   node --import ./tools/html-como-texto.mjs tools/checar-travas.mjs
 *
 * POR QUE ELA ENCOLHEU: a versão anterior tinha 21 casos, escritos contra o `worker.js` deste
 * checkout. Em 14/10 descobrimos que **o que está em produção é outro código** — 53 tabelas
 * contra 25, login com perfis e sessões, módulo financeiro com 264 contas a receber — e que o
 * checkout estava parado desde agosto. O worker foi substituído pelo que está no ar, e os
 * casos que testavam o código antigo passaram a medir algo que não existe mais.
 *
 * Trava ancorada no que não está no ar mede a coisa errada, e com a autoridade de quem acerta.
 * Então ficou só o que vale para a base de verdade.
 *
 * ⚠️ O QUE SE PERDEU NA TROCA e precisa voltar — não está testado porque não está feito:
 *   · confirmação em duas etapas para apagar expedição e nas ferramentas `excluir_*` do MCP
 *     (era o S0, escrito sobre o worker antigo);
 *   · as 6 ferramentas de briefing no conector MCP — a produção tem outro `mcp.js`.
 *   Está anotado em docs/ROADMAP.md.
 */
import worker from "../worker.js";
import * as briefing from "../briefing.js";

const CHAVE = "chave-de-teste";
const env = { APP_KEY: CHAVE, TEAM_KEY: "equipe-de-teste", MCP_SIGNING_KEY: "assinatura" };

const falhas = [];
const ok = (t) => console.log(`  ok    ${t}`);
const falhou = (t, d) => {
  console.log(`  FALHA ${t}`);
  if (d) console.log(`        ${d}`);
  falhas.push(t);
};

/* Banco falso: responde por trecho do SQL. O que não casar devolve null, que é o que o D1 faz
   quando não acha — assim um SELECT esquecido não finge sucesso. */
function banco(respostas = {}) {
  const feito = [];
  const achar = (sql) => {
    for (const [t, v] of Object.entries(respostas)) if (sql.includes(t)) return v;
    return null;
  };
  return {
    feito,
    prepare(sql) {
      const st = {
        _args: [],
        bind(...a) { st._args = a; return st; },
        async first() { feito.push({ sql, args: st._args }); return achar(sql); },
        async all() { feito.push({ sql, args: st._args }); return { results: achar(sql) ?? [] }; },
        async run() { feito.push({ sql, args: st._args }); return { meta: { changes: 1, last_row_id: 1 } }; },
      };
      return st;
    },
  };
}
const logs = (db) => db.feito.filter((f) => /INSERT INTO auditoria/.test(f.sql));
const COLS = ["papel", "porta", "acao", "alvo", "resumo", "resultado"];
const linha = (f) => Object.fromEntries(COLS.map((c, i) => [c, f.args[i]]));

const pedir = (caminho, metodo = "GET", corpo) =>
  new Request(`http://local${caminho}`, {
    method: metodo,
    headers: { "x-app-key": CHAVE, "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

/* ---------------------------------------------- auditoria, sobre a base nova */
{
  const db = banco({});
  await worker.fetch(pedir("/api/eventos", "POST", { nome: "x" }), { ...env, DB: db });
  const l = logs(db).map(linha);
  if (l.length !== 1) falhou("auditoria · escrita deixa rastro", `${l.length} linha(s)`);
  else if (l[0].porta !== "painel") falhou("auditoria · escrita deixa rastro", JSON.stringify(l[0]));
  else ok(`auditoria · escrita deixa rastro (${l[0].acao} · ${l[0].resultado})`);
}

{
  const db = banco({});
  await worker.fetch(pedir("/api/eventos"), { ...env, DB: db });
  if (logs(db).length) falhou("auditoria · leitura não polui", `${logs(db).length} linha(s) num GET`);
  else ok("auditoria · leitura não polui o log");
}

{
  /* A regra de LGPD do auditoria.js: nenhum valor do CORPO pode acabar numa coluna do log. */
  const db = banco({});
  const cpf = "529.874.310-22";
  await worker.fetch(pedir("/api/eventos", "POST", { nome: "x", cpf }), { ...env, DB: db });
  const vazou = logs(db).some((f) => f.args.some((v) => String(v ?? "").includes(cpf)));
  if (vazou) falhou("auditoria · corpo não vai ao log", "achei o CPF de teste numa coluna");
  else ok("auditoria · corpo da requisição não chega ao log");
}

/* ---------------------------------------------- briefing: módulo próprio, independe da base */
const CATALOGO = [
  { slug: "cronograma_dia", nome: "Cronograma por dia", oque: "uma peça por dia",
    campos: JSON.stringify([{ campo: "agenda", rotulo: "Agenda", origem: "sistema", obrigatorio: 1 }]) },
  { slug: "carta", nome: "Carta", oque: "a carta",
    campos: JSON.stringify([{ campo: "texto", rotulo: "Texto", origem: "pessoa", obrigatorio: 1 }]) },
];
const BASE = {
  "FROM catalogo_pecas": CATALOGO,
  "FROM briefing WHERE evento_id": { id: 1, evento_id: 13, status: "aberto", fechado_em: null },
  "FROM campo_tarefas t": [{ dia: "Sexta", hora: "08h30", nome: "Saída" }],
  "FROM briefing_campo WHERE briefing_id": [],
};

{
  const db = banco(BASE);
  const out = await briefing.abrir(db, 13);
  const deduziu = db.feito.some((f) => /INSERT INTO briefing_campo/.test(f.sql) && /'sistema'/.test(f.sql));
  if (!out?.existe) falhou("briefing · abre", JSON.stringify(out).slice(0, 80));
  else if (!deduziu) falhou("briefing · pré-preenche do sistema", "nenhum campo com origem=sistema");
  else ok("briefing · abre e pré-preenche do que o sistema já sabe");
}

{
  const db = banco(BASE);
  const out = await briefing.preencher(db, 13, [
    { peca: "carta", campo: "texto", valor: "Bem-vindo" },
    { peca: "carta", campo: "inventado", valor: "x" },
  ]);
  if (out.gravados !== 1 || out.recusados.length !== 1)
    falhou("briefing · campo fora do catálogo é recusado", JSON.stringify(out).slice(0, 90));
  else ok("briefing · grava o que existe e devolve o campo inventado");
}

{
  const db = banco(BASE);
  const out = await briefing.fechar(db, 13, "teste");
  const travou = db.feito.some((f) => /UPDATE briefing SET status='fechado'/.test(f.sql));
  if (out.fechado !== false || travou) falhou("briefing · não fecha incompleto", JSON.stringify(out).slice(0, 80));
  else ok(`briefing · não fecha com obrigatório vazio (${out.faltando.length} faltando)`);
}

{
  const db = banco({ ...BASE, "FROM briefing_campo WHERE briefing_id": [
    { peca: "cronograma_dia", campo: "agenda", valor: "Sexta 08h30", origem: "sistema" },
    { peca: "carta", campo: "texto", valor: "Bem-vindo", origem: "pessoa" },
  ] });
  const out = await briefing.fechar(db, 13, "Gustavo");
  const travou = db.feito.some((f) => /UPDATE briefing SET status='fechado'/.test(f.sql));
  if (out.fechado !== true || !travou) falhou("briefing · fecha completo", JSON.stringify(out).slice(0, 80));
  else ok("briefing · fecha e trava quando está completo (o prazo começa aqui)");
}

{
  const db = banco({});
  const out = await briefing.pedirExtra(db, { pedido: "um banner gigante", quem: "Gustavo" });
  const virouTrabalho = db.feito.some((f) => /INSERT INTO (briefing_campo|itens|tarefas)/.test(f.sql));
  if (out.status !== "pendente_orcamento" || virouTrabalho)
    falhou("briefing · pedido extra nasce inerte", JSON.stringify(out).slice(0, 80));
  else ok("briefing · pedido fora do catálogo nasce inerte (0 trabalho criado)");
}

/* ---------------------------------------------- v4.9 · permissão por pessoa

   O modo novo mexe em autenticação, que é onde erro não dá aviso: ou abre demais, ou tranca
   quem deveria entrar. Três coisas valem trava. */
{
  // Os dois modos juntos é pedido ambíguo. Adivinhar qual vale é como nasce permissão que
  // ninguém entende depois.
  const db = banco({ "SELECT id FROM perfis": { id: 2 } });
  const r = await worker.fetch(pedir("/api/usuarios", "POST", {
    nome: "Ana", email: "ana@x.com", senha: "12345678", perfil_id: 2, permissoes: ["financeiro.visualizar"],
  }), { ...env, DB: db });
  const j = await r.json();
  const criou = db.feito.some((f) => /INSERT INTO usuarios/.test(f.sql));
  if (r.status !== 400 || criou) falhou("acessos · perfil E permissões juntos é recusado", `status ${r.status}`);
  else ok("acessos · mandar perfil e permissões juntos é recusado (não escolhe por conta própria)");
}

{
  const db = banco({});
  const r = await worker.fetch(pedir("/api/usuarios", "POST", {
    nome: "Ana", email: "ana@x.com", senha: "12345678",
  }), { ...env, DB: db });
  const criou = db.feito.some((f) => /INSERT INTO usuarios/.test(f.sql));
  if (r.status !== 400 || criou) falhou("acessos · usuário sem nenhum acesso é recusado", `status ${r.status}`);
  else ok("acessos · usuário sem perfil e sem permissão é recusado (conta que não abre nada)");
}

{
  // A trava que importa de verdade: permissão individual NUNCA é administrador, nem quando a
  // lista pede. Admin só vem de perfil, que é o que torna possível auditar quem o tem.
  const db = banco({
    "FROM sessoes s JOIN usuarios u": {
      id: 7, nome: "Ana", email: "ana@x.com", ativo: 1,
      perms_usuario: JSON.stringify(["financeiro.acessar", "financeiro.visualizar", "eventos.excluir"]),
      perfil_id: null, perfil_nome: null, perfil_admin: null, permissoes: null,
    },
  });
  const sessao = new Request("http://local/api/me", { headers: { "x-app-key": "sess_qualquer" } });
  const me = await (await worker.fetch(sessao, { ...env, DB: db })).json();
  if (me.admin !== false || me.papel === "admin")
    falhou("acessos · permissão individual não vira admin", JSON.stringify(me).slice(0, 90));
  else if (!me.permissoes.includes("financeiro.visualizar") || me.permissoes.includes("participantes.excluir"))
    falhou("acessos · permissão individual é exatamente a lista da pessoa", (me.permissoes || []).join(","));
  else ok(`acessos · permissão individual vale sem perfil e nunca é admin (${me.permissoes.length} permissões)`);
}

{
  /* O que /api/me devolve é o que a tela MOSTRA. O que vale mesmo é o portão da rota: se ele
     não olhar a permissão individual, a pessoa vê um painel sem Financeiro e alcança o
     Financeiro por endereço direto. Área que some da tela e responde na API não está
     protegida, está escondida. */
  const quem = {
    id: 7, nome: "Ana", email: "ana@x.com", ativo: 1,
    perms_usuario: JSON.stringify(["participantes.visualizar"]),
    perfil_id: null, perfil_nome: null, perfil_admin: null, permissoes: null,
  };
  const chamar = async (caminho) => {
    const db = banco({ "FROM sessoes s JOIN usuarios u": quem });
    const r = await worker.fetch(
      new Request("http://local" + caminho, { headers: { "x-app-key": "sess_qualquer" } }),
      { ...env, DB: db }
    );
    return r.status;
  };
  const barrado = await chamar("/api/eventos/1/custos");
  const passou = await chamar("/api/eventos/1/clientes");
  if (barrado !== 403) falhou("acessos · área não liberada é barrada na API", `custos devolveu ${barrado}`);
  else if (passou === 403) falhou("acessos · área liberada responde", `clientes devolveu 403`);
  else ok("acessos · o portão da rota lê a permissão individual (403 no Financeiro, passa em Participantes)");
}

/* ---------------------------------------------- exceção vira resposta, nunca tela em branco

   14/10/2026: a aba Comunicação subiu para a produção com o código publicado e a migração do
   briefing NÃO aplicada. `abrir()` estourava com "no such table: briefing", a exceção subia até
   o runtime, NENHUMA resposta voltava e o navegador escrevia "Failed to fetch". O cliente viu
   tela vazia; o monitoramento viu 200 em tudo mais e ficou verde.

   Erro que não vira resposta é erro que ninguém consegue ler. */
{
  const db = { prepare() { throw new Error("explodiu de propósito"); } };
  const r = await worker.fetch(pedir("/api/eventos/27/itens"), { ...env, DB: db });
  const j = await r.json().catch(() => null);
  if (r.status !== 500 || !j || !/explodiu/.test(j.erro || ""))
    falhou("worker · exceção vira 500 em JSON", `status ${r.status}`);
  else ok("worker · exceção em rota vira 500 com JSON (o painel mostra, em vez de sumir)");
}

/* ---------------------------------------------- o esquema do briefing não descolou da migração

   `briefing.js` garante as próprias tabelas porque deploy e migração são dois atos e nada
   obriga os dois a acontecerem. O SQL de lá foi EXTRAÍDO de `migracao_v4_7.sql`; se os dois
   descolarem, o banco que se auto-cura passa a ser diferente do banco migrado à mão — que é a
   divergência mais cara de achar depois. */
{
  const { readFileSync } = await import("node:fs");
  const ler = (n) => readFileSync(new URL("../" + n, import.meta.url), "utf8");
  const limpar = (s) => s.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim();
  const noJs = limpar(ler("briefing.js"));
  const faltando = limpar(ler("migracao_v4_7.sql"))
    .split(";")
    .map(limpar)
    .filter((i) => i && /^(CREATE|INSERT)/i.test(i))
    .filter((i) => !noJs.includes(i));
  if (faltando.length)
    falhou("briefing · esquema igual ao da migração", faltando.map((i) => i.slice(0, 60)).join(" | "));
  else ok("briefing · o esquema embutido é o mesmo da migracao_v4_7.sql");
}

console.log(falhas.length ? `\n${falhas.length} falha(s). NÃO PUBLIQUE.` : "\nTudo que vale para esta base passa.");
process.exit(falhas.length ? 1 : 0);
