
import UI_HTML from "./625554b87883966bcaede4ee007bd4f672091cae-ui.html";

var CORS2 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-app-key"
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS2 }
  });
}
function papel(request, env) {
  const key = request.headers.get("x-app-key") || "";
  if (env.APP_KEY && key === env.APP_KEY) return "admin";
  if (env.TEAM_KEY && key === env.TEAM_KEY) return "equipe";
  return null;
}
var ACOES_PADRAO = [
  ["acessar", "Acessar"],
  ["visualizar", "Visualizar"],
  ["criar", "Criar"],
  ["editar", "Editar"],
  ["excluir", "Excluir"],
  ["exportar", "Exportar"]
];
var ACVCEX = ["acessar", "visualizar", "criar", "editar", "excluir"];
var TODAS = [...ACVCEX, "exportar"];
var MODULOS = [
  { id: "eventos", nome: "Eventos", grupo: "Geral", desc: "Lista de eventos e cadastro (criar, renomear, datas, arquivar, excluir)", acoes: ACVCEX },
  { id: "painel_geral", nome: "Painel Geral", grupo: "Geral", desc: "Resumo dos eventos ativos", acoes: ["acessar", "visualizar", "exportar"] },
  { id: "tarefas", nome: "Tarefas", grupo: "Geral", desc: "Tarefas gerais e foco do dia", acoes: TODAS },
  { id: "crm", nome: "CRM", grupo: "Geral", acoes: TODAS },
  { id: "fornecedores", nome: "Fornecedores", grupo: "Geral", acoes: TODAS },
  { id: "operacao", nome: "Planejamento Operacional", grupo: "Dentro do evento", desc: "T\xF3picos, tarefas, checklist e prazos da expedi\xE7\xE3o", acoes: TODAS },
  { id: "campo", nome: "Campo", grupo: "Dentro do evento", acoes: ACVCEX },
  { id: "agenda", nome: "Agenda", grupo: "Dentro do evento", acoes: ["acessar", "visualizar"] },
  { id: "programacao", nome: "Programa\xE7\xE3o", grupo: "Dentro do evento", acoes: ACVCEX },
  {
    id: "financeiro",
    nome: "Financeiro",
    grupo: "Dentro do evento",
    desc: "Contas a pagar, a receber, terceiros e resultado",
    acoes: TODAS,
    especificas: [
      ["ver_valores", "Visualizar valores (R$)"],
      ["ver_receber", "Visualizar contas a receber"],
      ["dar_baixa", "Dar baixa em pagamentos"],
      ["alterar_valores", "Alterar valores"],
      ["ver_resultado", "Visualizar resultado do evento"]
    ]
  },
  { id: "participantes", nome: "Participantes", grupo: "Dentro do evento", acoes: TODAS },
  { id: "simulador", nome: "Simulador", grupo: "Dentro do evento", acoes: TODAS },
  { id: "hospedagem", nome: "Hospedagem", grupo: "Dentro do evento", acoes: TODAS },
  { id: "etapas", nome: "Etapas", grupo: "Cadastros", acoes: ACVCEX },
  { id: "categorias", nome: "Categorias", grupo: "Cadastros", acoes: ACVCEX },
  { id: "centros_custo", nome: "Centros de Custo", grupo: "Cadastros", acoes: ACVCEX },
  { id: "prazos_padrao", nome: "Prazos Padr\xE3o", grupo: "Cadastros", acoes: ["acessar", "visualizar", "editar"] }
];
var MODULOS_DO_EVENTO = new Set(MODULOS.filter((m) => m.grupo === "Dentro do evento").map((m) => m.id));
function todasPermissoes() {
  const out = [];
  for (const m of MODULOS) {
    for (const a of m.acoes) out.push(m.id + "." + a);
    for (const [e] of m.especificas || []) out.push(m.id + "." + e);
  }
  return out;
}
var PERMISSOES_VALIDAS = new Set(todasPermissoes());
var PERMS_EQUIPE_LEGADO = [
  "eventos.acessar",
  "eventos.visualizar",
  ...["operacao", "campo", "programacao", "tarefas"].flatMap((m) => ACVCEX.map((a) => m + "." + a)),
  "operacao.exportar",
  "agenda.acessar",
  "agenda.visualizar",
  "hospedagem.acessar",
  "hospedagem.visualizar",
  "hospedagem.editar",
  "hospedagem.exportar",
  "tarefas.exportar"
];
function normalizarPermissoes(lista) {
  const out = /* @__PURE__ */ new Set();
  for (const p of Array.isArray(lista) ? lista : []) if (PERMISSOES_VALIDAS.has(p)) out.add(p);
  for (const p of [...out]) {
    const mod = p.split(".")[0];
    out.add(mod + ".acessar");
    out.add(mod + ".visualizar");
    if (MODULOS_DO_EVENTO.has(mod)) {
      out.add("eventos.acessar");
      out.add("eventos.visualizar");
    }
  }
  if (out.has("financeiro.ver_resultado")) out.add("financeiro.ver_receber");
  return [...out].sort();
}
function lerPermissoes(txt) {
  try {
    const a = JSON.parse(txt || "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
var PBKDF2_ITER = 1e5;
var SESSAO_DIAS = 30;
var SENHA_MIN = 8;
var b64 = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), "b64");
var unb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), "unb64");
async function derivarSenha(senha, salt, iter) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, k, 256);
}
async function hashSenha(senha) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(await derivarSenha(senha, salt, PBKDF2_ITER))}`;
}
function iguaisTempoConstante(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function conferirSenha(senha, armazenado) {
  const [alg, iter, salt, hash] = String(armazenado || "").split("$");
  if (alg !== "pbkdf2" || !salt || !hash) return false;
  return iguaisTempoConstante(b64(await derivarSenha(senha, unb64(salt), +iter)), hash);
}
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function novoToken() {
  return "sess_" + [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function autenticar(request, env, db) {
  const key = request.headers.get("x-app-key") || "";
  if (key.startsWith("sess_")) {
    const tokenHash = await sha256Hex(key);
    const r = await db.prepare(`
      SELECT u.id, u.nome, u.email, u.ativo, p.id AS perfil_id, p.nome AS perfil_nome,
             p.admin AS perfil_admin, p.permissoes
      FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id JOIN perfis p ON p.id=u.perfil_id
      WHERE s.token_hash=? AND s.expira_em > datetime('now')`).bind(tokenHash).first();
    if (!r || !r.ativo) return null;
    const admin = !!r.perfil_admin;
    return {
      tipo: "usuario",
      admin,
      tokenHash,
      usuario: { id: r.id, nome: r.nome, email: r.email },
      perfil: { id: r.perfil_id, nome: r.perfil_nome, admin },
      perms: new Set(admin ? [] : lerPermissoes(r.permissoes))
    };
  }
  const p = papel(request, env);
  if (!p) return null;
  return { tipo: "chave", admin: p === "admin", perms: new Set(p === "admin" ? [] : PERMS_EQUIPE_LEGADO) };
}
function montarMe(auth) {
  return {
    papel: auth.admin ? "admin" : "equipe",
    // compat com a interface antiga
    tipo: auth.tipo,
    admin: auth.admin,
    usuario: auth.usuario || null,
    perfil: auth.perfil || null,
    permissoes: auth.admin ? todasPermissoes() : [...auth.perms],
    modulos: MODULOS,
    acoes: ACOES_PADRAO
  };
}
var METODO_ACAO = { GET: "visualizar", POST: "criar", PATCH: "editar", DELETE: "excluir" };
var HIST_MODULO = {
  op_item: "operacao",
  op_tarefa: "operacao",
  item: "operacao",
  campo_tarefa: "campo",
  registro_utv: "participantes",
  cliente_nf_utv: "participantes",
  prog_tarefa: "programacao"
};
function regraRota(path, method) {
  let acao = METODO_ACAO[method];
  if (/\/(reordenar|reajustar)$/.test(path)) acao = "editar";
  const so = /* @__PURE__ */ __name((...mods) => mods.map((md) => md + "." + acao), "so");
  const t = /* @__PURE__ */ __name((re) => re.test(path), "t");
  const GET = method === "GET";
  if (t(/^\/api\/eventos$/) || t(/^\/api\/eventos\/\d+$/)) return so("eventos");
  if (t(/^\/api\/eventos-ativos\/painel$/)) return so("painel_geral");
  if (t(/^\/api\/eventos\/\d+\/itens$/)) return GET ? so("eventos") : so("operacao");
  if (t(/^\/api\/eventos\/\d+\/itens\/reordenar$/) || t(/^\/api\/(itens|subitens)\/\d+(\/subitens)?$/)) return so("operacao");
  if (t(/^\/api\/eventos\/\d+\/clientes$/)) return GET ? ["participantes.visualizar", "financeiro.visualizar"] : so("participantes");
  if (t(/^\/api\/eventos\/\d+\/pessoas-busca$/)) return so("participantes");
  if (t(/^\/api\/clientes\/\d+$/)) return GET ? so("participantes") : so("participantes", "financeiro");
  if (t(/^\/api\/clientes\/\d+\/registros-utv$/) || t(/^\/api\/registros-utv\/\d+$/)) return so("participantes");
  if (t(/^\/api\/clientes\/\d+\/notas$/) || t(/^\/api\/cliente-notas\/\d+$/)) return ["participantes.editar"];
  if (t(/^\/api\/clientes\/\d+\/pagamentos$/)) return ["financeiro.dar_baixa+financeiro.ver_receber"];
  if (t(/^\/api\/pagamentos\/\d+$/)) return ["financeiro.excluir+financeiro.ver_receber"];
  if (t(/^\/api\/cenarios\/modelos$/) || t(/^\/api\/eventos\/\d+\/cenarios$/) || t(/^\/api\/(cenarios|linhas)\/\d+(\/linhas)?$/)) return so("simulador");
  if (t(/^\/api\/eventos\/\d+\/quartos$/) || t(/^\/api\/quartos\/\d+$/)) return so("hospedagem");
  if (t(/^\/api\/quartos\/\d+\/alocacoes$/) || t(/^\/api\/alocacoes\/\d+$/)) return ["hospedagem.editar"];
  if (t(/^\/api\/(focos-do-dia|tarefa-responsaveis|tarefas|subtarefas)(\/|$)/)) return so("tarefas");
  if (t(/^\/api\/(crm|crm-interacoes)(\/|$)/)) return so("crm");
  if (path === "/api/fornecedores" && GET) return ["fornecedores.visualizar", "financeiro.visualizar", "operacao.visualizar", "campo.visualizar", "programacao.visualizar"];
  if (t(/^\/api\/fornecedores(\/\d+)?$/)) return so("fornecedores");
  if (t(/^\/api\/eventos\/\d+\/custos\/importar$/)) return ["financeiro.criar"];
  if (t(/^\/api\/eventos\/\d+\/custos(\/reordenar)?$/) || t(/^\/api\/custos\/\d+$/) || t(/^\/api\/eventos\/\d+\/pagamentos-terceiros$/) || t(/^\/api\/pagamentos-terceiros\/\d+$/)) return so("financeiro");
  if (t(/^\/api\/eventos\/\d+\/financeiro\/receber(\/reordenar)?$/) || t(/^\/api\/financeiro-receber\/\d+(\/parcelas)?$/) || t(/^\/api\/parcelas\/\d+$/)) return ["financeiro." + acao + "+financeiro.ver_receber"];
  if (t(/^\/api\/(etapas|categorias|centros-custo)$/) && GET) return true;
  if (t(/^\/api\/etapas(\/reordenar|\/\d+)?$/)) return so("etapas");
  if (t(/^\/api\/categorias(\/reordenar|\/\d+)?$/)) return so("categorias");
  if (t(/^\/api\/centros-custo(\/reordenar|\/\d+)?$/)) return so("centros_custo");
  if (path === "/api/prazos-padrao") return GET ? ["prazos_padrao.visualizar", "operacao.visualizar"] : ["prazos_padrao.editar"];
  if (t(/^\/api\/eventos\/\d+\/(prazos|responsaveis|prazos\/aplicar)$/)) return GET ? ["operacao.visualizar"] : ["operacao.editar"];
  if (t(/^\/api\/eventos\/\d+\/op(\/|$)/) || t(/^\/api\/op-(itens|tarefas|subtarefas)\/\d+/)) return so("operacao");
  if (t(/^\/api\/eventos\/\d+\/campo(\/|$)/) || t(/^\/api\/campo-(dias|tarefas|subtarefas)\/\d+/)) return so("campo");
  if (t(/^\/api\/eventos\/\d+\/agenda$/)) return ["agenda.visualizar", "campo.visualizar"];
  if (t(/^\/api\/eventos\/\d+\/programacao(\/|$)/) || t(/^\/api\/prog-(acontecimentos|tarefas|subtarefas)\/\d+/)) return so("programacao");
  if (t(/^\/api\/eventos\/\d+\/analisar$/)) return ["operacao.visualizar"];
  return null;
}
var CAMPOS_FIN = [
  {
    re: /^\/api\/(custos\/\d+|eventos\/\d+\/custos)$/,
    tabela: "custos",
    baixa: ["valor_pago", "data_pagamento", "status"],
    valores: ["valor", "quantidade"]
  },
  {
    re: /^\/api\/(parcelas\/\d+|financeiro-receber\/\d+\/parcelas)$/,
    tabela: "financeiro_parcelas",
    baixa: ["valor_recebido", "data_recebimento"],
    valores: ["valor_previsto"]
  },
  {
    re: /^\/api\/(pagamentos-terceiros\/\d+|eventos\/\d+\/pagamentos-terceiros)$/,
    tabela: "pagamentos_terceiros",
    baixa: ["pago", "data_pagamento"],
    valores: ["valor"]
  },
  { re: /^\/api\/(clientes\/\d+|eventos\/\d+\/clientes)$/, tabela: "clientes", baixa: [], valores: ["pacote"] }
];
async function camposFinanceirosNegados(request, path, method, db, pode) {
  if (method !== "PATCH" && method !== "POST") return null;
  const regra = CAMPOS_FIN.find((c) => c.re.test(path));
  if (!regra) return null;
  const b = await request.clone().json().catch(() => ({}));
  let atual = null;
  if (method === "PATCH") atual = await db.prepare(`SELECT * FROM ${regra.tabela} WHERE id=?`).bind(+path.split("/")[3]).first();
  const muda = /* @__PURE__ */ __name((k) => {
    if (!(k in b)) return false;
    const v = b[k];
    if (k === "status") return (v === "pago" || v === "parcial") && (!atual || atual.status !== v);
    if (method === "POST") return v != null && v !== "" && v !== 0 && v !== false && !(k === "quantidade" && +v === 1);
    if (!atual) return true;
    const norm = /* @__PURE__ */ __name((x) => x === "" || x == null ? null : typeof x === "boolean" ? +x : isNaN(+x) ? x : +x, "norm");
    return norm(v) !== norm(atual[k]);
  }, "muda");
  if (regra.baixa.some(muda) && !pode("financeiro.dar_baixa")) return "Seu perfil n\xE3o permite dar baixa em pagamentos.";
  if (regra.valores.some(muda) && !pode("financeiro.alterar_valores")) return "Seu perfil n\xE3o permite alterar valores.";
  return null;
}
async function conferirPermissao(request, url, path, method, db, auth, pode) {
  let regra;
  if (/^\/api\/(historico|anexos)(\/\d+(\/arquivo)?)?$/.test(path)) {
    let tipo = "";
    const raiz = path === "/api/historico" || path === "/api/anexos";
    if (raiz && method === "GET") tipo = url.searchParams.get("parent_tipo") || "";
    else if (raiz && path === "/api/historico") tipo = (await request.clone().json().catch(() => ({}))).parent_tipo || "";
    else if (raiz) {
      const fd = await request.clone().formData().catch(() => null);
      tipo = fd ? String(fd.get("parent_tipo") || "") : "";
    } else {
      const tabela = path.startsWith("/api/historico") ? "historico" : "anexos";
      const r = await db.prepare(`SELECT parent_tipo FROM ${tabela} WHERE id=?`).bind(+path.split("/")[3]).first();
      tipo = r ? r.parent_tipo : "";
    }
    const mod = HIST_MODULO[tipo];
    if (!mod) return "Sem permiss\xE3o para este registro.";
    regra = [mod + "." + (method === "GET" ? "visualizar" : method === "DELETE" ? "excluir" : "editar")];
  } else {
    regra = regraRota(path, method);
  }
  if (regra === true) return null;
  if (!regra || !regra.some((alt) => alt.split("+").every((p) => pode(p)))) return mensagemNegado(regra);
  return camposFinanceirosNegados(request, path, method, db, pode);
}
function mensagemNegado(regra) {
  if (!regra) return "Dispon\xEDvel apenas para o Administrador Geral.";
  const [mod, acao] = regra[0].split("+")[0].split(".");
  const m = MODULOS.find((x) => x.id === mod);
  const verbo = { visualizar: "visualizar", criar: "criar", editar: "editar", excluir: "excluir" }[acao] || "acessar";
  return `Seu perfil n\xE3o permite ${verbo} em ${m ? m.nome : mod}.`;
}
var MASCARA_VALORES = [
  [/^\/api\/eventos$/, ["valor_total"]],
  [/^\/api\/eventos-ativos\/painel$/, ["financeiro", "pacote", "pago"]],
  [/^\/api\/eventos\/\d+\/itens$/, ["custo_total", "valor"]],
  [/^\/api\/eventos\/\d+\/clientes$/, ["pacote", "pago"]],
  [/^\/api\/clientes\/\d+$/, ["pacote", "valor"]],
  [/^\/api\/fornecedores$/, ["total"]],
  [/^\/api\/eventos\/\d+\/custos$/, ["valor", "valor_pago", "pacote"]],
  [/^\/api\/eventos\/\d+\/financeiro\/receber$/, ["valor_previsto", "valor_recebido", "previsto", "recebido", "vencido", "a_vencer"]],
  [/^\/api\/financeiro-receber\/\d+$/, ["valor_previsto", "valor_recebido"]],
  [/^\/api\/eventos\/\d+\/pagamentos-terceiros$/, ["valor"]]
];
function mascarar(obj, chaves) {
  if (Array.isArray(obj)) return obj.map((x) => mascarar(x, chaves));
  if (obj && typeof obj === "object") {
    const o = {};
    for (const k of Object.keys(obj)) o[k] = chaves.has(k) ? null : mascarar(obj[k], chaves);
    return o;
  }
  return obj;
}
async function rotaLogin(request, db) {
  const b = await request.json().catch(() => ({}));
  const email = S(b.email, 160).trim().toLowerCase();
  const senha = String(b.senha ?? "");
  const falha = /* @__PURE__ */ __name(() => json({ erro: "e-mail ou senha incorretos" }, 401), "falha");
  if (!email || !senha) return falha();
  const u = await db.prepare(
    "SELECT u.*, p.id AS pid FROM usuarios u LEFT JOIN perfis p ON p.id=u.perfil_id WHERE u.email=?"
  ).bind(email).first();
  if (!u) {
    await hashSenha(senha);
    return falha();
  }
  if (u.bloqueado_ate && u.bloqueado_ate > (/* @__PURE__ */ new Date()).toISOString())
    return json({ erro: "muitas tentativas erradas \u2014 tente de novo em alguns minutos" }, 429);
  if (!await conferirSenha(senha, u.senha_hash)) {
    const falhas = (u.falhas_login || 0) + 1;
    const bloqueio = falhas >= 5 ? new Date(Date.now() + 15 * 60 * 1e3).toISOString() : "";
    await db.prepare("UPDATE usuarios SET falhas_login=?, bloqueado_ate=? WHERE id=?").bind(falhas >= 5 ? 0 : falhas, bloqueio, u.id).run();
    return falha();
  }
  if (!u.ativo) return json({ erro: "usu\xE1rio inativo \u2014 fale com o administrador" }, 403);
  if (!u.pid) return json({ erro: "usu\xE1rio sem perfil de acesso \u2014 fale com o administrador" }, 403);
  const token = novoToken();
  await db.prepare("DELETE FROM sessoes WHERE expira_em <= datetime('now')").run();
  await db.prepare(`INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?,?, datetime('now', '+${SESSAO_DIAS} days'))`).bind(await sha256Hex(token), u.id).run();
  await db.prepare("UPDATE usuarios SET falhas_login=0, bloqueado_ate='', ultimo_acesso=datetime('now') WHERE id=?").bind(u.id).run();
  return json({ token });
}
async function contarAdminsAtivos(db, exceto) {
  const r = await db.prepare(`
    SELECT COUNT(*) AS n FROM usuarios u JOIN perfis p ON p.id=u.perfil_id
    WHERE p.admin=1 AND u.ativo=1 AND u.id<>?`).bind(exceto ?? 0).first();
  return r ? r.n : 0;
}
async function rotasAcessos(request, path, method, db, auth) {
  let m;
  if (path === "/api/acessos" && method === "GET") {
    const { results: perfis } = await db.prepare(`
      SELECT p.id, p.nome, p.admin, p.permissoes, p.atualizado_em,
             (SELECT COUNT(*) FROM usuarios u WHERE u.perfil_id=p.id) AS usuarios
      FROM perfis p ORDER BY p.admin DESC, p.nome COLLATE NOCASE`).all();
    for (const p of perfis) p.permissoes = p.admin ? todasPermissoes() : lerPermissoes(p.permissoes);
    const { results: usuarios } = await db.prepare(`
      SELECT id, nome, email, perfil_id, ativo, ultimo_acesso, criado_em FROM usuarios
      ORDER BY ativo DESC, nome COLLATE NOCASE`).all();
    return json({ perfis, usuarios, modulos: MODULOS, acoes: ACOES_PADRAO, eu: auth.usuario ? auth.usuario.id : null });
  }
  if (path === "/api/perfis" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const nome = S(b.nome, 60).trim();
    if (!nome) return json({ erro: "informe o nome do perfil" }, 400);
    if (await db.prepare("SELECT id FROM perfis WHERE nome=?").bind(nome).first()) return json({ erro: "j\xE1 existe um perfil com esse nome" }, 400);
    const r = await db.prepare("INSERT INTO perfis (nome, permissoes) VALUES (?,?)").bind(nome, JSON.stringify(normalizarPermissoes(b.permissoes))).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/perfis\/(\d+)$/)) {
    const id = +m[1];
    const p = await db.prepare("SELECT * FROM perfis WHERE id=?").bind(id).first();
    if (!p) return json({ erro: "perfil n\xE3o encontrado" }, 404);
    if (p.admin) return json({ erro: "o perfil Administrador Geral \xE9 fixo e n\xE3o pode ser alterado" }, 400);
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if ("nome" in b) {
        const nome = S(b.nome, 60).trim();
        if (!nome) return json({ erro: "informe o nome do perfil" }, 400);
        if (await db.prepare("SELECT id FROM perfis WHERE nome=? AND id<>?").bind(nome, id).first()) return json({ erro: "j\xE1 existe um perfil com esse nome" }, 400);
        await db.prepare("UPDATE perfis SET nome=?, atualizado_em=datetime('now') WHERE id=?").bind(nome, id).run();
      }
      if ("permissoes" in b)
        await db.prepare("UPDATE perfis SET permissoes=?, atualizado_em=datetime('now') WHERE id=?").bind(JSON.stringify(normalizarPermissoes(b.permissoes)), id).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      const n = await db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE perfil_id=?").bind(id).first();
      if (n && n.n) return json({ erro: "h\xE1 usu\xE1rios neste perfil \u2014 mude o perfil deles antes de excluir" }, 400);
      await db.prepare("DELETE FROM perfis WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/usuarios" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const nome = S(b.nome, 80).trim(), email = S(b.email, 160).trim().toLowerCase(), senha = String(b.senha ?? "");
    const perfilId = I(b.perfil_id);
    if (!nome) return json({ erro: "informe o nome" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: "informe um e-mail v\xE1lido" }, 400);
    if (senha.length < SENHA_MIN) return json({ erro: `a senha precisa ter pelo menos ${SENHA_MIN} caracteres` }, 400);
    if (!perfilId || !await db.prepare("SELECT id FROM perfis WHERE id=?").bind(perfilId).first()) return json({ erro: "escolha o perfil de acesso" }, 400);
    if (await db.prepare("SELECT id FROM usuarios WHERE email=?").bind(email).first()) return json({ erro: "j\xE1 existe um usu\xE1rio com esse e-mail" }, 400);
    const r = await db.prepare("INSERT INTO usuarios (nome, email, senha_hash, perfil_id, ativo) VALUES (?,?,?,?,?)").bind(nome, email, await hashSenha(senha), perfilId, "ativo" in b ? B(b.ativo) : 1).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/usuarios\/(\d+)$/)) {
    const id = +m[1];
    const u = await db.prepare("SELECT u.*, p.admin AS perfil_admin FROM usuarios u LEFT JOIN perfis p ON p.id=u.perfil_id WHERE u.id=?").bind(id).first();
    if (!u) return json({ erro: "usu\xE1rio n\xE3o encontrado" }, 404);
    const souEu = auth.usuario && auth.usuario.id === id;
    const tiraUltimoAdmin = /* @__PURE__ */ __name(async () => u.perfil_admin && u.ativo && !await contarAdminsAtivos(db, id), "tiraUltimoAdmin");
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const o = {};
      if ("nome" in b) {
        o.nome = S(b.nome, 80).trim();
        if (!o.nome) return json({ erro: "informe o nome" }, 400);
      }
      if ("email" in b) {
        o.email = S(b.email, 160).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return json({ erro: "informe um e-mail v\xE1lido" }, 400);
        if (await db.prepare("SELECT id FROM usuarios WHERE email=? AND id<>?").bind(o.email, id).first()) return json({ erro: "j\xE1 existe um usu\xE1rio com esse e-mail" }, 400);
      }
      if ("perfil_id" in b) {
        o.perfil_id = I(b.perfil_id);
        const p = o.perfil_id && await db.prepare("SELECT admin FROM perfis WHERE id=?").bind(o.perfil_id).first();
        if (!p) return json({ erro: "perfil n\xE3o encontrado" }, 400);
        if (!p.admin && await tiraUltimoAdmin()) return json({ erro: "este \xE9 o \xFAltimo Administrador Geral ativo \u2014 crie outro antes de mudar o perfil dele" }, 400);
        if (!p.admin && souEu) return json({ erro: "voc\xEA n\xE3o pode tirar o seu pr\xF3prio acesso de administrador" }, 400);
      }
      if ("ativo" in b) {
        o.ativo = B(b.ativo);
        if (!o.ativo && souEu) return json({ erro: "voc\xEA n\xE3o pode desativar o seu pr\xF3prio usu\xE1rio" }, 400);
        if (!o.ativo && await tiraUltimoAdmin()) return json({ erro: "este \xE9 o \xFAltimo Administrador Geral ativo \u2014 n\xE3o pode ser desativado" }, 400);
      }
      if ("senha" in b && String(b.senha)) {
        if (String(b.senha).length < SENHA_MIN) return json({ erro: `a senha precisa ter pelo menos ${SENHA_MIN} caracteres` }, 400);
        o.senha_hash = await hashSenha(String(b.senha));
        o.falhas_login = 0;
        o.bloqueado_ate = "";
      }
      if (!await upd(db, "usuarios", id, o, ", atualizado_em=datetime('now')")) return json({ erro: "nada para atualizar" }, 400);
      if (o.ativo === 0 || o.senha_hash)
        await db.prepare("DELETE FROM sessoes WHERE usuario_id=? AND token_hash<>?").bind(id, auth.tokenHash || "").run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      if (souEu) return json({ erro: "voc\xEA n\xE3o pode excluir o seu pr\xF3prio usu\xE1rio" }, 400);
      if (await tiraUltimoAdmin()) return json({ erro: "este \xE9 o \xFAltimo Administrador Geral ativo \u2014 n\xE3o pode ser exclu\xEDdo" }, 400);
      await db.prepare("DELETE FROM sessoes WHERE usuario_id=?").bind(id).run();
      await db.prepare("DELETE FROM usuarios WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  return json({ erro: "n\xE3o encontrado" }, 404);
}
var S = /* @__PURE__ */ __name((v, max = 300) => String(v ?? "").slice(0, max), "S");
var N = /* @__PURE__ */ __name((v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}, "N");
var I = /* @__PURE__ */ __name((v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}, "I");
var B = /* @__PURE__ */ __name((v) => v ? 1 : 0, "B");
var ITEM_STATUS = /* @__PURE__ */ new Set(["afazer", "andamento", "concluido"]);
var TAREFA_STATUS = /* @__PURE__ */ new Set(["afazer", "concluido"]);
var MULTS = /* @__PURE__ */ new Set(["nenhum", "diarias", "dias_trilha", "refeicoes", "eventos"]);
function limparItem(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  for (const c of ["dia", "item", "setor", "data_limite", "responsavel", "fornecedor", "quantidade"]) if (c in b) o[c] = S(b[c], 300);
  if ("horario" in b) o.horario = S(b.horario, 40);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("status" in b && ITEM_STATUS.has(b.status)) o.status = b.status;
  if ("prioridade" in b) o.prioridade = I(b.prioridade);
  if ("valor" in b) o.valor = N(b.valor);
  return o;
}
function limparSubitem(b) {
  const o = {};
  if ("titulo" in b) o.titulo = S(b.titulo, 200);
  if ("concluido" in b) o.concluido = B(b.concluido);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
function limparCliente(b) {
  const o = {};
  for (const c of [
    "grupo",
    "nome",
    "cpf",
    "telefone",
    "camiseta",
    "utv",
    "nf",
    "forma_pagamento",
    "nacionalidade",
    "estado_civil",
    "rg",
    "email",
    "emergencia_nome",
    "emergencia_parentesco",
    "emergencia_telefone"
  ]) if (c in b) o[c] = S(b[c], 160);
  if ("endereco" in b) o.endereco = S(b.endereco, 300);
  if ("utv_recebido" in b) o.utv_recebido = B(b.utv_recebido);
  if ("utv_devolvido" in b) o.utv_devolvido = B(b.utv_devolvido);
  if ("contato_id" in b) o.contato_id = I(b.contato_id);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("tipo" in b) o.tipo = b.tipo === "crianca" ? "crianca" : "adulto";
  if ("contrato_enviado" in b) o.contrato_enviado = B(b.contrato_enviado);
  if ("contrato_assinado" in b) o.contrato_assinado = B(b.contrato_assinado);
  if ("pacote" in b) o.pacote = N(b.pacote);
  if ("staff" in b) o.staff = B(b.staff);
  if ("papel" in b) o.papel = b.papel === "acompanhante" ? "acompanhante" : "piloto";
  if ("desistente" in b) o.desistente = B(b.desistente);
  if ("cegonha" in b) o.cegonha = I(b.cegonha);
  return o;
}
function limparCenario(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 120);
  for (const c of ["pessoas", "diarias", "dias_trilha", "refeicoes", "eventos_qtd"]) if (c in b) o[c] = Math.max(0, I(b[c]) ?? 0);
  if ("modelo" in b) o.modelo = B(b.modelo);
  return o;
}
function limparLinha(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("item" in b) o.item = S(b.item, 160);
  if ("tipo" in b) o.tipo = b.tipo === "fixo" ? "fixo" : "pessoa";
  if ("media" in b) o.media = N(b.media) ?? 1;
  if ("preco" in b) o.preco = N(b.preco) ?? 0;
  if ("mult" in b && MULTS.has(b.mult)) o.mult = b.mult;
  if ("categoria_id" in b) o.categoria_id = b.categoria_id == null ? null : I(b.categoria_id);
  return o;
}
function limparQuarto(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("nome" in b) o.nome = S(b.nome, 160);
  if ("capacidade" in b) o.capacidade = Math.max(1, I(b.capacidade) ?? 1);
  if ("diaria" in b) o.diaria = N(b.diaria);
  if ("adicional" in b) o.adicional = N(b.adicional) ?? 0;
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 300);
  return o;
}
var CRM_ETAPAS = /* @__PURE__ */ new Set(["lead", "contato", "proposta", "confirmado", "pos_evento", "perdido"]);
function limparFoco(b) {
  const o = {};
  if ("texto" in b) o.texto = S(b.texto, 200);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
function limparTarefa(b) {
  const o = {};
  if ("titulo" in b) o.titulo = S(b.titulo, 300);
  for (const c of ["setor", "data_limite", "responsavel"]) if (c in b) o[c] = S(b[c], 120);
  if ("horario" in b) o.horario = S(b.horario, 40);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("status" in b && ITEM_STATUS.has(b.status)) o.status = b.status;
  if ("prioridade" in b) o.prioridade = I(b.prioridade);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
function limparContato(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 160);
  for (const c of ["grupo", "telefone", "cpf", "camiseta", "cidade", "origem", "interesse", "proxima_acao", "proxima_data"]) if (c in b) o[c] = S(b[c], 200);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("etapa" in b && CRM_ETAPAS.has(b.etapa)) o.etapa = b.etapa;
  if ("valor_potencial" in b) o.valor_potencial = N(b.valor_potencial);
  return o;
}
var CUSTO_STATUS = /* @__PURE__ */ new Set(["pago", "parcial", "andamento", "pendente"]);
function limparCusto(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("item" in b) o.item = S(b.item, 200);
  if ("categoria" in b) o.categoria = S(b.categoria, 120);
  if ("quantidade" in b) o.quantidade = N(b.quantidade) ?? 1;
  if ("valor" in b) o.valor = N(b.valor);
  if ("fornecedor_id" in b) o.fornecedor_id = I(b.fornecedor_id);
  if ("status" in b && CUSTO_STATUS.has(b.status)) o.status = b.status;
  if ("forma_pagamento" in b) o.forma_pagamento = S(b.forma_pagamento, 60);
  if ("parcelas" in b) o.parcelas = I(b.parcelas);
  if ("valor_pago" in b) o.valor_pago = N(b.valor_pago) ?? 0;
  if ("vencimento" in b) o.vencimento = S(b.vencimento, 20);
  if ("data_pagamento" in b) o.data_pagamento = S(b.data_pagamento, 20);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function statusPorPago(valor, pago, statusAtual) {
  const v = +valor || 0, p = +pago || 0;
  if (v > 0 && p >= v) return "pago";
  if (p > 0 && p < v) return "parcial";
  return statusAtual === "andamento" ? "andamento" : "pendente";
}
function limparRecebivel(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("cliente" in b) o.cliente = S(b.cliente, 160);
  if ("forma_pagamento" in b) o.forma_pagamento = S(b.forma_pagamento, 60);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function limparParcela(b) {
  const o = {};
  if ("descricao" in b) o.descricao = S(b.descricao, 120) || "Parcela";
  if ("vencimento" in b) o.vencimento = S(b.vencimento, 20);
  if ("valor_previsto" in b) o.valor_previsto = N(b.valor_previsto) ?? 0;
  if ("valor_recebido" in b) o.valor_recebido = b.valor_recebido === null ? null : N(b.valor_recebido);
  if ("data_recebimento" in b) o.data_recebimento = S(b.data_recebimento, 20);
  if ("forma_pagamento" in b) o.forma_pagamento = S(b.forma_pagamento, 60);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function limparPagamentoTerceiro(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("descricao" in b) o.descricao = S(b.descricao, 160);
  if ("cliente_id" in b) o.cliente_id = I(b.cliente_id);
  if ("cliente_nome" in b) o.cliente_nome = S(b.cliente_nome, 160);
  if ("fornecedor_id" in b) o.fornecedor_id = I(b.fornecedor_id);
  if ("valor" in b) o.valor = N(b.valor);
  if ("pago" in b) o.pago = B(b.pago);
  if ("data_pagamento" in b) o.data_pagamento = S(b.data_pagamento, 20);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function limparFornecedor(b) {
  const o = {};
  for (const c of ["nome", "categoria", "contato", "telefone", "cidade"]) if (c in b) o[c] = S(b[c], 160);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
var CAMPO_TIPOS = /* @__PURE__ */ new Set(["ajustavel", "fixa"]);
function limparEtapa(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 120);
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("ativo" in b) o.ativo = B(b.ativo);
  if ("redireciona_campo" in b) o.redireciona_campo = B(b.redireciona_campo);
  return o;
}
function limparCategoria(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 120);
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("ativo" in b) o.ativo = B(b.ativo);
  return o;
}
function limparCentroCusto(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 120);
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("ativo" in b) o.ativo = B(b.ativo);
  if ("lista_compras" in b) o.lista_compras = B(b.lista_compras);
  return o;
}
async function limparOpItem(db, b) {
  const o = {};
  if ("etapa_id" in b) {
    const eid = I(b.etapa_id);
    const et = eid != null ? await db.prepare("SELECT nome FROM etapas WHERE id=? AND ativo=1").bind(eid).first() : null;
    if (et) {
      o.etapa_id = eid;
      o.etapa = et.nome;
    }
  }
  if ("categoria_id" in b) {
    const cid = I(b.categoria_id);
    const cat = cid != null ? await db.prepare("SELECT nome FROM categorias WHERE id=? AND ativo=1").bind(cid).first() : null;
    if (cat) {
      o.categoria_id = cid;
      o.categoria = cat.nome;
    }
  }
  if ("nome" in b) o.nome = S(b.nome, 200);
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("homologado" in b) o.homologado = B(b.homologado);
  if ("responsavel" in b) {
    o.responsavel = S(b.responsavel, 120);
    o.responsavel_auto = 0;
  }
  if ("data_limite" in b) o.data_limite = S(b.data_limite, 20);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function limparOpTarefa(b) {
  const o = {};
  if ("titulo" in b) o.titulo = S(b.titulo, 300);
  if ("concluido" in b) o.concluido = B(b.concluido);
  if ("status" in b && TAREFA_STATUS.has(b.status)) o.status = b.status;
  if ("responsavel" in b) {
    o.responsavel = S(b.responsavel, 120);
    o.responsavel_auto = 0;
  }
  if ("data_limite" in b) o.data_limite = S(b.data_limite, 20);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
async function recomputeItemStatus2(db, itemId) {
  const { results } = await db.prepare("SELECT status FROM op_tarefas WHERE item_id=?").bind(itemId).all();
  const novo = results.length && results.every((t) => t.status === "concluido") ? "concluido" : "afazer";
  await db.prepare("UPDATE op_itens SET status=? WHERE id=?").bind(novo, itemId).run();
}
function limparCampoDia(b) {
  const o = {};
  if ("rotulo" in b) o.rotulo = S(b.rotulo, 160);
  if ("data" in b) o.data = S(b.data, 20);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
function limparCampoTarefa(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 200);
  if ("h_planejado" in b) o.h_planejado = S(b.h_planejado, 20);
  if ("h_realizado" in b) o.h_realizado = S(b.h_realizado, 20);
  if ("responsavel" in b) o.responsavel = S(b.responsavel, 120);
  if ("tipo" in b && CAMPO_TIPOS.has(b.tipo)) o.tipo = b.tipo;
  if ("status" in b && ITEM_STATUS.has(b.status)) o.status = b.status;
  if ("data_limite" in b) o.data_limite = S(b.data_limite, 20);
  if ("ordem" in b) o.ordem = I(b.ordem);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("fornecedor_id" in b) o.fornecedor_id = b.fornecedor_id ? I(b.fornecedor_id) : null;
  return o;
}
function limparProgAcontecimento(b) {
  const o = {};
  if ("data" in b) o.data = S(b.data, 20);
  if ("nome" in b) o.nome = S(b.nome, 200);
  if ("categoria" in b) o.categoria = S(b.categoria, 120);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
function limparProgTarefa(b) {
  const o = {};
  if ("titulo" in b) o.titulo = S(b.titulo, 300);
  if ("status" in b && TAREFA_STATUS.has(b.status)) o.status = b.status;
  if ("responsavel" in b) o.responsavel = S(b.responsavel, 120);
  if ("data_limite" in b) o.data_limite = S(b.data_limite, 20);
  if ("fornecedor_id" in b) o.fornecedor_id = b.fornecedor_id ? I(b.fornecedor_id) : null;
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("ordem" in b) o.ordem = I(b.ordem);
  return o;
}
async function recomputeAcontecimentoStatus(db, id) {
  const { results } = await db.prepare("SELECT status FROM prog_tarefas WHERE acontecimento_id=?").bind(id).all();
  const novo = !results.length ? "afazer" : results.every((t) => t.status === "concluido") ? "concluido" : "andamento";
  await db.prepare("UPDATE prog_acontecimentos SET status=? WHERE id=?").bind(novo, id).run();
}
function hhmmMin2(s) {
  const mm = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!mm) return null;
  return +mm[1] * 60 + +mm[2];
}
function minHhmm2(t) {
  t = (t % 1440 + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}
async function upd(db, tabela, id, campos, extra = "") {
  const chaves = Object.keys(campos);
  if (!chaves.length) return false;
  const sets = chaves.map((k) => `${k}=?`).join(", ");
  await db.prepare(`UPDATE ${tabela} SET ${sets}${extra} WHERE id=?`).bind(...chaves.map((k) => campos[k]), id).run();
  return true;
}
var PRAZO_NIVEIS = /* @__PURE__ */ new Set(["etapa", "categoria", "topico", "tarefas"]);
function limparLinhaPrazo(b) {
  const o = {};
  o.nivel = PRAZO_NIVEIS.has(b.nivel) ? b.nivel : null;
  o.etapa_id = I(b.etapa_id);
  o.categoria_id = I(b.categoria_id) || 0;
  o.topico_nome = S(b.topico_nome, 200);
  o.dias = b.dias === "" || b.dias == null ? null : I(b.dias);
  return o;
}
async function salvarLinhasPrazo(db, tabela, evento_id, linhas, atualizadoPor) {
  const cols = evento_id != null ? "(evento_id, nivel, etapa_id, categoria_id, topico_nome, dias, atualizado_em, atualizado_por)" : "(nivel, etapa_id, categoria_id, topico_nome, dias, atualizado_em, atualizado_por)";
  const conflito = evento_id != null ? "(evento_id, nivel, etapa_id, categoria_id, topico_nome)" : "(nivel, etapa_id, categoria_id, topico_nome)";
  for (const raw of Array.isArray(linhas) ? linhas : []) {
    const l = limparLinhaPrazo(raw);
    if (!l.nivel || l.etapa_id == null) continue;
    const vals = evento_id != null ? [evento_id, l.nivel, l.etapa_id, l.categoria_id, l.topico_nome, l.dias] : [l.nivel, l.etapa_id, l.categoria_id, l.topico_nome, l.dias];
    await db.prepare(`
      INSERT INTO ${tabela} ${cols} VALUES (${vals.map(() => "?").join(",")}, datetime('now'), ?)
      ON CONFLICT ${conflito} DO UPDATE SET dias=excluded.dias, atualizado_em=datetime('now'), atualizado_por=excluded.atualizado_por
    `).bind(...vals, S(atualizadoPor, 60)).run();
  }
}
function limparLinhaResp(b) {
  const o = {};
  o.nivel = PRAZO_NIVEIS.has(b.nivel) ? b.nivel : null;
  o.etapa_id = I(b.etapa_id);
  o.categoria_id = I(b.categoria_id) || 0;
  o.topico_nome = S(b.topico_nome, 200);
  o.responsavel = S(b.responsavel, 120);
  return o;
}
async function salvarLinhasResp(db, eventoId, linhas, atualizadoPor) {
  for (const raw of Array.isArray(linhas) ? linhas : []) {
    const l = limparLinhaResp(raw);
    if (!l.nivel || l.etapa_id == null) continue;
    await db.prepare(`
      INSERT INTO responsaveis_evento (evento_id, nivel, etapa_id, categoria_id, topico_nome, responsavel, atualizado_em, atualizado_por)
      VALUES (?,?,?,?,?,?, datetime('now'), ?)
      ON CONFLICT (evento_id, nivel, etapa_id, categoria_id, topico_nome)
      DO UPDATE SET responsavel=excluded.responsavel, atualizado_em=datetime('now'), atualizado_por=excluded.atualizado_por
    `).bind(eventoId, l.nivel, l.etapa_id, l.categoria_id, l.topico_nome, l.responsavel, S(atualizadoPor, 60)).run();
  }
}
async function resolverResponsavelTopico(db, eventoId, etapaId, categoriaId, topicoNome) {
  if (etapaId == null) return "";
  const cid = categoriaId || 0;
  async function respProprio(nivel, catId, nome) {
    const row = await db.prepare(
      "SELECT responsavel FROM responsaveis_evento WHERE evento_id=? AND nivel=? AND etapa_id=? AND categoria_id=? AND topico_nome=?"
    ).bind(eventoId, nivel, etapaId, catId, nome).first();
    return row && row.responsavel ? row.responsavel : "";
  }
  __name(respProprio, "respProprio");
  const respEtapa = await respProprio("etapa", 0, "");
  const respCategoria = cid ? await respProprio("categoria", cid, "") : "";
  const respTopico = await respProprio("topico", cid, topicoNome);
  const respTarefas = await respProprio("tarefas", cid, topicoNome);
  return respTarefas || respTopico || respCategoria || respEtapa || "";
}
function somarDias(dataIso, dias) {
  if (!dataIso || dias == null) return "";
  const d = /* @__PURE__ */ new Date(dataIso + "T00:00:00Z");
  if (isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
async function montarPainelPrazos(db, eventoId, dataEventoPreview) {
  const { results: etapas } = await db.prepare("SELECT * FROM etapas WHERE ativo=1 ORDER BY ordem, id").all();
  const { results: categorias } = await db.prepare("SELECT * FROM categorias WHERE ativo=1 ORDER BY ordem, id").all();
  const catNome = /* @__PURE__ */ __name((id) => (categorias.find((c) => c.id === id) || {}).nome || "", "catNome");
  let itens;
  if (eventoId != null) {
    itens = (await db.prepare("SELECT id, etapa_id, categoria_id, nome FROM op_itens WHERE evento_id=? ORDER BY ordem, id").bind(eventoId).all()).results;
  } else {
    const { results } = await db.prepare(
      "SELECT MIN(id) AS id, etapa_id, categoria_id, nome FROM op_itens GROUP BY etapa_id, COALESCE(categoria_id,0), nome ORDER BY MIN(ordem), MIN(id)"
    ).all();
    itens = results;
  }
  const { results: padrao } = await db.prepare("SELECT * FROM prazos_padrao").all();
  const mapaPadrao = {};
  for (const p of padrao) mapaPadrao[[p.nivel, p.etapa_id, p.categoria_id, p.topico_nome].join("|")] = p.dias;
  let mapaEvento = {};
  if (eventoId != null) {
    const { results: pe } = await db.prepare("SELECT * FROM prazos_evento WHERE evento_id=?").bind(eventoId).all();
    for (const p of pe) mapaEvento[[p.nivel, p.etapa_id, p.categoria_id, p.topico_nome].join("|")] = p.dias;
  }
  function diasProprio(nivel, etapaId, categoriaId, topicoNome) {
    const k = [nivel, etapaId, categoriaId || 0, topicoNome || ""].join("|");
    if (k in mapaEvento) return mapaEvento[k];
    if (k in mapaPadrao) return mapaPadrao[k];
    return null;
  }
  __name(diasProprio, "diasProprio");
  const mapaResp = {};
  if (eventoId != null) {
    const { results: re } = await db.prepare("SELECT * FROM responsaveis_evento WHERE evento_id=?").bind(eventoId).all();
    for (const r of re) mapaResp[[r.nivel, r.etapa_id, r.categoria_id, r.topico_nome].join("|")] = r.responsavel;
  }
  function respProprio(nivel, etapaId, categoriaId, topicoNome) {
    const k = [nivel, etapaId, categoriaId || 0, topicoNome || ""].join("|");
    return mapaResp[k] || "";
  }
  __name(respProprio, "respProprio");
  let dataEvento = "";
  if (eventoId != null) {
    const ev = await db.prepare("SELECT data_evento FROM eventos WHERE id=?").bind(eventoId).first();
    dataEvento = ev && ev.data_evento || "";
  } else if (dataEventoPreview) {
    dataEvento = S(dataEventoPreview, 20);
  }
  const etapasElegiveis = etapas.filter((e) => !e.redireciona_campo);
  const resultado = [];
  for (const et of etapasElegiveis) {
    const itensEtapa = itens.filter((i) => i.etapa_id === et.id);
    if (!itensEtapa.length) continue;
    const diasEtapa = diasProprio("etapa", et.id, 0, "");
    const respEtapa = respProprio("etapa", et.id, 0, "");
    const porCategoria = {};
    itensEtapa.forEach((i) => {
      (porCategoria[i.categoria_id || 0] = porCategoria[i.categoria_id || 0] || []).push(i);
    });
    const categoriasBloco = Object.keys(porCategoria).map((cidStr) => {
      const cid = +cidStr;
      const diasCategoria = cid ? diasProprio("categoria", et.id, cid, "") : null;
      const respCategoria = cid ? respProprio("categoria", et.id, cid, "") : "";
      const topicos = porCategoria[cidStr].map((item) => {
        const diasTopico = diasProprio("topico", et.id, cid, item.nome);
        const diasTarefas = diasProprio("tarefas", et.id, cid, item.nome);
        const diasTopicoResolvido = diasTopico ?? diasCategoria ?? diasEtapa;
        const diasTarefasResolvido = diasTarefas ?? diasTopicoResolvido;
        const respTopico = respProprio("topico", et.id, cid, item.nome);
        const respTarefas = respProprio("tarefas", et.id, cid, item.nome);
        return {
          item_id: item.id,
          nome: item.nome,
          dias_topico: diasTopico,
          dias_tarefas: diasTarefas,
          data_topico: dataEvento ? somarDias(dataEvento, diasTopicoResolvido) : "",
          data_tarefas: dataEvento ? somarDias(dataEvento, diasTarefasResolvido) : "",
          resp_topico: respTopico,
          resp_tarefas: respTarefas
        };
      });
      return { categoria_id: cid || null, nome: cid ? catNome(cid) : "Sem categoria", dias: diasCategoria, responsavel: respCategoria, topicos };
    });
    resultado.push({ etapa_id: et.id, nome: et.nome, dias: diasEtapa, responsavel: respEtapa, categorias: categoriasBloco });
  }
  return resultado;
}
async function resolverPrazoTopico(db, eventoId, etapaId, categoriaId, topicoNome) {
  if (etapaId == null) return { data_topico: "", data_tarefas: "" };
  const ev = await db.prepare("SELECT data_evento FROM eventos WHERE id=?").bind(eventoId).first();
  if (!ev || !ev.data_evento) return { data_topico: "", data_tarefas: "" };
  const cid = categoriaId || 0;
  async function diasProprio(nivel, catId, nome) {
    const evRow = await db.prepare(
      "SELECT dias FROM prazos_evento WHERE evento_id=? AND nivel=? AND etapa_id=? AND categoria_id=? AND topico_nome=?"
    ).bind(eventoId, nivel, etapaId, catId, nome).first();
    if (evRow && evRow.dias != null) return evRow.dias;
    const padRow = await db.prepare(
      "SELECT dias FROM prazos_padrao WHERE nivel=? AND etapa_id=? AND categoria_id=? AND topico_nome=?"
    ).bind(nivel, etapaId, catId, nome).first();
    return padRow ? padRow.dias : null;
  }
  __name(diasProprio, "diasProprio");
  const diasEtapa = await diasProprio("etapa", 0, "");
  const diasCategoria = cid ? await diasProprio("categoria", cid, "") : null;
  const diasTopico = await diasProprio("topico", cid, topicoNome);
  const diasTarefas = await diasProprio("tarefas", cid, topicoNome);
  const diasTopicoResolvido = diasTopico ?? diasCategoria ?? diasEtapa;
  const diasTarefasResolvido = diasTarefas ?? diasTopicoResolvido;
  return {
    data_topico: diasTopicoResolvido != null ? somarDias(ev.data_evento, diasTopicoResolvido) : "",
    data_tarefas: diasTarefasResolvido != null ? somarDias(ev.data_evento, diasTarefasResolvido) : ""
  };
}
async function aplicarPrazosEvento(db, eventoId) {
  const ev = await db.prepare("SELECT data_evento FROM eventos WHERE id=?").bind(eventoId).first();
  const temData = !!(ev && ev.data_evento);
  const painel = await montarPainelPrazos(db, eventoId);
  let itensAtualizados = 0, tarefasAtualizadas = 0, responsaveisAtualizados = 0;
  for (const et of painel) {
    for (const cat of et.categorias) {
      for (const top of cat.topicos) {
        if (temData) {
          if (top.data_topico) {
            await db.prepare("UPDATE op_itens SET data_limite=? WHERE id=?").bind(top.data_topico, top.item_id).run();
            itensAtualizados++;
          }
          if (top.data_tarefas) {
            const r = await db.prepare("UPDATE op_tarefas SET data_limite=? WHERE item_id=?").bind(top.data_tarefas, top.item_id).run();
            tarefasAtualizadas += r.meta && r.meta.changes || 0;
          }
        }
        const respTopicoResolvido = top.resp_topico || cat.responsavel || et.responsavel || "";
        const respTarefasResolvido = top.resp_tarefas || respTopicoResolvido;
        if (respTopicoResolvido) {
          const r1 = await db.prepare(
            "UPDATE op_itens SET responsavel=?, responsavel_auto=1 WHERE id=? AND (responsavel='' OR responsavel_auto=1)"
          ).bind(respTopicoResolvido, top.item_id).run();
          responsaveisAtualizados += r1.meta && r1.meta.changes || 0;
        }
        if (respTarefasResolvido) {
          const r2 = await db.prepare(
            "UPDATE op_tarefas SET responsavel=?, responsavel_auto=1 WHERE item_id=? AND (responsavel='' OR responsavel_auto=1)"
          ).bind(respTarefasResolvido, top.item_id).run();
          responsaveisAtualizados += r2.meta && r2.meta.changes || 0;
        }
      }
    }
  }
  return { itens: itensAtualizados, tarefas: tarefasAtualizadas, responsaveis: responsaveisAtualizados };
}
async function excluirAnexosDe(db, env, parentTipo, parentId) {
  const { results } = await db.prepare(
    "SELECT r2_key FROM anexos WHERE parent_tipo=? AND parent_id=?"
  ).bind(parentTipo, parentId).all();
  for (const a of results) await env.ANEXOS.delete(a.r2_key);
  await db.prepare("DELETE FROM anexos WHERE parent_tipo=? AND parent_id=?").bind(parentTipo, parentId).run();
}
async function excluirAnexosDeVarios(db, env, parentTipo, subquerySql, bindArgs) {
  const { results } = await db.prepare(
    `SELECT r2_key FROM anexos WHERE parent_tipo=? AND parent_id IN (${subquerySql})`
  ).bind(parentTipo, ...bindArgs).all();
  for (const a of results) await env.ANEXOS.delete(a.r2_key);
  await db.prepare(
    `DELETE FROM anexos WHERE parent_tipo=? AND parent_id IN (${subquerySql})`
  ).bind(parentTipo, ...bindArgs).run();
}
async function excluirAnexosDoEvento(db, env, eventoId) {
  const where = `
    (parent_tipo='op_item' AND parent_id IN (SELECT id FROM op_itens WHERE evento_id=?)) OR
    (parent_tipo='op_tarefa' AND parent_id IN (SELECT id FROM op_tarefas WHERE item_id IN (SELECT id FROM op_itens WHERE evento_id=?))) OR
    (parent_tipo='campo_tarefa' AND parent_id IN (SELECT id FROM campo_tarefas WHERE dia_id IN (SELECT id FROM campo_dias WHERE evento_id=?))) OR
    (parent_tipo='item' AND parent_id IN (SELECT id FROM itens WHERE evento_id=?)) OR
    (parent_tipo='registro_utv' AND parent_id IN (SELECT id FROM registros_utv WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?))) OR
    (parent_tipo='prog_tarefa' AND parent_id IN (SELECT id FROM prog_tarefas WHERE acontecimento_id IN (SELECT id FROM prog_acontecimentos WHERE evento_id=?))) OR
    (parent_tipo='cliente_nf_utv' AND parent_id IN (SELECT id FROM clientes WHERE evento_id=?))`;
  const { results } = await db.prepare(`SELECT r2_key FROM anexos WHERE ${where}`).bind(eventoId, eventoId, eventoId, eventoId, eventoId, eventoId, eventoId).all();
  for (const a of results) await env.ANEXOS.delete(a.r2_key);
  await db.prepare(`DELETE FROM anexos WHERE ${where}`).bind(eventoId, eventoId, eventoId, eventoId, eventoId, eventoId, eventoId).run();
}
var ANTHROPIC_MODEL = "claude-sonnet-5";
async function analisarOperacao(db, env, eid, admin) {
  const { results: itens } = await db.prepare(
    "SELECT * FROM op_itens WHERE evento_id=? ORDER BY ordem, id"
  ).bind(eid).all();
  const { results: opTarefas } = await db.prepare(
    "SELECT t.* FROM op_tarefas t JOIN op_itens i ON i.id=t.item_id WHERE i.evento_id=? ORDER BY t.ordem, t.id"
  ).bind(eid).all();
  const { results: opSubtarefas } = await db.prepare(
    "SELECT s.* FROM op_subtarefas s JOIN op_tarefas t ON t.id=s.tarefa_id JOIN op_itens i ON i.id=t.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id"
  ).bind(eid).all();
  const osp = {};
  for (const s of opSubtarefas) (osp[s.tarefa_id] = osp[s.tarefa_id] || []).push(s);
  const otp = {};
  for (const t of opTarefas) {
    t.subtarefas = osp[t.id] || [];
    (otp[t.item_id] = otp[t.item_id] || []).push(t);
  }
  for (const it of itens) it.tarefas = otp[it.id] || [];
  const { results: dias } = await db.prepare("SELECT * FROM campo_dias WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
  const { results: tarefas } = await db.prepare(
    "SELECT t.* FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY t.ordem, t.id"
  ).bind(eid).all();
  const { results: subs } = await db.prepare(
    "SELECT s.* FROM campo_subtarefas s JOIN campo_tarefas t ON t.id=s.tarefa_id JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY s.ordem, s.id"
  ).bind(eid).all();
  const sp = {};
  for (const s of subs) (sp[s.tarefa_id] = sp[s.tarefa_id] || []).push(s);
  const tp = {};
  for (const t of tarefas) {
    t.subs = sp[t.id] || [];
    (tp[t.dia_id] = tp[t.dia_id] || []).push(t);
  }
  for (const d of dias) d.tarefas = tp[d.id] || [];
  let custos = null;
  if (admin) {
    const r = await db.prepare("SELECT item, categoria, valor, status, valor_pago FROM custos WHERE evento_id=?").bind(eid).all();
    custos = r.results;
  }
  const dados = { itens_do_ciclo: itens, operacao_em_campo: dias, custos };
  const tool = {
    name: "reportar_analise",
    description: "Reporta a an\xE1lise da opera\xE7\xE3o em campos estruturados.",
    input_schema: {
      type: "object",
      properties: {
        resumo: { type: "string" },
        pendencias: { type: "array", items: { type: "string" } },
        atrasos: { type: "array", items: { type: "string" } },
        riscos: { type: "array", items: { type: "string" } },
        inconsistencias: { type: "array", items: { type: "string" } },
        prioridades: { type: "array", items: { type: "string" } },
        oportunidades: { type: "array", items: { type: "string" } }
      },
      required: ["resumo", "pendencias", "atrasos", "riscos", "inconsistencias", "prioridades", "oportunidades"]
    }
  };
  const prompt = "Voc\xEA analisa a opera\xE7\xE3o de uma expedi\xE7\xE3o de UTV da Desbravando UTV. Os dados abaixo trazem os t\xF3picos do ciclo de planejamento (cada um com respons\xE1vel, status, prazo e seu checklist de tarefas) e a Opera\xE7\xE3o em Campo (dias e tarefas cronol\xF3gicas)" + (admin ? ", al\xE9m dos custos reais" : "") + ". Identifique pend\xEAncias, atrasos, riscos, inconsist\xEAncias, prioridades e oportunidades de melhoria. Seja espec\xEDfico, citando nomes de itens/tarefas quando fizer sentido. Responda em portugu\xEAs usando a ferramenta reportar_analise.\n\nDADOS:\n" + JSON.stringify(dados);
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 25e3);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        tools: [tool],
        tool_choice: { type: "tool", name: "reportar_analise" }
      })
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      return { erro: "A IA n\xE3o respondeu corretamente (" + r.status + ")", detalhe: t.slice(0, 300) };
    }
    const j = await r.json();
    const uso = (j.content || []).find((c) => c.type === "tool_use" && c.name === "reportar_analise");
    if (!uso) return { erro: "A IA n\xE3o retornou a an\xE1lise esperada" };
    return uso.input;
  } catch (e) {
    return { erro: e.name === "AbortError" ? "A an\xE1lise demorou demais \u2014 tente novamente" : "Erro ao chamar a IA: " + e.message };
  } finally {
    clearTimeout(to);
  }
}
var LINHAS_PADRAO = [
  ["Hospedagem", "pessoa", 1, 0, "diarias", "Hospedagem"],
  ["Refei\xE7\xF5es", "pessoa", 1, 0, "refeicoes", "Refei\xE7\xF5es"],
  ["Cerveja", "pessoa", 15, 0, "dias_trilha", "Bebidas"],
  ["\xC1gua", "pessoa", 3, 0, "dias_trilha", "Bebidas"],
  ["Refrigerante", "pessoa", 3, 0, "dias_trilha", "Bebidas"],
  ["Gelo", "pessoa", 1, 0, "dias_trilha", "Bebidas"],
  ["Chopp", "pessoa", 4, 0, "eventos", "Bebidas"],
  ["Barman/Drinks", "pessoa", 1, 0, "eventos", "Bebidas"],
  ["Atra\xE7\xF5es musicais", "fixo", 1, 0, "eventos", "Eventos"],
  ["Guia local", "fixo", 1, 0, "nenhum", "Parceiro Local"],
  ["Camiseta", "pessoa", 1, 0, "nenhum", "Kits"],
  ["Extras", "fixo", 1, 0, "nenhum", ""]
];
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const mcpRes = await handleMcp(request, env);
    if (mcpRes) return mcpRes;
    if (method === "OPTIONS") return new Response(null, { headers: CORS2 });
    if (path === "/" && method === "GET")
      return new Response(UI_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
    if (!path.startsWith("/api/")) return json({ erro: "n\xE3o encontrado" }, 404);
    const db = env.DB;
    if (path === "/api/login" && method === "POST") return rotaLogin(request, db);
    const auth = await autenticar(request, env, db);
    if (!auth) return json({ erro: "sess\xE3o expirada ou chave inv\xE1lida" }, 401);
    const pode = /* @__PURE__ */ __name((p) => auth.admin || auth.perms.has(p), "pode");
    if (path === "/api/me" && method === "GET") return json(montarMe(auth));
    if (path === "/api/logout" && method === "POST") {
      if (auth.tokenHash) await db.prepare("DELETE FROM sessoes WHERE token_hash=?").bind(auth.tokenHash).run();
      return json({ ok: true });
    }
    if (path === "/api/me/senha" && method === "POST") {
      if (auth.tipo !== "usuario") return json({ erro: "entre com o seu usu\xE1rio (e-mail) pra trocar a senha" }, 400);
      const b = await request.json().catch(() => ({}));
      const u = await db.prepare("SELECT senha_hash FROM usuarios WHERE id=?").bind(auth.usuario.id).first();
      if (!u || !await conferirSenha(String(b.atual ?? ""), u.senha_hash)) return json({ erro: "senha atual incorreta" }, 400);
      if (String(b.nova ?? "").length < SENHA_MIN) return json({ erro: `a nova senha precisa ter pelo menos ${SENHA_MIN} caracteres` }, 400);
      await db.prepare("UPDATE usuarios SET senha_hash=?, atualizado_em=datetime('now') WHERE id=?").bind(await hashSenha(String(b.nova)), auth.usuario.id).run();
      await db.prepare("DELETE FROM sessoes WHERE usuario_id=? AND token_hash<>?").bind(auth.usuario.id, auth.tokenHash).run();
      return json({ ok: true });
    }
    if (/^\/api\/(acessos|perfis|usuarios)(\/|$)/.test(path)) {
      if (!auth.admin) return json({ erro: "Dispon\xEDvel apenas para o Administrador Geral." }, 403);
      return rotasAcessos(request, path, method, db, auth);
    }
    if (auth.tipo === "usuario" && !auth.admin) {
      const negadoMsg = await conferirPermissao(request, url, path, method, db, auth, pode);
      if (negadoMsg) return json({ erro: negadoMsg }, 403);
    }
    const res = await rotasApi(request, env, url, path, method, db, auth, pode);
    if (auth.tipo === "usuario" && method === "GET" && !pode("financeiro.ver_valores") && res.status === 200) {
      const regra = MASCARA_VALORES.find(([re]) => re.test(path));
      if (regra) return json(mascarar(await res.json(), new Set(regra[1])));
    }
    return res;
  }
};
async function rotasApi(request, env, url, path, method, db, auth, pode) {
  const admin = auth.admin || auth.tipo === "usuario";
  const verFinanceiro = auth.tipo === "usuario" ? pode("financeiro.visualizar") : auth.admin;
  const verParticipantes = auth.tipo === "usuario" ? pode("participantes.visualizar") : auth.admin;
  const negado = /* @__PURE__ */ __name(() => json({ erro: "dispon\xEDvel apenas para a chave admin" }, 403), "negado");
  let m;
  if (path === "/api/eventos" && method === "GET") {
    const { results } = await db.prepare(`
        SELECT e.id, e.nome, e.criado_em, e.arquivado, e.data_evento, e.data_evento_fim,
               COUNT(i.id) AS total,
               SUM(CASE WHEN i.status='concluido' THEN 1 ELSE 0 END) AS concluidos,
               SUM(CASE WHEN i.status='andamento' THEN 1 ELSE 0 END) AS andamento,
               (SELECT COALESCE(SUM(cu.valor),0) FROM custos cu WHERE cu.evento_id=e.id) AS valor_total,
               (SELECT COUNT(*) FROM op_itens o WHERE o.evento_id=e.id) AS op_total
        FROM eventos e LEFT JOIN itens i ON i.evento_id=e.id
        GROUP BY e.id ORDER BY e.arquivado ASC, e.id DESC`).all();
    return json({ eventos: results });
  }
  if (path === "/api/eventos-ativos/painel" && method === "GET") {
    if (!admin) return negado();
    const { results: eventosAtivos } = await db.prepare(`
        SELECT id, nome, data_evento, data_evento_fim FROM eventos WHERE arquivado=0
        ORDER BY (data_evento IS NULL OR data_evento='') ASC, data_evento ASC, id ASC`).all();
    if (!eventosAtivos.length) return json({ eventos: [] });
    const ids = eventosAtivos.map((e) => e.id);
    const ph = ids.map(() => "?").join(",");
    const { results: faturamentoRows } = await db.prepare(`
        SELECT fr.evento_id AS evento_id, SUM(fp.valor_previsto) AS total
        FROM financeiro_receber fr JOIN financeiro_parcelas fp ON fp.receber_id = fr.id
        LEFT JOIN clientes cl ON cl.id = fr.cliente_id
        WHERE fr.evento_id IN (${ph}) AND COALESCE(cl.desistente,0)=0 GROUP BY fr.evento_id`).bind(...ids).all();
    const { results: custoRows } = await db.prepare(
      `SELECT evento_id, SUM(valor) AS total FROM custos WHERE evento_id IN (${ph}) GROUP BY evento_id`
    ).bind(...ids).all();
    const { results: clientes } = await db.prepare(
      `SELECT * FROM clientes WHERE evento_id IN (${ph}) ORDER BY evento_id, id`
    ).bind(...ids).all();
    const fatMap = {};
    for (const r of faturamentoRows) fatMap[r.evento_id] = r.total || 0;
    const custoMap = {};
    for (const r of custoRows) custoMap[r.evento_id] = r.total || 0;
    const clientesMap = {};
    for (const c of clientes) (clientesMap[c.evento_id] = clientesMap[c.evento_id] || []).push(c);
    for (const ev of eventosAtivos) {
      const faturamento = fatMap[ev.id] || 0;
      const custo = custoMap[ev.id] || 0;
      const resultado = faturamento - custo;
      ev.financeiro = { faturamento, custo, resultado, pct: faturamento > 5e-3 ? resultado / faturamento * 100 : null };
      ev.clientes = clientesMap[ev.id] || [];
    }
    return json({ eventos: eventosAtivos });
  }
  if (path === "/api/eventos" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const nome = S(b.nome, 120).trim();
    if (!nome) return json({ erro: "informe o nome do evento" }, 400);
    const r = await db.prepare("INSERT INTO eventos (nome, data_evento) VALUES (?,?)").bind(nome, S(b.data_evento, 20)).run();
    const novo = r.meta.last_row_id;
    const origem = I(b.copiar_de);
    if (origem) {
      const limpar = b.limpar_valores ? 1 : 0;
      await db.prepare(`
          INSERT INTO itens (evento_id, ordem, dia, item, setor, status, prioridade, data_limite,
                             responsavel, fornecedor, quantidade, valor, observacoes)
          SELECT ?, ordem, dia, item, setor, 'afazer', prioridade, '', responsavel,
                 CASE WHEN ? THEN '' ELSE fornecedor END, quantidade,
                 CASE WHEN ? THEN NULL ELSE valor END, ''
          FROM itens WHERE evento_id=? ORDER BY ordem, id`).bind(novo, limpar, limpar, origem).run();
      await db.prepare(`
          INSERT INTO quartos (evento_id, ordem, nome, capacidade, diaria, adicional, observacoes)
          SELECT ?, ordem, nome, capacidade, diaria, adicional, observacoes
          FROM quartos WHERE evento_id=? ORDER BY ordem, id`).bind(novo, origem).run();
      const { results: cs } = await db.prepare(
        "SELECT id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd FROM cenarios WHERE evento_id=?"
      ).bind(origem).all();
      for (const c of cs) {
        const rc = await db.prepare(
          "INSERT INTO cenarios (evento_id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd) VALUES (?,?,?,?,?,?,?)"
        ).bind(novo, c.nome, c.pessoas, c.diarias, c.dias_trilha, c.refeicoes, c.eventos_qtd).run();
        await db.prepare(`
            INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult, categoria_id)
            SELECT ?, ordem, item, tipo, media, preco, mult, categoria_id FROM cenario_linhas WHERE cenario_id=?`).bind(rc.meta.last_row_id, c.id).run();
      }
      await db.prepare(`
          INSERT INTO op_itens (evento_id, etapa, categoria, etapa_id, categoria_id, nome, ordem, homologado,
                                 responsavel, status, data_limite, observacoes)
          SELECT ?, etapa, categoria, etapa_id, categoria_id, nome, ordem, homologado,
                 responsavel, 'afazer', '', observacoes
          FROM op_itens WHERE evento_id=? ORDER BY ordem, id`).bind(novo, origem).run();
      await db.prepare(`
          INSERT INTO op_tarefas (item_id, titulo, concluido, status, responsavel, data_limite, observacoes, ordem)
          SELECT ni.id, st.titulo, 0, 'afazer', st.responsavel, '', st.observacoes, st.ordem
          FROM op_tarefas st
          JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem, id) AS rn FROM op_itens WHERE evento_id=?) si ON si.id=st.item_id
          JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem, id) AS rn FROM op_itens WHERE evento_id=?) ni ON ni.rn=si.rn`).bind(origem, novo).run();
      await db.prepare(`
          WITH si_map AS (SELECT id AS old_item, ROW_NUMBER() OVER (ORDER BY ordem, id) AS irn FROM op_itens WHERE evento_id=?),
               ni_map AS (SELECT id AS new_item, ROW_NUMBER() OVER (ORDER BY ordem, id) AS irn FROM op_itens WHERE evento_id=?),
               st_map AS (SELECT ot.id AS old_tarefa, si_map.irn AS irn,
                                 ROW_NUMBER() OVER (PARTITION BY ot.item_id ORDER BY ot.ordem, ot.id) AS trn
                          FROM op_tarefas ot JOIN si_map ON si_map.old_item = ot.item_id),
               nt_map AS (SELECT ot.id AS new_tarefa, ni_map.irn AS irn,
                                 ROW_NUMBER() OVER (PARTITION BY ot.item_id ORDER BY ot.ordem, ot.id) AS trn
                          FROM op_tarefas ot JOIN ni_map ON ni_map.new_item = ot.item_id)
          INSERT INTO op_subtarefas (tarefa_id, titulo, concluido, ordem)
          SELECT nt_map.new_tarefa, os.titulo, 0, os.ordem
          FROM op_subtarefas os
          JOIN st_map ON st_map.old_tarefa = os.tarefa_id
          JOIN nt_map ON nt_map.irn = st_map.irn AND nt_map.trn = st_map.trn`).bind(origem, novo).run();
      await db.prepare(`
          INSERT INTO campo_dias (evento_id, rotulo, data, ordem)
          SELECT ?, rotulo, data, ordem FROM campo_dias WHERE evento_id=? ORDER BY ordem, id`).bind(novo, origem).run();
      await db.prepare(`
          INSERT INTO campo_tarefas (dia_id, nome, h_planejado, h_realizado, responsavel, tipo, status, data_limite, ordem, observacoes, fornecedor_id)
          SELECT nd.id, st.nome, st.h_planejado, '', st.responsavel, st.tipo, 'afazer', '', st.ordem, st.observacoes, st.fornecedor_id
          FROM campo_tarefas st
          JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem, id) AS rn FROM campo_dias WHERE evento_id=?) sd ON sd.id=st.dia_id
          JOIN (SELECT id, ROW_NUMBER() OVER (ORDER BY ordem, id) AS rn FROM campo_dias WHERE evento_id=?) nd ON nd.rn=sd.rn`).bind(origem, novo).run();
      await db.prepare(`
          WITH sd_map AS (SELECT id AS old_dia, ROW_NUMBER() OVER (ORDER BY ordem, id) AS drn FROM campo_dias WHERE evento_id=?),
               nd_map AS (SELECT id AS new_dia, ROW_NUMBER() OVER (ORDER BY ordem, id) AS drn FROM campo_dias WHERE evento_id=?),
               st_map AS (SELECT ct.id AS old_tarefa, sd_map.drn AS drn,
                                 ROW_NUMBER() OVER (PARTITION BY ct.dia_id ORDER BY ct.ordem, ct.id) AS trn
                          FROM campo_tarefas ct JOIN sd_map ON sd_map.old_dia = ct.dia_id),
               nt_map AS (SELECT ct.id AS new_tarefa, nd_map.drn AS drn,
                                 ROW_NUMBER() OVER (PARTITION BY ct.dia_id ORDER BY ct.ordem, ct.id) AS trn
                          FROM campo_tarefas ct JOIN nd_map ON nd_map.new_dia = ct.dia_id)
          INSERT INTO campo_subtarefas (tarefa_id, titulo, concluido, ordem)
          SELECT nt_map.new_tarefa, ss.titulo, 0, ss.ordem
          FROM campo_subtarefas ss
          JOIN st_map ON st_map.old_tarefa = ss.tarefa_id
          JOIN nt_map ON nt_map.drn = st_map.drn AND nt_map.trn = st_map.trn`).bind(origem, novo).run();
    }
    if (Array.isArray(b.prazos) && b.prazos.length) {
      await salvarLinhasPrazo(db, "prazos_evento", novo, b.prazos, S(b.atualizado_por, 60));
    }
    if (Array.isArray(b.responsaveis) && b.responsaveis.length) {
      await salvarLinhasResp(db, novo, b.responsaveis, S(b.atualizado_por, 60));
    }
    if (origem) await aplicarPrazosEvento(db, novo);
    return json({ ok: true, id: novo });
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if ("nome" in b) {
        const nome = S(b.nome, 120).trim();
        if (!nome) return json({ erro: "nome vazio" }, 400);
        await db.prepare("UPDATE eventos SET nome=? WHERE id=?").bind(nome, id).run();
      }
      if ("arquivado" in b) await db.prepare("UPDATE eventos SET arquivado=? WHERE id=?").bind(B(b.arquivado), id).run();
      if ("data_evento" in b) await db.prepare("UPDATE eventos SET data_evento=? WHERE id=?").bind(S(b.data_evento, 20), id).run();
      if ("data_evento_fim" in b) await db.prepare("UPDATE eventos SET data_evento_fim=? WHERE id=?").bind(S(b.data_evento_fim, 20), id).run();
      if ("hospedagem_diarias" in b) await db.prepare("UPDATE eventos SET hospedagem_diarias=? WHERE id=?").bind(I(b.hospedagem_diarias), id).run();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM pagamentos WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM cliente_notas WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM alocacoes WHERE quarto_id IN (SELECT id FROM quartos WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM cenario_linhas WHERE cenario_id IN (SELECT id FROM cenarios WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM op_subtarefas WHERE tarefa_id IN (SELECT id FROM op_tarefas WHERE item_id IN (SELECT id FROM op_itens WHERE evento_id=?))").bind(id).run();
      await db.prepare("DELETE FROM op_tarefas WHERE item_id IN (SELECT id FROM op_itens WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM campo_subtarefas WHERE tarefa_id IN (SELECT id FROM campo_tarefas WHERE dia_id IN (SELECT id FROM campo_dias WHERE evento_id=?))").bind(id).run();
      await db.prepare("DELETE FROM prog_subtarefas WHERE tarefa_id IN (SELECT id FROM prog_tarefas WHERE acontecimento_id IN (SELECT id FROM prog_acontecimentos WHERE evento_id=?))").bind(id).run();
      await db.prepare("DELETE FROM prog_tarefas WHERE acontecimento_id IN (SELECT id FROM prog_acontecimentos WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE (parent_tipo='campo_tarefa' AND parent_id IN (SELECT id FROM campo_tarefas WHERE dia_id IN (SELECT id FROM campo_dias WHERE evento_id=?))) OR (parent_tipo='op_item' AND parent_id IN (SELECT id FROM op_itens WHERE evento_id=?)) OR (parent_tipo='op_tarefa' AND parent_id IN (SELECT id FROM op_tarefas WHERE item_id IN (SELECT id FROM op_itens WHERE evento_id=?))) OR (parent_tipo='item' AND parent_id IN (SELECT id FROM itens WHERE evento_id=?)) OR (parent_tipo='prog_tarefa' AND parent_id IN (SELECT id FROM prog_tarefas WHERE acontecimento_id IN (SELECT id FROM prog_acontecimentos WHERE evento_id=?)))").bind(id, id, id, id, id).run();
      await excluirAnexosDoEvento(db, env, id);
      await db.prepare("DELETE FROM registros_utv WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM campo_tarefas WHERE dia_id IN (SELECT id FROM campo_dias WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM financeiro_parcelas WHERE receber_id IN (SELECT id FROM financeiro_receber WHERE evento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM pagamentos_terceiros WHERE evento_id=?").bind(id).run();
      for (const t of [
        "itens",
        "clientes",
        "quartos",
        "cenarios",
        "custos",
        "op_itens",
        "campo_dias",
        "prog_acontecimentos",
        "financeiro_receber",
        "prazos_evento",
        "responsaveis_evento"
      ])
        await db.prepare(`DELETE FROM ${t} WHERE evento_id=?`).bind(id).run();
      await db.prepare("DELETE FROM eventos WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/itens$/)) {
    const eid = +m[1];
    if (method === "GET") {
      const ev = await db.prepare("SELECT * FROM eventos WHERE id=?").bind(eid).first();
      if (!ev) return json({ erro: "evento n\xE3o encontrado" }, 404);
      const { results } = await db.prepare("SELECT * FROM itens WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
      {
        const rs = await db.prepare(
          "SELECT s.* FROM subitens s JOIN itens i ON i.id=s.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id"
        ).bind(eid).all();
        const porItem = {};
        for (const s of rs.results || []) (porItem[s.item_id] = porItem[s.item_id] || []).push(s);
        for (const it of results) it.subitens = porItem[it.id] || [];
      }
      let custo_total = 0, pessoas = null;
      if (verFinanceiro) {
        const ct = await db.prepare("SELECT COALESCE(SUM(valor),0) AS t FROM custos WHERE evento_id=?").bind(eid).first();
        custo_total = ct ? ct.t : 0;
      }
      if (verParticipantes) {
        const pc = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN tipo='crianca' THEN 1 ELSE 0 END) AS criancas, SUM(CASE WHEN tipo<>'crianca' THEN 1 ELSE 0 END) AS adultos, SUM(CASE WHEN papel<>'acompanhante' AND utv='4 lugares' THEN 1 ELSE 0 END) AS utv4, SUM(CASE WHEN papel<>'acompanhante' AND utv='2 lugares' THEN 1 ELSE 0 END) AS utv2 FROM clientes WHERE evento_id=? AND desistente=0").bind(eid).first();
        pessoas = { total: pc && pc.total || 0, adultos: pc && pc.adultos || 0, criancas: pc && pc.criancas || 0, utv4: pc && pc.utv4 || 0, utv2: pc && pc.utv2 || 0 };
      }
      return json({ evento: ev, itens: results, custo_total, pessoas });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const lista = Array.isArray(b.itens) ? b.itens : [b];
      const por = S(b.atualizado_por, 60);
      const ids = [];
      for (const bruto of lista.slice(0, 200)) {
        const c = limparItem(bruto);
        if (!c.item) continue;
        const r = await db.prepare(`
            INSERT INTO itens (evento_id, ordem, dia, item, setor, status, prioridade, data_limite,
                               responsavel, fornecedor, quantidade, valor, horario, observacoes, atualizado_por)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          eid,
          c.ordem ?? null,
          c.dia ?? "",
          c.item,
          c.setor ?? "",
          c.status ?? "afazer",
          c.prioridade ?? null,
          c.data_limite ?? "",
          c.responsavel ?? "",
          c.fornecedor ?? "",
          c.quantidade ?? "",
          c.valor ?? null,
          c.horario ?? "",
          c.observacoes ?? "",
          por
        ).run();
        ids.push(r.meta.last_row_id);
      }
      if (!ids.length) return json({ erro: "nenhum item v\xE1lido" }, 400);
      return json({ ok: true, ids });
    }
  }
  if (m = path.match(/^\/api\/itens\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparItem(b);
      if (!await upd(db, "itens", id, c, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      const item = await db.prepare("SELECT * FROM itens WHERE id=?").bind(id).first();
      return item ? json({ ok: true, item }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM subitens WHERE item_id=?").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='item' AND parent_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "item", id);
      await db.prepare("DELETE FROM itens WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/itens\/reordenar$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.prepare("UPDATE itens SET ordem=? WHERE id=? AND evento_id=?").bind(i + 1, I(ids[i]), eid).run();
    }
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/itens\/(\d+)\/subitens$/)) {
    const iid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare("SELECT * FROM subitens WHERE item_id=? ORDER BY ordem, id").bind(iid).all();
      return json({ subitens: results });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const c = limparSubitem(b);
      if (!c.titulo) return json({ erro: "t\xEDtulo obrigat\xF3rio" }, 400);
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subitens WHERE item_id=?").bind(iid).first();
      const r = await db.prepare("INSERT INTO subitens (item_id, ordem, titulo, concluido) VALUES (?,?,?,?)").bind(iid, (mx ? mx.mo : 0) + 1, c.titulo, c.concluido ?? 0).run();
      const sub = await db.prepare("SELECT * FROM subitens WHERE id=?").bind(r.meta.last_row_id).first();
      return json({ ok: true, subitem: sub });
    }
  }
  if (m = path.match(/^\/api\/subitens\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparSubitem(b);
      if (!await upd(db, "subitens", id, c)) return json({ erro: "nada para atualizar" }, 400);
      const sub = await db.prepare("SELECT * FROM subitens WHERE id=?").bind(id).first();
      return sub ? json({ ok: true, subitem: sub }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM subitens WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/clientes$/)) {
    if (!admin) return negado();
    const eid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare(`
          SELECT c.*, COALESCE(SUM(p.valor),0) AS pago,
                 (SELECT COUNT(*) FROM cliente_notas n WHERE n.cliente_id=c.id) AS notas
          FROM clientes c LEFT JOIN pagamentos p ON p.cliente_id=c.id
          WHERE c.evento_id=? GROUP BY c.id ORDER BY c.grupo, c.id`).bind(eid).all();
      return json({ clientes: results });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const c = limparCliente(b);
      if (!c.nome) return json({ erro: "informe o nome" }, 400);
      const r = await db.prepare(`
          INSERT INTO clientes (evento_id, grupo, nome, cpf, telefone, tipo, camiseta, utv, nf,
                                contrato_enviado, contrato_assinado, pacote, forma_pagamento, staff,
                                observacoes, contato_id, papel, desistente, cegonha,
                                endereco, nacionalidade, estado_civil, rg, email,
                                emergencia_nome, emergencia_parentesco, emergencia_telefone, atualizado_por)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        eid,
        c.grupo ?? "",
        c.nome,
        c.cpf ?? "",
        c.telefone ?? "",
        c.tipo ?? "adulto",
        c.camiseta ?? "",
        c.utv ?? "",
        c.nf ?? "",
        c.contrato_enviado ?? 0,
        c.contrato_assinado ?? 0,
        c.pacote ?? null,
        c.forma_pagamento ?? "",
        c.staff ?? 0,
        c.observacoes ?? "",
        c.contato_id ?? null,
        c.papel ?? "piloto",
        c.desistente ?? 0,
        c.cegonha ?? null,
        c.endereco ?? "",
        c.nacionalidade ?? "",
        c.estado_civil ?? "",
        c.rg ?? "",
        c.email ?? "",
        c.emergencia_nome ?? "",
        c.emergencia_parentesco ?? "",
        c.emergencia_telefone ?? "",
        S(b.atualizado_por, 60)
      ).run();
      const novoId = r.meta.last_row_id;
      if (!(c.staff ?? 0) && !(c.desistente ?? 0)) {
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM financeiro_receber WHERE evento_id=?").bind(eid).first();
        await db.prepare(`
            INSERT INTO financeiro_receber (evento_id, ordem, cliente, cliente_id, status, atualizado_por)
            VALUES (?,?,?,?,?,?)`).bind(eid, (mx ? mx.mo : 0) + 1, c.nome, novoId, "pendente", S(b.atualizado_por, 60)).run();
      }
      return json({ ok: true, id: novoId });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/pessoas-busca$/)) && method === "GET") {
    if (!admin) return negado();
    const eid = +m[1];
    const q = S(url.searchParams.get("q"), 80).trim().toLowerCase();
    if (q.length < 2) return json({ pessoas: [] });
    const like = "%" + q.replace(/[%_\\]/g, "\\$&") + "%";
    const { results: cli } = await db.prepare(`
        SELECT c.id, c.evento_id, c.contato_id, c.nome, c.grupo, c.cpf, c.telefone, c.camiseta,
               c.tipo, c.endereco, c.nacionalidade, c.estado_civil, c.rg, c.email,
               c.emergencia_nome, c.emergencia_parentesco, c.emergencia_telefone,
               e.nome AS evento_nome
        FROM clientes c JOIN eventos e ON e.id = c.evento_id
        WHERE lower(c.nome) LIKE ? ESCAPE '\\'
        ORDER BY c.id DESC LIMIT 80`).bind(like).all();
    const { results: cont } = await db.prepare(`
        SELECT id, nome, grupo, cpf, telefone, camiseta
        FROM crm_contatos
        WHERE lower(nome) LIKE ? ESCAPE '\\'
        ORDER BY nome COLLATE NOCASE LIMIT 40`).bind(like).all();
    const linhas = [];
    const porContato = /* @__PURE__ */ new Map(), porNome = /* @__PURE__ */ new Map();
    const norm = /* @__PURE__ */ __name((s) => s.trim().toLowerCase(), "norm");
    const novo = /* @__PURE__ */ __name((r) => ({
      contato_id: r.contato_id || null,
      nome: r.nome,
      grupo: r.grupo || "",
      cpf: r.cpf || "",
      telefone: r.telefone || "",
      camiseta: r.camiseta || "",
      tipo: r.tipo || "adulto",
      endereco: r.endereco || "",
      nacionalidade: r.nacionalidade || "",
      estado_civil: r.estado_civil || "",
      rg: r.rg || "",
      email: r.email || "",
      emergencia_nome: r.emergencia_nome || "",
      emergencia_parentesco: r.emergencia_parentesco || "",
      emergencia_telefone: r.emergencia_telefone || "",
      participacoes: 0,
      ultimo_evento: "",
      ja_neste_evento: 0,
      cliente_id_neste_evento: null
    }), "novo");
    for (const r of cli) {
      const nm = norm(r.nome);
      let p = r.contato_id && porContato.get(r.contato_id) || porNome.get(nm);
      if (!p) {
        p = novo(r);
        linhas.push(p);
      }
      if (!p.contato_id && r.contato_id) p.contato_id = r.contato_id;
      if (p.contato_id) porContato.set(p.contato_id, p);
      porNome.set(nm, p);
      p.participacoes++;
      if (r.evento_id === eid) {
        p.ja_neste_evento = 1;
        p.cliente_id_neste_evento = r.id;
      } else if (!p.ultimo_evento) p.ultimo_evento = r.evento_nome || "";
    }
    for (const r of cont) {
      const nm = norm(r.nome);
      let p = porContato.get(r.id) || porNome.get(nm);
      if (!p) {
        p = novo({ ...r, contato_id: r.id });
        linhas.push(p);
      }
      if (!p.contato_id) p.contato_id = r.id;
      porContato.set(r.id, p);
      porNome.set(nm, p);
      if (!p.grupo) p.grupo = r.grupo || "";
      if (!p.cpf) p.cpf = r.cpf || "";
      if (!p.telefone) p.telefone = r.telefone || "";
      if (!p.camiseta) p.camiseta = r.camiseta || "";
    }
    const lista = linhas.sort((a, b) => {
      const ap = a.nome.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.nome.toLowerCase().startsWith(q) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      if (b.participacoes !== a.participacoes) return b.participacoes - a.participacoes;
      return a.nome.localeCompare(b.nome, "pt");
    }).slice(0, 8);
    return json({ pessoas: lista });
  }
  if (m = path.match(/^\/api\/clientes\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "GET") {
      const cliente = await db.prepare("SELECT * FROM clientes WHERE id=?").bind(id).first();
      if (!cliente) return json({ erro: "n\xE3o encontrado" }, 404);
      const { results } = await db.prepare("SELECT * FROM pagamentos WHERE cliente_id=? ORDER BY id").bind(id).all();
      const { results: notas } = await db.prepare("SELECT * FROM cliente_notas WHERE cliente_id=? ORDER BY id DESC").bind(id).all();
      const { results: registrosUtv } = await db.prepare("SELECT * FROM registros_utv WHERE cliente_id=? ORDER BY id DESC").bind(id).all();
      return json({ cliente, pagamentos: results, notas, registros_utv: registrosUtv });
    }
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparCliente(b);
      let recAntes = null, recDepois = null;
      if ("staff" in c || "desistente" in c) {
        const cur = await db.prepare("SELECT staff, desistente FROM clientes WHERE id=?").bind(id).first();
        if (cur) {
          const staffDepois = "staff" in c ? !!c.staff : !!cur.staff;
          const desistDepois = "desistente" in c ? !!c.desistente : !!cur.desistente;
          recAntes = !cur.staff && !cur.desistente;
          recDepois = !staffDepois && !desistDepois;
        }
      }
      let extraCli = `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`;
      if ("utv_recebido" in c) extraCli += `, utv_recebido_em=${c.utv_recebido ? "datetime('now')" : "''"}`;
      if ("utv_devolvido" in c) extraCli += `, utv_devolvido_em=${c.utv_devolvido ? "datetime('now')" : "''"}`;
      if (!await upd(db, "clientes", id, c, extraCli))
        return json({ erro: "nada para atualizar" }, 400);
      if ("nome" in c) {
        await db.prepare("UPDATE financeiro_receber SET cliente=? WHERE cliente_id=?").bind(c.nome, id).run();
        await db.prepare("UPDATE pagamentos_terceiros SET cliente_nome=? WHERE cliente_id=?").bind(c.nome, id).run();
      }
      if (recAntes === true && recDepois === false) {
        await db.prepare("DELETE FROM financeiro_parcelas WHERE receber_id IN (SELECT id FROM financeiro_receber WHERE cliente_id=?)").bind(id).run();
        await db.prepare("DELETE FROM financeiro_receber WHERE cliente_id=?").bind(id).run();
      } else if (recAntes === false && recDepois === true) {
        const jaTem = await db.prepare("SELECT id FROM financeiro_receber WHERE cliente_id=?").bind(id).first();
        if (!jaTem) {
          const linha = await db.prepare("SELECT nome, evento_id FROM clientes WHERE id=?").bind(id).first();
          const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM financeiro_receber WHERE evento_id=?").bind(linha.evento_id).first();
          await db.prepare(`
              INSERT INTO financeiro_receber (evento_id, ordem, cliente, cliente_id, status, atualizado_por)
              VALUES (?,?,?,?,?,?)`).bind(linha.evento_id, (mx ? mx.mo : 0) + 1, linha.nome, id, "pendente", S(b.atualizado_por, 60)).run();
        }
      }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM pagamentos WHERE cliente_id=?").bind(id).run();
      await db.prepare("DELETE FROM cliente_notas WHERE cliente_id=?").bind(id).run();
      await excluirAnexosDeVarios(db, env, "registro_utv", "SELECT id FROM registros_utv WHERE cliente_id=?", [id]);
      await db.prepare("DELETE FROM registros_utv WHERE cliente_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "cliente_nf_utv", id);
      await db.prepare("DELETE FROM alocacoes WHERE cliente_id=?").bind(id).run();
      await db.prepare("DELETE FROM financeiro_parcelas WHERE receber_id IN (SELECT id FROM financeiro_receber WHERE cliente_id=?)").bind(id).run();
      await db.prepare("DELETE FROM financeiro_receber WHERE cliente_id=?").bind(id).run();
      await db.prepare("UPDATE pagamentos_terceiros SET cliente_id=NULL WHERE cliente_id=?").bind(id).run();
      await db.prepare("DELETE FROM clientes WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/clientes\/(\d+)\/registros-utv$/)) && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const condicao = S(b.condicao_geral, 200).trim();
    if (!condicao) return json({ erro: "informe a condi\xE7\xE3o geral do UTV" }, 400);
    const r = await db.prepare(
      "INSERT INTO registros_utv (cliente_id, condicao_geral, observacoes, criado_por) VALUES (?,?,?,?)"
    ).bind(+m[1], condicao, S(b.observacoes, 1e3).trim(), S(b.criado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/registros-utv\/(\d+)$/)) {
    if (!admin) return negado();
    const rid = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const o = {};
      if ("condicao_geral" in b) o.condicao_geral = S(b.condicao_geral, 200).trim();
      if ("observacoes" in b) o.observacoes = S(b.observacoes, 1e3).trim();
      if ("condicao_geral" in o && !o.condicao_geral) return json({ erro: "informe a condi\xE7\xE3o geral do UTV" }, 400);
      if (!await upd(db, "registros_utv", rid, o)) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await excluirAnexosDe(db, env, "registro_utv", rid);
      await db.prepare("DELETE FROM registros_utv WHERE id=?").bind(rid).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/clientes\/(\d+)\/pagamentos$/)) && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const valor = N(b.valor);
    if (!valor || valor <= 0) return json({ erro: "informe um valor maior que zero" }, 400);
    const r = await db.prepare(
      "INSERT INTO pagamentos (cliente_id, valor, data, forma, observacoes, criado_por) VALUES (?,?,?,?,?,?)"
    ).bind(+m[1], valor, S(b.data, 20), S(b.forma, 60), S(b.observacoes, 300), S(b.criado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/pagamentos\/(\d+)$/)) && method === "DELETE") {
    if (!admin) return negado();
    await db.prepare("DELETE FROM pagamentos WHERE id=?").bind(+m[1]).run();
    return json({ ok: true });
  }
  if ((m = path.match(/^\/api\/clientes\/(\d+)\/notas$/)) && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const texto = S(b.texto, 1e3).trim();
    if (!texto) return json({ erro: "escreva a anota\xE7\xE3o" }, 400);
    const r = await db.prepare(
      "INSERT INTO cliente_notas (cliente_id, texto, criado_por) VALUES (?,?,?)"
    ).bind(+m[1], texto, S(b.criado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/cliente-notas\/(\d+)$/)) && method === "DELETE") {
    if (!admin) return negado();
    await db.prepare("DELETE FROM cliente_notas WHERE id=?").bind(+m[1]).run();
    return json({ ok: true });
  }
  if (path === "/api/cenarios/modelos" && method === "GET") {
    if (!admin) return negado();
    const { results } = await db.prepare(`
        SELECT c.id, c.nome, c.evento_id, c.pessoas, c.diarias, c.dias_trilha, c.refeicoes, c.eventos_qtd, e.nome AS evento
        FROM cenarios c JOIN eventos e ON e.id=c.evento_id
        WHERE c.modelo=1 ORDER BY c.nome COLLATE NOCASE`).all();
    return json({ modelos: results });
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/cenarios$/)) {
    if (!admin) return negado();
    const eid = +m[1];
    if (method === "GET") {
      const { results: cenarios } = await db.prepare("SELECT * FROM cenarios WHERE evento_id=? ORDER BY id").bind(eid).all();
      const { results: linhas } = await db.prepare(
        "SELECT l.* FROM cenario_linhas l JOIN cenarios c ON c.id=l.cenario_id WHERE c.evento_id=? ORDER BY l.ordem, l.id"
      ).bind(eid).all();
      return json({ cenarios, linhas });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const c = limparCenario(b);
      if (!c.nome) return json({ erro: "informe o nome do cen\xE1rio" }, 400);
      const r = await db.prepare(
        "INSERT INTO cenarios (evento_id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd) VALUES (?,?,?,?,?,?,?)"
      ).bind(eid, c.nome, c.pessoas ?? 1, c.diarias ?? 1, c.dias_trilha ?? 1, c.refeicoes ?? 1, c.eventos_qtd ?? 1).run();
      const novo = r.meta.last_row_id;
      const origem = I(b.copiar_de);
      if (origem) {
        await db.prepare(`
            INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult, categoria_id)
            SELECT ?, ordem, item, tipo, media, preco, mult, categoria_id FROM cenario_linhas WHERE cenario_id=?`).bind(novo, origem).run();
      } else {
        const { results: ccs } = await db.prepare("SELECT id, nome FROM centros_custo").all();
        const ccPorNome = {};
        for (const cc of ccs) ccPorNome[cc.nome] = cc.id;
        for (let i = 0; i < LINHAS_PADRAO.length; i++) {
          const l = LINHAS_PADRAO[i];
          await db.prepare("INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult, categoria_id) VALUES (?,?,?,?,?,?,?,?)").bind(novo, i + 1, l[0], l[1], l[2], l[3], l[4], ccPorNome[l[5]] || null).run();
        }
      }
      return json({ ok: true, id: novo });
    }
  }
  if (m = path.match(/^\/api\/cenarios\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "cenarios", id, limparCenario(b))) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM cenario_linhas WHERE cenario_id=?").bind(id).run();
      await db.prepare("DELETE FROM cenarios WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/cenarios\/(\d+)\/linhas$/)) && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const l = limparLinha(b);
    if (!l.item) return json({ erro: "informe o item" }, 400);
    const r = await db.prepare("INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult, categoria_id) VALUES (?,?,?,?,?,?,?,?)").bind(+m[1], l.ordem ?? 999, l.item, l.tipo ?? "pessoa", l.media ?? 1, l.preco ?? 0, l.mult ?? "nenhum", l.categoria_id ?? null).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/linhas\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "cenario_linhas", id, limparLinha(b))) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM cenario_linhas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/quartos$/)) {
    const eid = +m[1];
    if (method === "GET") {
      const { results: quartos } = await db.prepare("SELECT * FROM quartos WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
      const { results: alocacoes } = await db.prepare(`
          SELECT a.id, a.quarto_id, a.cliente_id, a.nome_livre, a.status,
                 COALESCE(c.nome, a.nome_livre) AS nome, c.tipo
          FROM alocacoes a
          JOIN quartos q ON q.id=a.quarto_id
          LEFT JOIN clientes c ON c.id=a.cliente_id
          WHERE q.evento_id=? ORDER BY a.id`).bind(eid).all();
      let nomes = [];
      if (verParticipantes || auth.tipo === "usuario" && pode("hospedagem.editar")) {
        const { results } = await db.prepare(
          "SELECT id, nome, grupo FROM clientes WHERE evento_id=? ORDER BY grupo, nome"
        ).bind(eid).all();
        nomes = results;
      }
      return json({ quartos, alocacoes, participantes: nomes });
    }
    if (method === "POST") {
      if (!admin) return negado();
      const b = await request.json().catch(() => ({}));
      const q = limparQuarto(b);
      if (!q.nome) return json({ erro: "informe o nome do quarto" }, 400);
      const r = await db.prepare(
        "INSERT INTO quartos (evento_id, ordem, nome, capacidade, diaria, adicional, observacoes) VALUES (?,?,?,?,?,?,?)"
      ).bind(eid, q.ordem ?? 999, q.nome, q.capacidade ?? 2, q.diaria ?? null, q.adicional ?? 0, q.observacoes ?? "").run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
  }
  if (m = path.match(/^\/api\/quartos\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "quartos", id, limparQuarto(b))) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM alocacoes WHERE quarto_id=?").bind(id).run();
      await db.prepare("DELETE FROM quartos WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/quartos\/(\d+)\/alocacoes$/)) && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const cid = I(b.cliente_id);
    const nome = S(b.nome_livre, 120).trim();
    if (!cid && !nome) return json({ erro: "informe o participante ou um nome" }, 400);
    const r = await db.prepare(
      "INSERT INTO alocacoes (quarto_id, cliente_id, nome_livre, status) VALUES (?,?,?,?)"
    ).bind(+m[1], cid || null, nome, S(b.status, 80)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/alocacoes\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const o = {};
      if ("status" in b) o.status = S(b.status, 80);
      if ("quarto_id" in b) o.quarto_id = I(b.quarto_id);
      if (!await upd(db, "alocacoes", id, o, ", atualizado_em=datetime('now')")) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM alocacoes WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/focos-do-dia" && method === "GET") {
    const { results } = await db.prepare("SELECT * FROM focos_do_dia ORDER BY ordem, id").all();
    return json({ focos: results });
  }
  if (path === "/api/focos-do-dia" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const f = limparFoco(b);
    if (!f.texto) return json({ erro: "escreva o foco" }, 400);
    let ordem = f.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM focos_do_dia").first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare("INSERT INTO focos_do_dia (texto, ordem, atualizado_por) VALUES (?,?,?)").bind(f.texto, ordem, S(b.atualizado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (path === "/api/focos-do-dia/reordenar" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++)
      await db.prepare("UPDATE focos_do_dia SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/focos-do-dia\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "focos_do_dia", id, limparFoco(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM focos_do_dia WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/tarefa-responsaveis" && method === "GET") {
    const { results } = await db.prepare("SELECT id, nome FROM tarefa_responsaveis ORDER BY ordem, id").all();
    return json({ responsaveis: results });
  }
  if (path === "/api/tarefa-responsaveis" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const nome = S(b.nome, 60).trim();
    if (!nome) return json({ erro: "escreva o nome" }, 400);
    const ja = await db.prepare("SELECT id, nome FROM tarefa_responsaveis WHERE nome=?").bind(nome).first();
    if (ja) return json({ ok: true, id: ja.id, nome: ja.nome });
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM tarefa_responsaveis").first();
    const r = await db.prepare("INSERT INTO tarefa_responsaveis (nome, ordem) VALUES (?,?)").bind(nome, (mx ? mx.mo : 0) + 1).run();
    return json({ ok: true, id: r.meta.last_row_id, nome });
  }
  if ((m = path.match(/^\/api\/tarefa-responsaveis\/(\d+)$/)) && method === "DELETE") {
    await db.prepare("DELETE FROM tarefa_responsaveis WHERE id=?").bind(+m[1]).run();
    return json({ ok: true });
  }
  if (path === "/api/tarefas" && method === "GET") {
    const { results } = await db.prepare(
      "SELECT * FROM tarefas ORDER BY CASE status WHEN 'concluido' THEN 1 ELSE 0 END, ordem, COALESCE(prioridade, 999), id"
    ).all();
    {
      const rs = await db.prepare("SELECT * FROM subtarefas ORDER BY ordem, id").all();
      const porTarefa = {};
      for (const s of rs.results || []) (porTarefa[s.tarefa_id] = porTarefa[s.tarefa_id] || []).push(s);
      for (const t of results) t.subtarefas = porTarefa[t.id] || [];
    }
    return json({ tarefas: results });
  }
  if (path === "/api/tarefas/reordenar" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.prepare("UPDATE tarefas SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    }
    return json({ ok: true });
  }
  if (path === "/api/tarefas" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const t = limparTarefa(b);
    if (!t.titulo) return json({ erro: "informe o t\xEDtulo da tarefa" }, 400);
    const r = await db.prepare(`
        INSERT INTO tarefas (titulo, setor, status, prioridade, data_limite, responsavel, ordem, horario, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
      t.titulo,
      t.setor ?? "",
      t.status ?? "afazer",
      t.prioridade ?? null,
      t.data_limite ?? "",
      t.responsavel ?? "",
      t.ordem ?? null,
      t.horario ?? "",
      t.observacoes ?? "",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/tarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const t = limparTarefa(b);
      if (!await upd(db, "tarefas", id, t, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      const tarefa = await db.prepare("SELECT * FROM tarefas WHERE id=?").bind(id).first();
      return tarefa ? json({ ok: true, tarefa }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM subtarefas WHERE tarefa_id=?").bind(id).run();
      await db.prepare("DELETE FROM tarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (m = path.match(/^\/api\/tarefas\/(\d+)\/subtarefas$/)) {
    const tid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare("SELECT * FROM subtarefas WHERE tarefa_id=? ORDER BY ordem, id").bind(tid).all();
      return json({ subtarefas: results });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const c = limparSubitem(b);
      if (!c.titulo) return json({ erro: "t\xEDtulo obrigat\xF3rio" }, 400);
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subtarefas WHERE tarefa_id=?").bind(tid).first();
      const r = await db.prepare("INSERT INTO subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,?)").bind(tid, (mx ? mx.mo : 0) + 1, c.titulo, c.concluido ?? 0).run();
      const sub = await db.prepare("SELECT * FROM subtarefas WHERE id=?").bind(r.meta.last_row_id).first();
      return json({ ok: true, subtarefa: sub });
    }
  }
  if (path === "/api/subtarefas/reordenar" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.prepare("UPDATE subtarefas SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    }
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/subtarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparSubitem(b);
      if (!await upd(db, "subtarefas", id, c)) return json({ erro: "nada para atualizar" }, 400);
      const sub = await db.prepare("SELECT * FROM subtarefas WHERE id=?").bind(id).first();
      return sub ? json({ ok: true, subtarefa: sub }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM subtarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/crm" && method === "GET") {
    if (!admin) return negado();
    const { results } = await db.prepare(`
        SELECT c.*, COUNT(i.id) AS interacoes,
               MAX(i.criado_em) AS ultima_interacao,
               (SELECT COUNT(*) FROM clientes cl WHERE cl.contato_id=c.id) AS participacoes
        FROM crm_contatos c LEFT JOIN crm_interacoes i ON i.contato_id=c.id
        GROUP BY c.id ORDER BY c.nome COLLATE NOCASE`).all();
    return json({ contatos: results });
  }
  if (path === "/api/crm" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const c = limparContato(b);
    if (!c.nome) return json({ erro: "informe o nome do contato" }, 400);
    const r = await db.prepare(`
        INSERT INTO crm_contatos (nome, grupo, telefone, cpf, camiseta, cidade, origem, etapa, interesse,
                                  valor_potencial, proxima_acao, proxima_data, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      c.nome,
      c.grupo ?? "",
      c.telefone ?? "",
      c.cpf ?? "",
      c.camiseta ?? "",
      c.cidade ?? "",
      c.origem ?? "",
      c.etapa ?? "lead",
      c.interesse ?? "",
      c.valor_potencial ?? null,
      c.proxima_acao ?? "",
      c.proxima_data ?? "",
      c.observacoes ?? "",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/crm\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "GET") {
      const contato = await db.prepare("SELECT * FROM crm_contatos WHERE id=?").bind(id).first();
      if (!contato) return json({ erro: "n\xE3o encontrado" }, 404);
      const { results } = await db.prepare("SELECT * FROM crm_interacoes WHERE contato_id=? ORDER BY id DESC").bind(id).all();
      const { results: participacoes } = await db.prepare(`
          SELECT cl.id AS cliente_id, cl.evento_id, e.nome AS evento, e.arquivado,
                 cl.grupo, cl.camiseta, cl.utv, cl.pacote,
                 COALESCE(SUM(p.valor),0) AS pago
          FROM clientes cl JOIN eventos e ON e.id=cl.evento_id
          LEFT JOIN pagamentos p ON p.cliente_id=cl.id
          WHERE cl.contato_id=? GROUP BY cl.id ORDER BY cl.evento_id DESC`).bind(id).all();
      return json({ contato, interacoes: results, participacoes });
    }
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparContato(b);
      if (!await upd(db, "crm_contatos", id, c, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM crm_interacoes WHERE contato_id=?").bind(id).run();
      await db.prepare("UPDATE clientes SET contato_id=NULL WHERE contato_id=?").bind(id).run();
      await db.prepare("DELETE FROM crm_contatos WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/crm\/(\d+)\/interacoes$/)) && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const resumo = S(b.resumo, 600).trim();
    if (!resumo) return json({ erro: "descreva a intera\xE7\xE3o" }, 400);
    const r = await db.prepare(
      "INSERT INTO crm_interacoes (contato_id, data, canal, resumo, criado_por) VALUES (?,?,?,?,?)"
    ).bind(+m[1], S(b.data, 20), S(b.canal, 60), resumo, S(b.criado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/crm-interacoes\/(\d+)$/)) && method === "DELETE") {
    if (!admin) return negado();
    await db.prepare("DELETE FROM crm_interacoes WHERE id=?").bind(+m[1]).run();
    return json({ ok: true });
  }
  if (path === "/api/fornecedores" && method === "GET") {
    if (!admin) return negado();
    const { results } = await db.prepare(`
        SELECT f.*,
               (SELECT COUNT(*) FROM custos c WHERE c.fornecedor_id=f.id) AS itens,
               (SELECT COALESCE(SUM(c.valor),0) FROM custos c WHERE c.fornecedor_id=f.id) AS total
        FROM fornecedores f ORDER BY f.nome COLLATE NOCASE`).all();
    return json({ fornecedores: results });
  }
  if (path === "/api/fornecedores" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const f = limparFornecedor(b);
    if (!f.nome) return json({ erro: "informe o nome do fornecedor" }, 400);
    const r = await db.prepare(`
        INSERT INTO fornecedores (nome, categoria, contato, telefone, cidade, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?)`).bind(
      f.nome,
      f.categoria ?? "",
      f.contato ?? "",
      f.telefone ?? "",
      f.cidade ?? "",
      f.observacoes ?? "",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/fornecedores\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "fornecedores", id, limparFornecedor(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("UPDATE custos SET fornecedor_id=NULL WHERE fornecedor_id=?").bind(id).run();
      await db.prepare("UPDATE pagamentos_terceiros SET fornecedor_id=NULL WHERE fornecedor_id=?").bind(id).run();
      await db.prepare("UPDATE campo_tarefas SET fornecedor_id=NULL WHERE fornecedor_id=?").bind(id).run();
      await db.prepare("DELETE FROM fornecedores WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/custos\/importar$/)) && method === "POST") {
    if (!admin) return negado();
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const cenId = I(b.cenario_id);
    const cen = await db.prepare("SELECT * FROM cenarios WHERE id=? AND evento_id=?").bind(cenId, eid).first();
    if (!cen) return json({ erro: "cen\xE1rio n\xE3o encontrado neste evento" }, 404);
    const { results: linhas } = await db.prepare(`
        SELECT l.*, cc.nome AS centro_nome FROM cenario_linhas l
        LEFT JOIN centros_custo cc ON cc.id=l.categoria_id
        WHERE l.cenario_id=? ORDER BY l.ordem, l.id`).bind(cenId).all();
    const mult = { nenhum: 1, diarias: cen.diarias, dias_trilha: cen.dias_trilha, refeicoes: cen.refeicoes, eventos: cen.eventos_qtd };
    const pessoas = cen.pessoas || 1;
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM custos WHERE evento_id=?").bind(eid).first();
    let ord = mx ? mx.mo : 0;
    let n = 0;
    for (const l of linhas) {
      const f = mult[l.mult] || 1;
      const total = l.tipo === "fixo" ? l.preco * f : l.media * l.preco * f * pessoas;
      const qtd = l.tipo === "fixo" ? 1 : l.media * f * pessoas;
      ord++;
      await db.prepare(
        "INSERT INTO custos (evento_id, ordem, item, categoria, quantidade, valor, status) VALUES (?,?,?,?,?,?, 'pendente')"
      ).bind(eid, ord, l.item, l.centro_nome || "", qtd, total).run();
      n++;
    }
    return json({ ok: true, n });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/custos\/reordenar$/)) && method === "POST") {
    if (!admin) return negado();
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.prepare("UPDATE custos SET ordem=? WHERE id=? AND evento_id=?").bind(i + 1, I(ids[i]), eid).run();
    }
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/custos$/)) {
    if (!admin) return negado();
    const eid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare(`
          SELECT c.*, f.nome AS fornecedor_nome
          FROM custos c LEFT JOIN fornecedores f ON f.id=c.fornecedor_id
          WHERE c.evento_id=? ORDER BY c.ordem, c.id`).bind(eid).all();
      const { results: staff } = await db.prepare(
        "SELECT id, nome, grupo, pacote FROM clientes WHERE evento_id=? AND staff=1 ORDER BY nome COLLATE NOCASE"
      ).bind(eid).all();
      return json({ custos: results, staff });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const c = limparCusto(b);
      if (!c.item) return json({ erro: "informe o item de custo" }, 400);
      let ordem = c.ordem;
      if (ordem == null) {
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM custos WHERE evento_id=?").bind(eid).first();
        ordem = (mx ? mx.mo : 0) + 1;
      }
      const r = await db.prepare(`
          INSERT INTO custos (evento_id, ordem, item, categoria, quantidade, valor, fornecedor_id, status,
                              forma_pagamento, parcelas, valor_pago, vencimento, data_pagamento, observacoes, atualizado_por)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        eid,
        ordem,
        c.item,
        c.categoria ?? "",
        c.quantidade ?? 1,
        c.valor ?? null,
        c.fornecedor_id ?? null,
        c.status ?? "pendente",
        c.forma_pagamento ?? "",
        c.parcelas ?? null,
        c.valor_pago ?? 0,
        c.vencimento ?? "",
        c.data_pagamento ?? "",
        c.observacoes ?? "",
        S(b.atualizado_por, 60)
      ).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
  }
  if (m = path.match(/^\/api\/custos\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "custos", id, limparCusto(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM custos WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/financeiro\/receber\/reordenar$/)) && method === "POST") {
    if (!admin) return negado();
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++) {
      await db.prepare("UPDATE financeiro_receber SET ordem=? WHERE id=? AND evento_id=?").bind(i + 1, I(ids[i]), eid).run();
    }
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/financeiro\/receber$/)) {
    if (!admin) return negado();
    const eid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare(`
          SELECT f.id, f.evento_id, f.ordem, f.cliente, f.cliente_id, f.forma_pagamento, f.observacoes,
                 f.atualizado_em, f.atualizado_por, cl.papel AS papel, cl.grupo AS grupo,
                 COALESCE((SELECT SUM(valor_previsto) FROM financeiro_parcelas WHERE receber_id=f.id),0) AS valor_previsto,
                 COALESCE((SELECT SUM(valor_recebido) FROM financeiro_parcelas WHERE receber_id=f.id AND valor_recebido IS NOT NULL),0) AS valor_recebido,
                 (SELECT MIN(vencimento) FROM financeiro_parcelas WHERE receber_id=f.id AND valor_recebido IS NULL AND vencimento<>'') AS proximo_vencimento
          FROM financeiro_receber f LEFT JOIN clientes cl ON cl.id = f.cliente_id
          WHERE f.evento_id=? AND COALESCE(cl.desistente,0)=0 ORDER BY f.ordem, f.id`).bind(eid).all();
      for (const r of results) r.status = statusPorPago(r.valor_previsto, r.valor_recebido, null);
      const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const resumo = await db.prepare(`
          SELECT COALESCE(SUM(p.valor_previsto),0) AS previsto,
                 COALESCE(SUM(CASE WHEN p.valor_recebido IS NOT NULL THEN p.valor_recebido ELSE 0 END),0) AS recebido,
                 COALESCE(SUM(CASE WHEN p.valor_recebido IS NULL AND p.vencimento<>'' AND p.vencimento < ? THEN p.valor_previsto ELSE 0 END),0) AS vencido,
                 COALESCE(SUM(CASE WHEN p.valor_recebido IS NULL AND (p.vencimento='' OR p.vencimento >= ?) THEN p.valor_previsto ELSE 0 END),0) AS a_vencer
          FROM financeiro_parcelas p JOIN financeiro_receber f ON f.id=p.receber_id
          LEFT JOIN clientes cl ON cl.id=f.cliente_id
          WHERE f.evento_id=? AND COALESCE(cl.desistente,0)=0`).bind(hoje, hoje, eid).first();
      return json({ receber: results, resumo });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const r0 = limparRecebivel(b);
      if (!r0.cliente) return json({ erro: "informe o cliente" }, 400);
      let ordem = r0.ordem;
      if (ordem == null) {
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM financeiro_receber WHERE evento_id=?").bind(eid).first();
        ordem = (mx ? mx.mo : 0) + 1;
      }
      const r = await db.prepare(`
          INSERT INTO financeiro_receber (evento_id, ordem, cliente, forma_pagamento, observacoes, atualizado_por)
          VALUES (?,?,?,?,?,?)`).bind(
        eid,
        ordem,
        r0.cliente,
        r0.forma_pagamento ?? "",
        r0.observacoes ?? "",
        S(b.atualizado_por, 60)
      ).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
  }
  if (m = path.match(/^\/api\/financeiro-receber\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "GET") {
      const receber = await db.prepare(`
          SELECT f.*, cl.papel AS papel, cl.grupo AS grupo FROM financeiro_receber f
          LEFT JOIN clientes cl ON cl.id = f.cliente_id WHERE f.id=?`).bind(id).first();
      if (!receber) return json({ erro: "n\xE3o encontrado" }, 404);
      const { results: parcelas } = await db.prepare(
        "SELECT * FROM financeiro_parcelas WHERE receber_id=? ORDER BY id"
      ).bind(id).all();
      return json({ receber, parcelas });
    }
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "financeiro_receber", id, limparRecebivel(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM financeiro_parcelas WHERE receber_id=?").bind(id).run();
      await db.prepare("DELETE FROM financeiro_receber WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/financeiro-receber\/(\d+)\/parcelas$/)) && method === "POST") {
    if (!admin) return negado();
    const receberId = +m[1];
    const b = await request.json().catch(() => ({}));
    const p0 = limparParcela(b);
    if (!("descricao" in p0)) {
      const n = await db.prepare("SELECT COUNT(*) AS n FROM financeiro_parcelas WHERE receber_id=?").bind(receberId).first();
      p0.descricao = "Parcela " + ((n ? n.n : 0) + 1);
    }
    const r = await db.prepare(`
        INSERT INTO financeiro_parcelas (receber_id, descricao, vencimento, valor_previsto, valor_recebido, data_recebimento, forma_pagamento, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(
      receberId,
      p0.descricao,
      p0.vencimento ?? "",
      p0.valor_previsto ?? 0,
      p0.valor_recebido ?? null,
      p0.data_recebimento ?? "",
      p0.forma_pagamento ?? "",
      p0.observacoes ?? "",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/parcelas\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "financeiro_parcelas", id, limparParcela(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM financeiro_parcelas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/pagamentos-terceiros$/)) {
    if (!admin) return negado();
    const eid = +m[1];
    if (method === "GET") {
      const { results } = await db.prepare(
        "SELECT * FROM pagamentos_terceiros WHERE evento_id=? ORDER BY ordem, id"
      ).bind(eid).all();
      return json({ terceiros: results });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      const t0 = limparPagamentoTerceiro(b);
      if (t0.cliente_id != null) {
        const cl = await db.prepare("SELECT nome FROM clientes WHERE id=? AND evento_id=?").bind(t0.cliente_id, eid).first();
        t0.cliente_nome = cl ? cl.nome : "";
      } else if (!("cliente_nome" in t0)) {
        t0.cliente_nome = "";
      }
      if (!t0.descricao) t0.descricao = "Repasse a terceiro";
      let ordem = t0.ordem;
      if (ordem == null) {
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM pagamentos_terceiros WHERE evento_id=?").bind(eid).first();
        ordem = (mx ? mx.mo : 0) + 1;
      }
      const r = await db.prepare(`
          INSERT INTO pagamentos_terceiros (evento_id, ordem, descricao, cliente_id, cliente_nome, fornecedor_id, valor, pago, data_pagamento, observacoes, atualizado_por)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(
        eid,
        ordem,
        t0.descricao,
        t0.cliente_id ?? null,
        t0.cliente_nome ?? "",
        t0.fornecedor_id ?? null,
        t0.valor ?? null,
        t0.pago ?? 0,
        t0.data_pagamento ?? "",
        t0.observacoes ?? "",
        S(b.atualizado_por, 60)
      ).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
  }
  if (m = path.match(/^\/api\/pagamentos-terceiros\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const t0 = limparPagamentoTerceiro(b);
      if ("cliente_id" in t0) {
        if (t0.cliente_id != null) {
          const cl = await db.prepare("SELECT nome FROM clientes WHERE id=?").bind(t0.cliente_id).first();
          t0.cliente_nome = cl ? cl.nome : "";
        } else if (!("cliente_nome" in t0)) {
          t0.cliente_nome = "";
        }
      }
      if (!Object.keys(t0).length) return json({ erro: "nada para atualizar" }, 400);
      if (!await upd(db, "pagamentos_terceiros", id, t0, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM pagamentos_terceiros WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/etapas" && method === "GET") {
    const { results } = await db.prepare("SELECT * FROM etapas ORDER BY ordem, id").all();
    return json({ etapas: results });
  }
  if (path === "/api/etapas" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const e = limparEtapa(b);
    if (!e.nome) return json({ erro: "informe o nome da etapa" }, 400);
    let ordem = e.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM etapas").first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(
      "INSERT INTO etapas (nome, ordem, ativo, redireciona_campo, atualizado_por) VALUES (?,?,?,?,?)"
    ).bind(e.nome, ordem, e.ativo ?? 1, e.redireciona_campo ?? 0, S(b.atualizado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (path === "/api/etapas/reordenar" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++)
      await db.prepare("UPDATE etapas SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/etapas\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "etapas", id, limparEtapa(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("UPDATE op_itens SET etapa_id=NULL WHERE etapa_id=?").bind(id).run();
      await db.prepare("DELETE FROM etapas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/categorias" && method === "GET") {
    const { results } = await db.prepare("SELECT * FROM categorias ORDER BY ordem, id").all();
    return json({ categorias: results });
  }
  if (path === "/api/categorias" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const c = limparCategoria(b);
    if (!c.nome) return json({ erro: "informe o nome da categoria" }, 400);
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM categorias").first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(
      "INSERT INTO categorias (nome, ordem, ativo, atualizado_por) VALUES (?,?,?,?)"
    ).bind(c.nome, ordem, c.ativo ?? 1, S(b.atualizado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (path === "/api/categorias/reordenar" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++)
      await db.prepare("UPDATE categorias SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/categorias\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "categorias", id, limparCategoria(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("UPDATE op_itens SET categoria_id=NULL WHERE categoria_id=?").bind(id).run();
      await db.prepare("DELETE FROM categorias WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/centros-custo" && method === "GET") {
    const { results } = await db.prepare("SELECT * FROM centros_custo ORDER BY ordem, id").all();
    return json({ centros_custo: results });
  }
  if (path === "/api/centros-custo" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const c = limparCentroCusto(b);
    if (!c.nome) return json({ erro: "informe o nome do centro de custo" }, 400);
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM centros_custo").first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(
      "INSERT INTO centros_custo (nome, ordem, ativo, lista_compras, atualizado_por) VALUES (?,?,?,?,?)"
    ).bind(c.nome, ordem, c.ativo ?? 1, c.lista_compras ?? 0, S(b.atualizado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (path === "/api/centros-custo/reordenar" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    const ids = Array.isArray(b.ids) ? b.ids : [];
    for (let i = 0; i < ids.length; i++)
      await db.prepare("UPDATE centros_custo SET ordem=? WHERE id=?").bind(i + 1, I(ids[i])).run();
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/centros-custo\/(\d+)$/)) {
    if (!admin) return negado();
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "centros_custo", id, limparCentroCusto(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("UPDATE cenario_linhas SET categoria_id=NULL WHERE categoria_id=?").bind(id).run();
      await db.prepare("DELETE FROM centros_custo WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if (path === "/api/prazos-padrao" && method === "GET") {
    return json({ etapas: await montarPainelPrazos(db, null, url.searchParams.get("data_evento") || "") });
  }
  if (path === "/api/prazos-padrao" && method === "POST") {
    if (!admin) return negado();
    const b = await request.json().catch(() => ({}));
    await salvarLinhasPrazo(db, "prazos_padrao", null, b.linhas, S(b.atualizado_por, 60));
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/eventos\/(\d+)\/prazos$/)) {
    const eid = +m[1];
    if (method === "GET") {
      const ev = await db.prepare("SELECT data_evento FROM eventos WHERE id=?").bind(eid).first();
      if (!ev) return json({ erro: "evento n\xE3o encontrado" }, 404);
      return json({ data_evento: ev.data_evento || "", etapas: await montarPainelPrazos(db, eid) });
    }
    if (method === "POST") {
      const b = await request.json().catch(() => ({}));
      await salvarLinhasPrazo(db, "prazos_evento", eid, b.linhas, S(b.atualizado_por, 60));
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/responsaveis$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    await salvarLinhasResp(db, eid, b.linhas, S(b.atualizado_por, 60));
    return json({ ok: true });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/prazos\/aplicar$/)) && method === "POST") {
    const eid = +m[1];
    const ev = await db.prepare("SELECT data_evento FROM eventos WHERE id=?").bind(eid).first();
    if (!ev) return json({ erro: "evento n\xE3o encontrado" }, 404);
    if (!ev.data_evento) return json({ erro: "defina a data do evento antes de aplicar os prazos" }, 400);
    const r = await aplicarPrazosEvento(db, eid);
    return json({ ok: true, itens: r.itens, tarefas: r.tarefas, responsaveis: r.responsaveis });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/op$/)) && method === "GET") {
    const eid = +m[1];
    const { results: itens } = await db.prepare(
      "SELECT * FROM op_itens WHERE evento_id=? ORDER BY ordem, id"
    ).bind(eid).all();
    const { results: tarefas } = await db.prepare(
      "SELECT t.* FROM op_tarefas t JOIN op_itens i ON i.id=t.item_id WHERE i.evento_id=? ORDER BY t.ordem, t.id"
    ).bind(eid).all();
    const { results: subtarefas } = await db.prepare(
      "SELECT s.* FROM op_subtarefas s JOIN op_tarefas t ON t.id=s.tarefa_id JOIN op_itens i ON i.id=t.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id"
    ).bind(eid).all();
    const sp = {};
    for (const s of subtarefas) (sp[s.tarefa_id] = sp[s.tarefa_id] || []).push(s);
    const tp = {};
    for (const t of tarefas) {
      t.subtarefas = sp[t.id] || [];
      (tp[t.item_id] = tp[t.item_id] || []).push(t);
    }
    for (const it of itens) it.tarefas = tp[it.id] || [];
    return json({ itens });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/op\/itens$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = await limparOpItem(db, b);
    if (!c.nome) return json({ erro: "informe o nome do t\xF3pico" }, 400);
    if (!c.data_limite && c.etapa_id != null) {
      const pr = await resolverPrazoTopico(db, eid, c.etapa_id, c.categoria_id || 0, c.nome);
      if (pr.data_topico) c.data_limite = pr.data_topico;
    }
    let responsavelAuto = 0;
    if (!c.responsavel && c.etapa_id != null) {
      const rr = await resolverResponsavelTopico(db, eid, c.etapa_id, c.categoria_id || 0, c.nome);
      if (rr) {
        c.responsavel = rr;
        responsavelAuto = 1;
      }
    }
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_itens WHERE evento_id=?").bind(eid).first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(`
        INSERT INTO op_itens (evento_id, etapa, categoria, etapa_id, categoria_id, nome, ordem, homologado,
                               responsavel, responsavel_auto, status, data_limite, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      eid,
      c.etapa ?? "",
      c.categoria ?? "",
      c.etapa_id ?? null,
      c.categoria_id ?? null,
      c.nome,
      ordem,
      c.homologado ?? 0,
      c.responsavel ?? "",
      responsavelAuto,
      c.status ?? "afazer",
      c.data_limite ?? "",
      c.observacoes ?? "",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/op\/reordenar$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(I).filter((x) => x != null);
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const { results } = await db.prepare(
        `SELECT ordem FROM op_itens WHERE evento_id=? AND id IN (${ph})`
      ).bind(eid, ...ids).all();
      const slots = results.map((r) => r.ordem).sort((a, b2) => (a || 0) - (b2 || 0));
      for (let i = 0; i < ids.length; i++)
        await db.prepare("UPDATE op_itens SET ordem=? WHERE id=? AND evento_id=?").bind(slots[i], ids[i], eid).run();
    }
    return json({ ok: true });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/op\/categorias\/(\d+)$/)) && method === "DELETE") {
    const eid = +m[1], catId = +m[2];
    const sub = "SELECT id FROM op_itens WHERE evento_id=? AND categoria_id=?";
    await db.prepare(`DELETE FROM op_subtarefas WHERE tarefa_id IN (SELECT id FROM op_tarefas WHERE item_id IN (${sub}))`).bind(eid, catId).run();
    await db.prepare(`DELETE FROM historico WHERE parent_tipo='op_tarefa' AND parent_id IN (SELECT id FROM op_tarefas WHERE item_id IN (${sub}))`).bind(eid, catId).run();
    await excluirAnexosDeVarios(db, env, "op_tarefa", `SELECT id FROM op_tarefas WHERE item_id IN (${sub})`, [eid, catId]);
    await db.prepare(`DELETE FROM op_tarefas WHERE item_id IN (${sub})`).bind(eid, catId).run();
    await db.prepare(`DELETE FROM historico WHERE parent_tipo='op_item' AND parent_id IN (${sub})`).bind(eid, catId).run();
    await excluirAnexosDeVarios(db, env, "op_item", sub, [eid, catId]);
    const r = await db.prepare("DELETE FROM op_itens WHERE evento_id=? AND categoria_id=?").bind(eid, catId).run();
    return json({ ok: true, removidos: r.meta.changes });
  }
  if (m = path.match(/^\/api\/op-itens\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "op_itens", id, await limparOpItem(db, b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM op_subtarefas WHERE tarefa_id IN (SELECT id FROM op_tarefas WHERE item_id=?)").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='op_tarefa' AND parent_id IN (SELECT id FROM op_tarefas WHERE item_id=?)").bind(id).run();
      await excluirAnexosDeVarios(db, env, "op_tarefa", "SELECT id FROM op_tarefas WHERE item_id=?", [id]);
      await db.prepare("DELETE FROM op_tarefas WHERE item_id=?").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='op_item' AND parent_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "op_item", id);
      await db.prepare("DELETE FROM op_itens WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/op-itens\/(\d+)\/tarefas$/)) && method === "POST") {
    const iid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparOpTarefa(b);
    if (!c.titulo) return json({ erro: "t\xEDtulo obrigat\xF3rio" }, 400);
    let responsavelAuto = 0;
    if (!c.data_limite || !c.responsavel) {
      const item = await db.prepare("SELECT evento_id, etapa_id, categoria_id, nome FROM op_itens WHERE id=?").bind(iid).first();
      if (item && item.etapa_id != null) {
        if (!c.data_limite) {
          const pr = await resolverPrazoTopico(db, item.evento_id, item.etapa_id, item.categoria_id || 0, item.nome);
          if (pr.data_tarefas) c.data_limite = pr.data_tarefas;
        }
        if (!c.responsavel) {
          const rr = await resolverResponsavelTopico(db, item.evento_id, item.etapa_id, item.categoria_id || 0, item.nome);
          if (rr) {
            c.responsavel = rr;
            responsavelAuto = 1;
          }
        }
      }
    }
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_tarefas WHERE item_id=?").bind(iid).first();
    const r = await db.prepare(`
        INSERT INTO op_tarefas (item_id, ordem, titulo, concluido, status, responsavel, responsavel_auto, data_limite, observacoes)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(
      iid,
      (mx ? mx.mo : 0) + 1,
      c.titulo,
      c.concluido ?? 0,
      c.status ?? "afazer",
      c.responsavel ?? "",
      responsavelAuto,
      c.data_limite ?? "",
      c.observacoes ?? ""
    ).run();
    const tarefa = await db.prepare("SELECT * FROM op_tarefas WHERE id=?").bind(r.meta.last_row_id).first();
    await recomputeItemStatus2(db, iid);
    return json({ ok: true, tarefa });
  }
  if (m = path.match(/^\/api\/op-tarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparOpTarefa(b);
      if (!await upd(db, "op_tarefas", id, c)) return json({ erro: "nada para atualizar" }, 400);
      const tarefa = await db.prepare("SELECT * FROM op_tarefas WHERE id=?").bind(id).first();
      if (tarefa && "status" in c) await recomputeItemStatus2(db, tarefa.item_id);
      return tarefa ? json({ ok: true, tarefa }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      const tarefa = await db.prepare("SELECT item_id FROM op_tarefas WHERE id=?").bind(id).first();
      await db.prepare("DELETE FROM op_subtarefas WHERE tarefa_id=?").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='op_tarefa' AND parent_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "op_tarefa", id);
      await db.prepare("DELETE FROM op_tarefas WHERE id=?").bind(id).run();
      if (tarefa) await recomputeItemStatus2(db, tarefa.item_id);
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/op-tarefas\/(\d+)\/subtarefas$/)) && method === "POST") {
    const tid = +m[1];
    const b = await request.json().catch(() => ({}));
    const titulo = S(b.titulo, 200);
    if (!titulo) return json({ erro: "informe o t\xEDtulo" }, 400);
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_subtarefas WHERE tarefa_id=?").bind(tid).first();
    const r = await db.prepare("INSERT INTO op_subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,?)").bind(tid, (mx ? mx.mo : 0) + 1, titulo, B(b.concluido)).run();
    const sub = await db.prepare("SELECT * FROM op_subtarefas WHERE id=?").bind(r.meta.last_row_id).first();
    return json({ ok: true, subtarefa: sub });
  }
  if (m = path.match(/^\/api\/op-subtarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "op_subtarefas", id, limparSubitem(b))) return json({ erro: "nada para atualizar" }, 400);
      const sub = await db.prepare("SELECT * FROM op_subtarefas WHERE id=?").bind(id).first();
      return sub ? json({ ok: true, subtarefa: sub }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM op_subtarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/campo$/)) && method === "GET") {
    const eid = +m[1];
    const { results: dias } = await db.prepare("SELECT * FROM campo_dias WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
    const { results: tarefas } = await db.prepare(`
        SELECT t.*, f.nome AS forn_nome, f.categoria AS forn_categoria, f.contato AS forn_contato, f.telefone AS forn_telefone
        FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id LEFT JOIN fornecedores f ON f.id=t.fornecedor_id
        WHERE d.evento_id=? ORDER BY t.ordem, t.id`).bind(eid).all();
    const { results: subs } = await db.prepare(
      "SELECT s.* FROM campo_subtarefas s JOIN campo_tarefas t ON t.id=s.tarefa_id JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY s.ordem, s.id"
    ).bind(eid).all();
    const sp = {};
    for (const s of subs) (sp[s.tarefa_id] = sp[s.tarefa_id] || []).push(s);
    const tp = {};
    for (const t of tarefas) {
      t.subs = sp[t.id] || [];
      (tp[t.dia_id] = tp[t.dia_id] || []).push(t);
    }
    for (const d of dias) d.tarefas = tp[d.id] || [];
    return json({ dias });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/campo\/dias$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparCampoDia(b);
    if (!c.rotulo) return json({ erro: "informe o r\xF3tulo do dia" }, 400);
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM campo_dias WHERE evento_id=?").bind(eid).first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare("INSERT INTO campo_dias (evento_id, rotulo, data, ordem) VALUES (?,?,?,?)").bind(eid, c.rotulo, c.data ?? "", ordem).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/campo-dias\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "campo_dias", id, limparCampoDia(b))) return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM campo_subtarefas WHERE tarefa_id IN (SELECT id FROM campo_tarefas WHERE dia_id=?)").bind(id).run();
      await db.prepare("DELETE FROM campo_tarefas WHERE dia_id=?").bind(id).run();
      await db.prepare("DELETE FROM campo_dias WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/campo-dias\/(\d+)\/tarefas$/)) && method === "POST") {
    const did = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparCampoTarefa(b);
    if (!c.nome) return json({ erro: "informe o nome da tarefa" }, 400);
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM campo_tarefas WHERE dia_id=?").bind(did).first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(`
        INSERT INTO campo_tarefas (dia_id, nome, h_planejado, h_realizado, responsavel, tipo, status, data_limite, ordem, observacoes, fornecedor_id, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      did,
      c.nome,
      c.h_planejado ?? "",
      c.h_realizado ?? "",
      c.responsavel ?? "",
      c.tipo ?? "ajustavel",
      c.status ?? "afazer",
      c.data_limite ?? "",
      ordem,
      c.observacoes ?? "",
      c.fornecedor_id ?? null,
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if (m = path.match(/^\/api\/campo-tarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "campo_tarefas", id, limparCampoTarefa(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      const tarefa = await db.prepare("SELECT * FROM campo_tarefas WHERE id=?").bind(id).first();
      return tarefa ? json({ ok: true, tarefa }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM campo_subtarefas WHERE tarefa_id=?").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='campo_tarefa' AND parent_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "campo_tarefa", id);
      await db.prepare("DELETE FROM campo_tarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/campo-tarefas\/(\d+)\/reajustar$/)) && method === "POST") {
    const id = +m[1];
    const b = await request.json().catch(() => ({}));
    const t = await db.prepare(
      "SELECT t.*, d.evento_id AS eid FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE t.id=?"
    ).bind(id).first();
    if (!t) return json({ erro: "tarefa n\xE3o encontrada" }, 404);
    const hr = S(b.h_realizado, 20);
    await db.prepare(
      "UPDATE campo_tarefas SET h_realizado=?, status='concluido', atualizado_em=datetime('now'), atualizado_por=? WHERE id=?"
    ).bind(hr, S(b.atualizado_por, 60), id).run();
    let reajustadas = 0;
    const pm = hhmmMin2(t.h_planejado), rm = hhmmMin2(hr);
    if (b.aplicar && pm != null && rm != null && rm !== pm) {
      const delta = rm - pm;
      const { results } = await db.prepare(
        "SELECT t.id, t.tipo, t.h_planejado FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY d.ordem, t.ordem, t.id"
      ).bind(t.eid).all();
      let passou = false;
      for (const r of results) {
        if (r.id === id) {
          passou = true;
          continue;
        }
        if (!passou || r.tipo !== "ajustavel") continue;
        const bm = hhmmMin2(r.h_planejado);
        if (bm == null) continue;
        await db.prepare("UPDATE campo_tarefas SET h_planejado=?, atualizado_em=datetime('now') WHERE id=?").bind(minHhmm2(bm + delta), r.id).run();
        reajustadas++;
      }
    }
    return json({ ok: true, reajustadas });
  }
  if ((m = path.match(/^\/api\/campo-tarefas\/(\d+)\/subtarefas$/)) && method === "POST") {
    const tid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparSubitem(b);
    if (!c.titulo) return json({ erro: "t\xEDtulo obrigat\xF3rio" }, 400);
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM campo_subtarefas WHERE tarefa_id=?").bind(tid).first();
    const r = await db.prepare("INSERT INTO campo_subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,?)").bind(tid, (mx ? mx.mo : 0) + 1, c.titulo, c.concluido ?? 0).run();
    const sub = await db.prepare("SELECT * FROM campo_subtarefas WHERE id=?").bind(r.meta.last_row_id).first();
    return json({ ok: true, subtarefa: sub });
  }
  if (m = path.match(/^\/api\/campo-subtarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "campo_subtarefas", id, limparSubitem(b))) return json({ erro: "nada para atualizar" }, 400);
      const sub = await db.prepare("SELECT * FROM campo_subtarefas WHERE id=?").bind(id).first();
      return sub ? json({ ok: true, subtarefa: sub }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM campo_subtarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/programacao$/)) && method === "GET") {
    const eid = +m[1];
    const { results: acontecimentos } = await db.prepare(
      "SELECT * FROM prog_acontecimentos WHERE evento_id=? ORDER BY data, ordem, id"
    ).bind(eid).all();
    const { results: tarefas } = await db.prepare(`
        SELECT t.*, f.nome AS forn_nome, f.categoria AS forn_categoria, f.contato AS forn_contato, f.telefone AS forn_telefone
        FROM prog_tarefas t JOIN prog_acontecimentos a ON a.id=t.acontecimento_id LEFT JOIN fornecedores f ON f.id=t.fornecedor_id
        WHERE a.evento_id=? ORDER BY t.ordem, t.id`).bind(eid).all();
    const { results: subtarefas } = await db.prepare(
      "SELECT s.* FROM prog_subtarefas s JOIN prog_tarefas t ON t.id=s.tarefa_id JOIN prog_acontecimentos a ON a.id=t.acontecimento_id WHERE a.evento_id=? ORDER BY s.ordem, s.id"
    ).bind(eid).all();
    const sp = {};
    for (const s of subtarefas) (sp[s.tarefa_id] = sp[s.tarefa_id] || []).push(s);
    const tp = {};
    for (const t of tarefas) {
      t.subtarefas = sp[t.id] || [];
      (tp[t.acontecimento_id] = tp[t.acontecimento_id] || []).push(t);
    }
    for (const a of acontecimentos) a.tarefas = tp[a.id] || [];
    return json({ acontecimentos });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/programacao\/acontecimentos$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparProgAcontecimento(b);
    if (!c.nome) return json({ erro: "informe o nome do acontecimento" }, 400);
    if (!c.data) return json({ erro: "informe a data" }, 400);
    let ordem = c.ordem;
    if (ordem == null) {
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM prog_acontecimentos WHERE evento_id=?").bind(eid).first();
      ordem = (mx ? mx.mo : 0) + 1;
    }
    const r = await db.prepare(`
        INSERT INTO prog_acontecimentos (evento_id, data, nome, categoria, ordem, status, atualizado_por)
        VALUES (?,?,?,?,?,?,?)`).bind(
      eid,
      c.data,
      c.nome,
      c.categoria ?? "",
      ordem,
      "afazer",
      S(b.atualizado_por, 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/programacao\/reordenar$/)) && method === "POST") {
    const eid = +m[1];
    const b = await request.json().catch(() => ({}));
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(I).filter((x) => x != null);
    if (ids.length) {
      const ph = ids.map(() => "?").join(",");
      const { results } = await db.prepare(
        `SELECT ordem FROM prog_acontecimentos WHERE evento_id=? AND id IN (${ph})`
      ).bind(eid, ...ids).all();
      const slots = results.map((r) => r.ordem).sort((a, b2) => (a || 0) - (b2 || 0));
      for (let i = 0; i < ids.length; i++)
        await db.prepare("UPDATE prog_acontecimentos SET ordem=? WHERE id=? AND evento_id=?").bind(slots[i], ids[i], eid).run();
    }
    return json({ ok: true });
  }
  if (m = path.match(/^\/api\/prog-acontecimentos\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "prog_acontecimentos", id, limparProgAcontecimento(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por, 60).replace(/'/g, "''")}'`))
        return json({ erro: "nada para atualizar" }, 400);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM prog_subtarefas WHERE tarefa_id IN (SELECT id FROM prog_tarefas WHERE acontecimento_id=?)").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='prog_tarefa' AND parent_id IN (SELECT id FROM prog_tarefas WHERE acontecimento_id=?)").bind(id).run();
      await excluirAnexosDeVarios(db, env, "prog_tarefa", "SELECT id FROM prog_tarefas WHERE acontecimento_id=?", [id]);
      await db.prepare("DELETE FROM prog_tarefas WHERE acontecimento_id=?").bind(id).run();
      await db.prepare("DELETE FROM prog_acontecimentos WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/prog-acontecimentos\/(\d+)\/tarefas$/)) && method === "POST") {
    const aid = +m[1];
    const b = await request.json().catch(() => ({}));
    const c = limparProgTarefa(b);
    if (!c.titulo) return json({ erro: "t\xEDtulo obrigat\xF3rio" }, 400);
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM prog_tarefas WHERE acontecimento_id=?").bind(aid).first();
    const r = await db.prepare(`
        INSERT INTO prog_tarefas (acontecimento_id, ordem, titulo, status, responsavel, data_limite, fornecedor_id, observacoes)
        VALUES (?,?,?,?,?,?,?,?)`).bind(
      aid,
      (mx ? mx.mo : 0) + 1,
      c.titulo,
      c.status ?? "afazer",
      c.responsavel ?? "",
      c.data_limite ?? "",
      c.fornecedor_id ?? null,
      c.observacoes ?? ""
    ).run();
    const tarefa = await db.prepare(`
        SELECT t.*, f.nome AS forn_nome, f.categoria AS forn_categoria, f.contato AS forn_contato, f.telefone AS forn_telefone
        FROM prog_tarefas t LEFT JOIN fornecedores f ON f.id=t.fornecedor_id WHERE t.id=?`).bind(r.meta.last_row_id).first();
    await recomputeAcontecimentoStatus(db, aid);
    return json({ ok: true, tarefa });
  }
  if (m = path.match(/^\/api\/prog-tarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      const c = limparProgTarefa(b);
      if (!await upd(db, "prog_tarefas", id, c)) return json({ erro: "nada para atualizar" }, 400);
      const tarefa = await db.prepare(`
          SELECT t.*, f.nome AS forn_nome, f.categoria AS forn_categoria, f.contato AS forn_contato, f.telefone AS forn_telefone
          FROM prog_tarefas t LEFT JOIN fornecedores f ON f.id=t.fornecedor_id WHERE t.id=?`).bind(id).first();
      if (tarefa && "status" in c) await recomputeAcontecimentoStatus(db, tarefa.acontecimento_id);
      return tarefa ? json({ ok: true, tarefa }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      const tarefa = await db.prepare("SELECT acontecimento_id FROM prog_tarefas WHERE id=?").bind(id).first();
      await db.prepare("DELETE FROM prog_subtarefas WHERE tarefa_id=?").bind(id).run();
      await db.prepare("DELETE FROM historico WHERE parent_tipo='prog_tarefa' AND parent_id=?").bind(id).run();
      await excluirAnexosDe(db, env, "prog_tarefa", id);
      await db.prepare("DELETE FROM prog_tarefas WHERE id=?").bind(id).run();
      if (tarefa) await recomputeAcontecimentoStatus(db, tarefa.acontecimento_id);
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/prog-tarefas\/(\d+)\/subtarefas$/)) && method === "POST") {
    const tid = +m[1];
    const b = await request.json().catch(() => ({}));
    const titulo = S(b.titulo, 200);
    if (!titulo) return json({ erro: "informe o t\xEDtulo" }, 400);
    const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM prog_subtarefas WHERE tarefa_id=?").bind(tid).first();
    const r = await db.prepare("INSERT INTO prog_subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,?)").bind(tid, (mx ? mx.mo : 0) + 1, titulo, B(b.concluido)).run();
    const sub = await db.prepare("SELECT * FROM prog_subtarefas WHERE id=?").bind(r.meta.last_row_id).first();
    return json({ ok: true, subtarefa: sub });
  }
  if (m = path.match(/^\/api\/prog-subtarefas\/(\d+)$/)) {
    const id = +m[1];
    if (method === "PATCH") {
      const b = await request.json().catch(() => ({}));
      if (!await upd(db, "prog_subtarefas", id, limparSubitem(b))) return json({ erro: "nada para atualizar" }, 400);
      const sub = await db.prepare("SELECT * FROM prog_subtarefas WHERE id=?").bind(id).first();
      return sub ? json({ ok: true, subtarefa: sub }) : json({ erro: "n\xE3o encontrado" }, 404);
    }
    if (method === "DELETE") {
      await db.prepare("DELETE FROM prog_subtarefas WHERE id=?").bind(id).run();
      return json({ ok: true });
    }
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/analisar$/)) && method === "POST") {
    if (!env.ANTHROPIC_API_KEY) return json({ erro: "IA n\xE3o configurada \u2014 falta ANTHROPIC_API_KEY (pe\xE7a pro dono configurar)" }, 501);
    const eid = +m[1];
    const analise = await analisarOperacao(db, env, eid, verFinanceiro && (auth.tipo !== "usuario" || pode("financeiro.ver_valores")));
    return analise.erro ? json(analise, 502) : json({ ok: true, analise });
  }
  const HIST_TIPOS = /* @__PURE__ */ new Set(["op_item", "op_tarefa", "campo_tarefa", "item", "registro_utv", "prog_tarefa", "cliente_nf_utv"]);
  if (path === "/api/historico" && method === "GET") {
    const tipo = S(url.searchParams.get("parent_tipo"), 30);
    const pid = I(url.searchParams.get("parent_id"));
    if (!HIST_TIPOS.has(tipo) || pid == null) return json({ erro: "parent_tipo/parent_id inv\xE1lido" }, 400);
    const { results } = await db.prepare(
      "SELECT * FROM historico WHERE parent_tipo=? AND parent_id=? ORDER BY id DESC"
    ).bind(tipo, pid).all();
    return json({ historico: results });
  }
  if (path === "/api/historico" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const tipo = S(b.parent_tipo, 30);
    const pid = I(b.parent_id);
    const texto = S(b.texto, 1e3).trim();
    if (!HIST_TIPOS.has(tipo) || pid == null) return json({ erro: "parent_tipo/parent_id inv\xE1lido" }, 400);
    if (!texto) return json({ erro: "informe o texto" }, 400);
    const r = await db.prepare(
      "INSERT INTO historico (parent_tipo, parent_id, texto, criado_por) VALUES (?,?,?,?)"
    ).bind(tipo, pid, texto, S(b.criado_por, 60)).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/historico\/(\d+)$/)) && method === "DELETE") {
    await db.prepare("DELETE FROM historico WHERE id=?").bind(+m[1]).run();
    return json({ ok: true });
  }
  const ANEXO_TAM_MAX = 20 * 1024 * 1024;
  if (path === "/api/anexos" && method === "GET") {
    const tipo = S(url.searchParams.get("parent_tipo"), 30);
    const pid = I(url.searchParams.get("parent_id"));
    if (!HIST_TIPOS.has(tipo) || pid == null) return json({ erro: "parent_tipo/parent_id inv\xE1lido" }, 400);
    const { results } = await db.prepare(
      "SELECT id, parent_tipo, parent_id, nome_arquivo, tipo_mime, tamanho, criado_em, criado_por FROM anexos WHERE parent_tipo=? AND parent_id=? ORDER BY id DESC"
    ).bind(tipo, pid).all();
    return json({ anexos: results });
  }
  if (path === "/api/anexos" && method === "POST") {
    const fd = await request.formData().catch(() => null);
    if (!fd) return json({ erro: "envie como multipart/form-data" }, 400);
    const tipo = S(fd.get("parent_tipo"), 30);
    const pid = I(fd.get("parent_id"));
    const arquivo = fd.get("arquivo");
    if (!HIST_TIPOS.has(tipo) || pid == null) return json({ erro: "parent_tipo/parent_id inv\xE1lido" }, 400);
    if (!arquivo || typeof arquivo === "string") return json({ erro: "envie o arquivo no campo 'arquivo'" }, 400);
    if (arquivo.size > ANEXO_TAM_MAX) return json({ erro: "arquivo maior que 20MB" }, 400);
    const nome = S(arquivo.name, 200) || "arquivo";
    const key = tipo + "/" + pid + "/" + crypto.randomUUID() + "-" + nome;
    await env.ANEXOS.put(key, arquivo.stream(), { httpMetadata: { contentType: arquivo.type || "application/octet-stream" } });
    const r = await db.prepare(`
        INSERT INTO anexos (parent_tipo, parent_id, nome_arquivo, tipo_mime, tamanho, r2_key, criado_por)
        VALUES (?,?,?,?,?,?,?)`).bind(
      tipo,
      pid,
      nome,
      arquivo.type || "",
      arquivo.size,
      key,
      S(fd.get("criado_por"), 60)
    ).run();
    return json({ ok: true, id: r.meta.last_row_id });
  }
  if ((m = path.match(/^\/api\/anexos\/(\d+)\/arquivo$/)) && method === "GET") {
    const a = await db.prepare("SELECT * FROM anexos WHERE id=?").bind(+m[1]).first();
    if (!a) return json({ erro: "n\xE3o encontrado" }, 404);
    const obj = await env.ANEXOS.get(a.r2_key);
    if (!obj) return json({ erro: "arquivo n\xE3o encontrado no armazenamento" }, 404);
    return new Response(obj.body, { headers: {
      "content-type": a.tipo_mime || "application/octet-stream",
      "content-disposition": 'attachment; filename="' + a.nome_arquivo.replace(/"/g, "") + '"',
      ...CORS2
    } });
  }
  if ((m = path.match(/^\/api\/anexos\/(\d+)$/)) && method === "DELETE") {
    const a = await db.prepare("SELECT * FROM anexos WHERE id=?").bind(+m[1]).first();
    if (!a) return json({ erro: "n\xE3o encontrado" }, 404);
    await env.ANEXOS.delete(a.r2_key);
    await db.prepare("DELETE FROM anexos WHERE id=?").bind(a.id).run();
    return json({ ok: true });
  }
  if ((m = path.match(/^\/api\/eventos\/(\d+)\/agenda$/)) && method === "GET") {
    const eid = +m[1];
    const { results: ct } = await db.prepare(`
        SELECT t.id, t.nome, t.h_planejado AS horario, t.h_realizado, t.responsavel, t.tipo, t.status,
               d.rotulo AS dia, d.ordem AS dia_ordem
        FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id
        WHERE d.evento_id=?`).bind(eid).all();
    const entradas = ct.map((t) => ({
      origem: "campo",
      id: t.id,
      dia: t.dia,
      dia_ordem: t.dia_ordem,
      horario: t.horario,
      h_realizado: t.h_realizado,
      nome: t.nome,
      tipo: t.tipo,
      status: t.status,
      responsavel: t.responsavel
    }));
    entradas.sort((a, b) => a.dia_ordem - b.dia_ordem || String(a.dia).localeCompare(String(b.dia)) || String(a.horario).localeCompare(String(b.horario)));
    return json({ entradas });
  }
  return json({ erro: "n\xE3o encontrado" }, 404);
}
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
