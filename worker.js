/* ============================================================
   CONTROLE DE EVENTOS · Desbravando UTV — v3.4
   Cloudflare Worker + D1 (SQLite serverless)

   Um só arquivo responde tudo: serve o front (ui.html) na raiz e
   expõe a API em /api/*. Sem framework — roteamento na mão por
   regex de path + método.

   Módulos: Checklist · Participantes + Financeiro · Simulador de
            custos · Hospedagem · Tarefas gerais · Mini-CRM ·
            Custos + Fornecedores

   Acesso em dois níveis (chave única compartilhada por nível):
     APP_KEY  (secret) → papel "admin": tudo, inclusive dados
                          pessoais, financeiro, custos e CRM
     TEAM_KEY (secret, opcional) → papel "equipe": checklist,
                          hospedagem e tarefas (sem CPF/financeiro)
   A chave vai no header "x-app-key" (ver papel()).
   ============================================================ */

import UI_HTML from "./ui.html";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-app-key",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

function papel(request, env) {
  const key = request.headers.get("x-app-key") || "";
  if (env.APP_KEY && key === env.APP_KEY) return "admin";
  // chave dedicada do cliente (mesmo poder de admin, revogável à parte via `wrangler secret delete CLIENTE_KEY`)
  if (env.CLIENTE_KEY && key === env.CLIENTE_KEY) return "admin";
  if (env.TEAM_KEY && key === env.TEAM_KEY) return "equipe";
  return null;
}

/* ---------- saneamento de campos ---------- */
const S = (v, max = 300) => String(v ?? "").slice(0, max);
const N = v => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const I = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const B = v => (v ? 1 : 0);

const ITEM_STATUS = new Set(["afazer", "andamento", "concluido"]);
const MULTS = new Set(["nenhum", "diarias", "dias_trilha", "refeicoes", "eventos"]);

function limparItem(b) {
  const o = {};
  if ("ordem" in b) o.ordem = I(b.ordem);
  for (const c of ["dia","item","setor","data_limite","responsavel","fornecedor","quantidade"]) if (c in b) o[c] = S(b[c], 300);
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
  for (const c of ["grupo","nome","cpf","telefone","camiseta","utv","nf","forma_pagamento"]) if (c in b) o[c] = S(b[c], 160);
  if ("contato_id" in b) o.contato_id = I(b.contato_id);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("tipo" in b) o.tipo = b.tipo === "crianca" ? "crianca" : "adulto";
  if ("contrato_enviado" in b) o.contrato_enviado = B(b.contrato_enviado);
  if ("contrato_assinado" in b) o.contrato_assinado = B(b.contrato_assinado);
  if ("pacote" in b) o.pacote = N(b.pacote);
  if ("staff" in b) o.staff = B(b.staff);
  return o;
}
function limparCenario(b) {
  const o = {};
  if ("nome" in b) o.nome = S(b.nome, 120);
  for (const c of ["pessoas","diarias","dias_trilha","refeicoes","eventos_qtd"]) if (c in b) o[c] = Math.max(0, I(b[c]) ?? 0);
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

const CRM_ETAPAS = new Set(["lead","contato","proposta","confirmado","pos_evento","perdido"]);

function limparTarefa(b) {
  const o = {};
  if ("titulo" in b) o.titulo = S(b.titulo, 300);
  for (const c of ["setor","data_limite","responsavel"]) if (c in b) o[c] = S(b[c], 120);
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
  for (const c of ["grupo","telefone","cpf","camiseta","cidade","origem","interesse","proxima_acao","proxima_data"]) if (c in b) o[c] = S(b[c], 200);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  if ("etapa" in b && CRM_ETAPAS.has(b.etapa)) o.etapa = b.etapa;
  if ("valor_potencial" in b) o.valor_potencial = N(b.valor_potencial);
  return o;
}

const CUSTO_STATUS = new Set(["pago", "parcial", "andamento", "pendente"]);

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
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}
function limparFornecedor(b) {
  const o = {};
  for (const c of ["nome", "categoria", "contato", "telefone", "cidade"]) if (c in b) o[c] = S(b[c], 160);
  if ("observacoes" in b) o.observacoes = S(b.observacoes, 600);
  return o;
}

/* UPDATE genérico: monta o "SET col=?" a partir das chaves do objeto
   já saneado e faz bind na ordem. `extra` é um trecho fixo pra colar
   no fim do SET (ex.: atualizado_em/atualizado_por). Retorna false
   quando não há nada pra atualizar. */
async function upd(db, tabela, id, campos, extra = "") {
  const chaves = Object.keys(campos);
  if (!chaves.length) return false;
  const sets = chaves.map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE ${tabela} SET ${sets}${extra} WHERE id=?`)
    .bind(...chaves.map(k => campos[k]), id).run();
  return true;
}

/* linhas-modelo de um cenário novo em branco */
const LINHAS_PADRAO = [
  ["Hospedagem","pessoa",1,0,"diarias"], ["Refeições","pessoa",1,0,"refeicoes"],
  ["Cerveja","pessoa",15,0,"dias_trilha"], ["Água","pessoa",3,0,"dias_trilha"],
  ["Refrigerante","pessoa",3,0,"dias_trilha"], ["Gelo","pessoa",1,0,"dias_trilha"],
  ["Chopp","pessoa",4,0,"eventos"], ["Barman/Drinks","pessoa",1,0,"eventos"],
  ["Atrações musicais","fixo",1,0,"eventos"], ["Guia local","fixo",1,0,"nenhum"],
  ["Camiseta","pessoa",1,0,"nenhum"], ["Extras","fixo",1,0,"nenhum"],
];

/* ============================================================
   MCP · servidor de ferramentas para o Claude Code do cliente
   Fala com o MESMO banco; autentica pela MESMA chave (x-app-key).
   Ferramentas de financeiro exigem a chave admin.
   ============================================================ */
const MCP_POR = a => (S(a && a.por, 60) || "Assistente (Claude)");
function mcpJSON(v){ return typeof v === "string" ? v : JSON.stringify(v); }
/* nome de tabela é sempre uma constante nossa (nunca vem do usuário) */
async function mcpExiste(db, tabela, id){
  const r = await db.prepare(`SELECT 1 FROM ${tabela} WHERE id=?`).bind(id).first();
  return !!r;
}

const MCP_TOOLS = [
  /* ---- Tarefas gerais ---- */
  { name:"listar_tarefas",
    description:"Lista as tarefas gerais (fora dos eventos): id, título, status, prioridade, responsável. Use ANTES de atualizar/concluir para descobrir os ids.",
    input:{ type:"object", properties:{ busca:{type:"string",description:"filtra por texto no título/responsável/setor"}, status:{type:"string",enum:["afazer","andamento","concluido"]} } },
    run: async (db,a)=>{
      const { results } = await db.prepare("SELECT id,titulo,status,prioridade,responsavel,setor,data_limite,horario FROM tarefas ORDER BY CASE status WHEN 'concluido' THEN 1 ELSE 0 END, ordem, COALESCE(prioridade,999), id").all();
      let l = results || [];
      if (a.busca){ const q=String(a.busca).toLowerCase(); l=l.filter(t=>((t.titulo||"")+" "+(t.responsavel||"")+" "+(t.setor||"")).toLowerCase().indexOf(q)>=0); }
      if (a.status){ l=l.filter(t=>t.status===a.status); }
      return mcpJSON(l);
    } },
  { name:"criar_tarefa",
    description:"Cria uma tarefa geral.",
    input:{ type:"object", required:["titulo"], properties:{ titulo:{type:"string"}, setor:{type:"string"}, responsavel:{type:"string"}, prioridade:{type:"integer",description:"1 a 40 (1 = mais urgente)"}, status:{type:"string",enum:["afazer","andamento","concluido"]}, data_limite:{type:"string"}, horario:{type:"string",description:'ex.: "14h", "08:30"'}, observacoes:{type:"string"} } },
    run: async (db,a)=>{
      const t=limparTarefa(a); if(!t.titulo) throw new Error("titulo é obrigatório");
      const r=await db.prepare("INSERT INTO tarefas (titulo,setor,status,prioridade,data_limite,responsavel,ordem,horario,observacoes,atualizado_por) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(t.titulo,t.setor??"",t.status??"afazer",t.prioridade??null,t.data_limite??"",t.responsavel??"",t.ordem??null,t.horario??"",t.observacoes??"",MCP_POR(a)).run();
      return "Tarefa criada (id "+r.meta.last_row_id+"): "+t.titulo;
    } },
  { name:"atualizar_tarefa",
    description:"Atualiza campos de uma tarefa (inclusive status). Passe só os campos que quer mudar.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"}, titulo:{type:"string"}, setor:{type:"string"}, responsavel:{type:"string"}, prioridade:{type:"integer"}, status:{type:"string",enum:["afazer","andamento","concluido"]}, data_limite:{type:"string"}, horario:{type:"string"}, observacoes:{type:"string"} } },
    run: async (db,a)=>{
      const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"tarefas",id)) throw new Error("tarefa "+id+" não encontrada");
      const t=limparTarefa(a); if(!Object.keys(t).length) throw new Error("nada para atualizar");
      await upd(db,"tarefas",id,t,`, atualizado_em=datetime('now'), atualizado_por='${MCP_POR(a).replace(/'/g,"''")}'`);
      return "Tarefa "+id+" atualizada.";
    } },
  { name:"excluir_tarefa",
    description:"Exclui uma tarefa e suas subtarefas. AÇÃO DESTRUTIVA — confirme com o usuário antes.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"tarefas",id)) throw new Error("tarefa "+id+" não encontrada");
      await db.prepare("DELETE FROM subtarefas WHERE tarefa_id=?").bind(id).run();
      await db.prepare("DELETE FROM tarefas WHERE id=?").bind(id).run();
      return "Tarefa "+id+" excluída."; } },
  { name:"criar_subtarefa",
    description:"Cria uma subtarefa dentro de uma tarefa geral.",
    input:{ type:"object", required:["tarefa_id","titulo"], properties:{ tarefa_id:{type:"integer"}, titulo:{type:"string"} } },
    run: async (db,a)=>{ const tid=I(a.tarefa_id); if(!tid) throw new Error("tarefa_id é obrigatório");
      const c=limparSubitem(a); if(!c.titulo) throw new Error("titulo é obrigatório");
      const mx=await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subtarefas WHERE tarefa_id=?").bind(tid).first();
      const r=await db.prepare("INSERT INTO subtarefas (tarefa_id,ordem,titulo,concluido) VALUES (?,?,?,?)").bind(tid,(mx?mx.mo:0)+1,c.titulo,c.concluido??0).run();
      return "Subtarefa criada (id "+r.meta.last_row_id+")."; } },
  { name:"atualizar_subtarefa",
    description:"Atualiza uma subtarefa de tarefa geral (título e/ou concluído).",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"}, titulo:{type:"string"}, concluido:{type:"boolean"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"subtarefas",id)) throw new Error("subtarefa "+id+" não encontrada");
      const c=limparSubitem(a); if(!Object.keys(c).length) throw new Error("nada para atualizar");
      await upd(db,"subtarefas",id,c); return "Subtarefa "+id+" atualizada."; } },
  { name:"excluir_subtarefa",
    description:"Exclui uma subtarefa de tarefa geral. AÇÃO DESTRUTIVA.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"subtarefas",id)) throw new Error("subtarefa "+id+" não encontrada");
      await db.prepare("DELETE FROM subtarefas WHERE id=?").bind(id).run(); return "Subtarefa "+id+" excluída."; } },

  /* ---- Eventos + checklist ---- */
  { name:"listar_eventos",
    description:"Lista os eventos/expedições (id e nome). Use para achar o evento_id.",
    input:{ type:"object", properties:{} },
    run: async (db)=>{ const { results } = await db.prepare("SELECT id,nome,arquivado FROM eventos ORDER BY arquivado, id DESC").all(); return mcpJSON(results||[]); } },
  { name:"listar_itens",
    description:"Lista os itens do checklist de um evento (id, item, dia, status, prioridade, horário).",
    input:{ type:"object", required:["evento_id"], properties:{ evento_id:{type:"integer"} } },
    run: async (db,a)=>{ const eid=I(a.evento_id); if(!eid) throw new Error("evento_id é obrigatório");
      const { results } = await db.prepare("SELECT id,item,dia,setor,status,prioridade,horario,responsavel FROM itens WHERE evento_id=? ORDER BY ordem,id").bind(eid).all();
      return mcpJSON(results||[]); } },
  { name:"criar_item",
    description:"Cria um item no checklist de um evento.",
    input:{ type:"object", required:["evento_id","item"], properties:{ evento_id:{type:"integer"}, item:{type:"string"}, dia:{type:"string",description:'ex.: "Pré", "26/08", "Pós"'}, setor:{type:"string"}, status:{type:"string",enum:["afazer","andamento","concluido"]}, prioridade:{type:"integer"}, data_limite:{type:"string"}, responsavel:{type:"string"}, fornecedor:{type:"string"}, quantidade:{type:"string"}, valor:{type:"number"}, horario:{type:"string"}, observacoes:{type:"string"} } },
    run: async (db,a)=>{ const eid=I(a.evento_id); if(!eid) throw new Error("evento_id é obrigatório");
      const c=limparItem(a); if(!c.item) throw new Error("item é obrigatório");
      const r=await db.prepare("INSERT INTO itens (evento_id,ordem,dia,item,setor,status,prioridade,data_limite,responsavel,fornecedor,quantidade,valor,horario,observacoes,atualizado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(eid,c.ordem??null,c.dia??"",c.item,c.setor??"",c.status??"afazer",c.prioridade??null,c.data_limite??"",c.responsavel??"",c.fornecedor??"",c.quantidade??"",c.valor??null,c.horario??"",c.observacoes??"",MCP_POR(a)).run();
      return "Item criado (id "+r.meta.last_row_id+") no evento "+eid+": "+c.item; } },
  { name:"atualizar_item",
    description:"Atualiza um item do checklist (inclusive status). Passe só o que quer mudar.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"}, item:{type:"string"}, dia:{type:"string"}, setor:{type:"string"}, status:{type:"string",enum:["afazer","andamento","concluido"]}, prioridade:{type:"integer"}, data_limite:{type:"string"}, responsavel:{type:"string"}, fornecedor:{type:"string"}, quantidade:{type:"string"}, valor:{type:"number"}, horario:{type:"string"}, observacoes:{type:"string"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"itens",id)) throw new Error("item "+id+" não encontrado");
      const c=limparItem(a); if(!Object.keys(c).length) throw new Error("nada para atualizar");
      await upd(db,"itens",id,c,`, atualizado_em=datetime('now'), atualizado_por='${MCP_POR(a).replace(/'/g,"''")}'`);
      return "Item "+id+" atualizado."; } },
  { name:"excluir_item",
    description:"Exclui um item do checklist e suas subtarefas. AÇÃO DESTRUTIVA.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"itens",id)) throw new Error("item "+id+" não encontrado");
      await db.prepare("DELETE FROM subitens WHERE item_id=?").bind(id).run();
      await db.prepare("DELETE FROM itens WHERE id=?").bind(id).run();
      return "Item "+id+" excluído."; } },
  { name:"criar_subitem",
    description:"Cria uma subtarefa dentro de um item do checklist.",
    input:{ type:"object", required:["item_id","titulo"], properties:{ item_id:{type:"integer"}, titulo:{type:"string"} } },
    run: async (db,a)=>{ const iid=I(a.item_id); if(!iid) throw new Error("item_id é obrigatório");
      const c=limparSubitem(a); if(!c.titulo) throw new Error("titulo é obrigatório");
      const mx=await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subitens WHERE item_id=?").bind(iid).first();
      const r=await db.prepare("INSERT INTO subitens (item_id,ordem,titulo,concluido) VALUES (?,?,?,?)").bind(iid,(mx?mx.mo:0)+1,c.titulo,c.concluido??0).run();
      return "Subtarefa criada (id "+r.meta.last_row_id+")."; } },
  { name:"atualizar_subitem",
    description:"Atualiza uma subtarefa de item do checklist (título e/ou concluído).",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"}, titulo:{type:"string"}, concluido:{type:"boolean"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"subitens",id)) throw new Error("subtarefa "+id+" não encontrada");
      const c=limparSubitem(a); if(!Object.keys(c).length) throw new Error("nada para atualizar");
      await upd(db,"subitens",id,c); return "Subtarefa "+id+" atualizada."; } },
  { name:"excluir_subitem",
    description:"Exclui uma subtarefa de item do checklist. AÇÃO DESTRUTIVA.",
    input:{ type:"object", required:["id"], properties:{ id:{type:"integer"} } },
    run: async (db,a)=>{ const id=I(a.id); if(!id) throw new Error("id é obrigatório");
      if(!await mcpExiste(db,"subitens",id)) throw new Error("subtarefa "+id+" não encontrada");
      await db.prepare("DELETE FROM subitens WHERE id=?").bind(id).run(); return "Subtarefa "+id+" excluída."; } },

  /* ---- Financeiro (leitura; exige chave admin) ---- */
  { name:"listar_custos", admin:true,
    description:"(admin) Lista os custos de um evento: item, categoria, valor, valor pago e status.",
    input:{ type:"object", required:["evento_id"], properties:{ evento_id:{type:"integer"} } },
    run: async (db,a)=>{ const eid=I(a.evento_id); if(!eid) throw new Error("evento_id é obrigatório");
      const { results } = await db.prepare("SELECT id,item,categoria,quantidade,valor,valor_pago,status,forma_pagamento FROM custos WHERE evento_id=? ORDER BY ordem,id").bind(eid).all();
      return mcpJSON(results||[]); } },
  { name:"listar_participantes", admin:true,
    description:"(admin) Lista os participantes de um evento (sem CPF): nome, grupo, tipo, telefone, UTV, pacote e se é staff.",
    input:{ type:"object", required:["evento_id"], properties:{ evento_id:{type:"integer"} } },
    run: async (db,a)=>{ const eid=I(a.evento_id); if(!eid) throw new Error("evento_id é obrigatório");
      const { results } = await db.prepare("SELECT id,nome,grupo,tipo,telefone,utv,pacote,staff FROM clientes WHERE evento_id=? ORDER BY id").bind(eid).all();
      return mcpJSON(results||[]); } },
];

async function handleMcpMsg(msg, db, admin){
  const id = (msg && msg.id !== undefined) ? msg.id : null;
  const method = msg && msg.method;
  if (method === "initialize"){
    return { jsonrpc:"2.0", id, result:{
      protocolVersion: (msg.params && msg.params.protocolVersion) || "2025-06-18",
      capabilities:{ tools:{} },
      serverInfo:{ name:"eventos-desbravando", version:"1.0.0" }
    } };
  }
  if (method === "ping") return { jsonrpc:"2.0", id, result:{} };
  if (typeof method === "string" && method.indexOf("notifications/") === 0) return null;
  if (method === "tools/list"){
    return { jsonrpc:"2.0", id, result:{ tools: MCP_TOOLS.map(t=>({ name:t.name, description:t.description, inputSchema:t.input })) } };
  }
  if (method === "tools/call"){
    const p = msg.params || {};
    const tool = MCP_TOOLS.find(t=>t.name===p.name);
    if (!tool) return { jsonrpc:"2.0", id, error:{ code:-32602, message:"ferramenta desconhecida: "+p.name } };
    if (tool.admin && !admin) return { jsonrpc:"2.0", id, result:{ isError:true, content:[{ type:"text", text:"Essa ação (financeiro) exige a chave admin." }] } };
    try {
      const text = await tool.run(db, p.arguments || {});
      return { jsonrpc:"2.0", id, result:{ content:[{ type:"text", text: mcpJSON(text) }] } };
    } catch(e){
      return { jsonrpc:"2.0", id, result:{ isError:true, content:[{ type:"text", text:"Erro: "+((e && e.message) || String(e)) }] } };
    }
  }
  if (id === null) return null;
  return { jsonrpc:"2.0", id, error:{ code:-32601, message:"método não suportado: "+method } };
}

async function handleMcp(request, db, admin){
  let body;
  try { body = await request.json(); } catch(_){ return json({ jsonrpc:"2.0", id:null, error:{ code:-32700, message:"JSON inválido" } }, 400); }
  const arr = Array.isArray(body) ? body : [body];
  const out = [];
  for (const msg of arr){ const r = await handleMcpMsg(msg, db, admin); if (r) out.push(r); }
  if (!out.length) return new Response(null, { status:202, headers:CORS });
  return json(Array.isArray(body) ? out : out[0]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { headers: CORS });
    if (path === "/" && method === "GET")
      return new Response(UI_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
    if (!path.startsWith("/api/")) return json({ erro: "não encontrado" }, 404);

    const quem = papel(request, env);
    if (!quem) return json({ erro: "chave inválida" }, 401);
    const admin = quem === "admin";
    const db = env.DB;
    const negado = () => json({ erro: "disponível apenas para a chave admin" }, 403);
    let m;

    /* ===== MCP: ferramentas p/ o Claude Code / claude.ai do cliente ===== */
    if (path === "/api/mcp") {
      if (method === "POST") return handleMcp(request, db, admin);
      return json({ erro: "MCP: use POST" }, 405);
    }

    if (path === "/api/me" && method === "GET") return json({ papel: quem });

    /* ================= EVENTOS ================= */
    if (path === "/api/eventos" && method === "GET") {
      const { results } = await db.prepare(`
        SELECT e.id, e.nome, e.criado_em, e.arquivado,
               COUNT(i.id) AS total,
               SUM(CASE WHEN i.status='concluido' THEN 1 ELSE 0 END) AS concluidos,
               SUM(CASE WHEN i.status='andamento' THEN 1 ELSE 0 END) AS andamento,
               (SELECT COALESCE(SUM(cu.valor),0) FROM custos cu WHERE cu.evento_id=e.id) AS valor_total
        FROM eventos e LEFT JOIN itens i ON i.evento_id=e.id
        GROUP BY e.id ORDER BY e.arquivado ASC, e.id DESC`).all();
      return json({ eventos: results });
    }
    if (path === "/api/eventos" && method === "POST") {
      if (!admin) return negado();
      const b = await request.json().catch(() => ({}));
      const nome = S(b.nome, 120).trim();
      if (!nome) return json({ erro: "informe o nome do evento" }, 400);
      const r = await db.prepare("INSERT INTO eventos (nome) VALUES (?)").bind(nome).run();
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
          "SELECT id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd FROM cenarios WHERE evento_id=?").bind(origem).all();
        for (const c of cs) {
          const rc = await db.prepare(
            "INSERT INTO cenarios (evento_id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd) VALUES (?,?,?,?,?,?,?)")
            .bind(novo, c.nome, c.pessoas, c.diarias, c.dias_trilha, c.refeicoes, c.eventos_qtd).run();
          await db.prepare(`
            INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult)
            SELECT ?, ordem, item, tipo, media, preco, mult FROM cenario_linhas WHERE cenario_id=?`)
            .bind(rc.meta.last_row_id, c.id).run();
        }
      }
      return json({ ok: true, id: novo });
    }
    if ((m = path.match(/^\/api\/eventos\/(\d+)$/))) {
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
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM pagamentos WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?)").bind(id).run();
        await db.prepare("DELETE FROM cliente_notas WHERE cliente_id IN (SELECT id FROM clientes WHERE evento_id=?)").bind(id).run();
        await db.prepare("DELETE FROM alocacoes WHERE quarto_id IN (SELECT id FROM quartos WHERE evento_id=?)").bind(id).run();
        await db.prepare("DELETE FROM cenario_linhas WHERE cenario_id IN (SELECT id FROM cenarios WHERE evento_id=?)").bind(id).run();
        for (const t of ["itens","clientes","quartos","cenarios","custos"])
          await db.prepare(`DELETE FROM ${t} WHERE evento_id=?`).bind(id).run();
        await db.prepare("DELETE FROM eventos WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }

    /* ================= CHECKLIST ================= */
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/itens$/))) {
      const eid = +m[1];
      if (method === "GET") {
        const ev = await db.prepare("SELECT * FROM eventos WHERE id=?").bind(eid).first();
        if (!ev) return json({ erro: "evento não encontrado" }, 404);
        const { results } = await db.prepare("SELECT * FROM itens WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
        // v3.5: anexa as subtarefas de cada item
        {
          const rs = await db.prepare(
            "SELECT s.* FROM subitens s JOIN itens i ON i.id=s.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id"
          ).bind(eid).all();
          const porItem = {};
          for (const s of (rs.results || [])) (porItem[s.item_id] = porItem[s.item_id] || []).push(s);
          for (const it of results) it.subitens = porItem[it.id] || [];
        }
        let custo_total = 0, pessoas = null;
        if (admin) {
          const ct = await db.prepare("SELECT COALESCE(SUM(valor),0) AS t FROM custos WHERE evento_id=?").bind(eid).first();
          custo_total = ct ? ct.t : 0;
          const pc = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN tipo='crianca' THEN 1 ELSE 0 END) AS criancas, SUM(CASE WHEN tipo<>'crianca' THEN 1 ELSE 0 END) AS adultos, SUM(CASE WHEN utv='4 lugares' THEN 1 ELSE 0 END) AS utv4, SUM(CASE WHEN utv='2 lugares' THEN 1 ELSE 0 END) AS utv2 FROM clientes WHERE evento_id=?").bind(eid).first();
          pessoas = { total: (pc && pc.total) || 0, adultos: (pc && pc.adultos) || 0, criancas: (pc && pc.criancas) || 0, utv4: (pc && pc.utv4) || 0, utv2: (pc && pc.utv2) || 0 };
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
            eid, c.ordem ?? null, c.dia ?? "", c.item, c.setor ?? "", c.status ?? "afazer",
            c.prioridade ?? null, c.data_limite ?? "", c.responsavel ?? "", c.fornecedor ?? "",
            c.quantidade ?? "", c.valor ?? null, c.horario ?? "", c.observacoes ?? "", por).run();
          ids.push(r.meta.last_row_id);
        }
        if (!ids.length) return json({ erro: "nenhum item válido" }, 400);
        return json({ ok: true, ids });
      }
    }
    if ((m = path.match(/^\/api\/itens\/(\d+)$/))) {
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const c = limparItem(b);
        if (!await upd(db, "itens", id, c, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
          return json({ erro: "nada para atualizar" }, 400);
        const item = await db.prepare("SELECT * FROM itens WHERE id=?").bind(id).first();
        return item ? json({ ok: true, item }) : json({ erro: "não encontrado" }, 404);
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM subitens WHERE item_id=?").bind(id).run();
        await db.prepare("DELETE FROM itens WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }

    /* v3.5: reordenar itens do checklist (arrastar) — equipe e admin */
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/itens\/reordenar$/)) && method === "POST") {
      const eid = +m[1];
      const b = await request.json().catch(() => ({}));
      const ids = Array.isArray(b.ids) ? b.ids : [];
      for (let i = 0; i < ids.length; i++) {
        await db.prepare("UPDATE itens SET ordem=? WHERE id=? AND evento_id=?").bind(i + 1, I(ids[i]), eid).run();
      }
      return json({ ok: true });
    }

    /* v3.5: subtarefas de um item */
    if ((m = path.match(/^\/api\/itens\/(\d+)\/subitens$/))) {
      const iid = +m[1];
      if (method === "GET") {
        const { results } = await db.prepare("SELECT * FROM subitens WHERE item_id=? ORDER BY ordem, id").bind(iid).all();
        return json({ subitens: results });
      }
      if (method === "POST") {
        const b = await request.json().catch(() => ({}));
        const c = limparSubitem(b);
        if (!c.titulo) return json({ erro: "título obrigatório" }, 400);
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subitens WHERE item_id=?").bind(iid).first();
        const r = await db.prepare("INSERT INTO subitens (item_id, ordem, titulo, concluido) VALUES (?,?,?,?)")
          .bind(iid, (mx ? mx.mo : 0) + 1, c.titulo, c.concluido ?? 0).run();
        const sub = await db.prepare("SELECT * FROM subitens WHERE id=?").bind(r.meta.last_row_id).first();
        return json({ ok: true, subitem: sub });
      }
    }
    if ((m = path.match(/^\/api\/subitens\/(\d+)$/))) {
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const c = limparSubitem(b);
        if (!await upd(db, "subitens", id, c)) return json({ erro: "nada para atualizar" }, 400);
        const sub = await db.prepare("SELECT * FROM subitens WHERE id=?").bind(id).first();
        return sub ? json({ ok: true, subitem: sub }) : json({ erro: "não encontrado" }, 404);
      }
      if (method === "DELETE") { await db.prepare("DELETE FROM subitens WHERE id=?").bind(id).run(); return json({ ok: true }); }
    }

    /* ================= PARTICIPANTES (admin) ================= */
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/clientes$/))) {
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
                                observacoes, contato_id, atualizado_por)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          eid, c.grupo ?? "", c.nome, c.cpf ?? "", c.telefone ?? "", c.tipo ?? "adulto",
          c.camiseta ?? "", c.utv ?? "", c.nf ?? "", c.contrato_enviado ?? 0,
          c.contrato_assinado ?? 0, c.pacote ?? null, c.forma_pagamento ?? "", c.staff ?? 0,
          c.observacoes ?? "", c.contato_id ?? null, S(b.atualizado_por, 60)).run();
        return json({ ok: true, id: r.meta.last_row_id });
      }
    }
    if ((m = path.match(/^\/api\/clientes\/(\d+)$/))) {
      if (!admin) return negado();
      const id = +m[1];
      if (method === "GET") {
        const cliente = await db.prepare("SELECT * FROM clientes WHERE id=?").bind(id).first();
        if (!cliente) return json({ erro: "não encontrado" }, 404);
        const { results } = await db.prepare("SELECT * FROM pagamentos WHERE cliente_id=? ORDER BY id").bind(id).all();
        const { results: notas } = await db.prepare("SELECT * FROM cliente_notas WHERE cliente_id=? ORDER BY id DESC").bind(id).all();
        return json({ cliente, pagamentos: results, notas });
      }
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const c = limparCliente(b);
        if (!await upd(db, "clientes", id, c, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
          return json({ erro: "nada para atualizar" }, 400);
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM pagamentos WHERE cliente_id=?").bind(id).run();
        await db.prepare("DELETE FROM cliente_notas WHERE cliente_id=?").bind(id).run();
        await db.prepare("UPDATE alocacoes SET cliente_id=NULL, nome_livre=(SELECT nome FROM clientes WHERE id=?) WHERE cliente_id=?").bind(id, id).run();
        await db.prepare("DELETE FROM clientes WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }
    if ((m = path.match(/^\/api\/clientes\/(\d+)\/pagamentos$/)) && method === "POST") {
      if (!admin) return negado();
      const b = await request.json().catch(() => ({}));
      const valor = N(b.valor);
      if (!valor || valor <= 0) return json({ erro: "informe um valor maior que zero" }, 400);
      const r = await db.prepare(
        "INSERT INTO pagamentos (cliente_id, valor, data, forma, observacoes, criado_por) VALUES (?,?,?,?,?,?)")
        .bind(+m[1], valor, S(b.data, 20), S(b.forma, 60), S(b.observacoes, 300), S(b.criado_por, 60)).run();
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
      const texto = S(b.texto, 1000).trim();
      if (!texto) return json({ erro: "escreva a anotação" }, 400);
      const r = await db.prepare(
        "INSERT INTO cliente_notas (cliente_id, texto, criado_por) VALUES (?,?,?)")
        .bind(+m[1], texto, S(b.criado_por, 60)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/cliente-notas\/(\d+)$/)) && method === "DELETE") {
      if (!admin) return negado();
      await db.prepare("DELETE FROM cliente_notas WHERE id=?").bind(+m[1]).run();
      return json({ ok: true });
    }

    /* ================= SIMULADOR (admin) ================= */
    if (path === "/api/cenarios/modelos" && method === "GET") {
      if (!admin) return negado();
      const { results } = await db.prepare(`
        SELECT c.id, c.nome, c.evento_id, c.pessoas, c.diarias, c.dias_trilha, c.refeicoes, c.eventos_qtd, e.nome AS evento
        FROM cenarios c JOIN eventos e ON e.id=c.evento_id
        WHERE c.modelo=1 ORDER BY c.nome COLLATE NOCASE`).all();
      return json({ modelos: results });
    }
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/cenarios$/))) {
      if (!admin) return negado();
      const eid = +m[1];
      if (method === "GET") {
        const { results: cenarios } = await db.prepare("SELECT * FROM cenarios WHERE evento_id=? ORDER BY id").bind(eid).all();
        const { results: linhas } = await db.prepare(
          "SELECT l.* FROM cenario_linhas l JOIN cenarios c ON c.id=l.cenario_id WHERE c.evento_id=? ORDER BY l.ordem, l.id").bind(eid).all();
        return json({ cenarios, linhas });
      }
      if (method === "POST") {
        const b = await request.json().catch(() => ({}));
        const c = limparCenario(b);
        if (!c.nome) return json({ erro: "informe o nome do cenário" }, 400);
        const r = await db.prepare(
          "INSERT INTO cenarios (evento_id, nome, pessoas, diarias, dias_trilha, refeicoes, eventos_qtd) VALUES (?,?,?,?,?,?,?)")
          .bind(eid, c.nome, c.pessoas ?? 1, c.diarias ?? 1, c.dias_trilha ?? 1, c.refeicoes ?? 1, c.eventos_qtd ?? 1).run();
        const novo = r.meta.last_row_id;
        const origem = I(b.copiar_de);
        if (origem) {
          await db.prepare(`
            INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult)
            SELECT ?, ordem, item, tipo, media, preco, mult FROM cenario_linhas WHERE cenario_id=?`).bind(novo, origem).run();
        } else {
          for (let i = 0; i < LINHAS_PADRAO.length; i++) {
            const l = LINHAS_PADRAO[i];
            await db.prepare("INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult) VALUES (?,?,?,?,?,?,?)")
              .bind(novo, i + 1, l[0], l[1], l[2], l[3], l[4]).run();
          }
        }
        return json({ ok: true, id: novo });
      }
    }
    if ((m = path.match(/^\/api\/cenarios\/(\d+)$/))) {
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
      const r = await db.prepare("INSERT INTO cenario_linhas (cenario_id, ordem, item, tipo, media, preco, mult) VALUES (?,?,?,?,?,?,?)")
        .bind(+m[1], l.ordem ?? 999, l.item, l.tipo ?? "pessoa", l.media ?? 1, l.preco ?? 0, l.mult ?? "nenhum").run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/linhas\/(\d+)$/))) {
      if (!admin) return negado();
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        if (!await upd(db, "cenario_linhas", id, limparLinha(b))) return json({ erro: "nada para atualizar" }, 400);
        return json({ ok: true });
      }
      if (method === "DELETE") { await db.prepare("DELETE FROM cenario_linhas WHERE id=?").bind(id).run(); return json({ ok: true }); }
    }

    /* ================= HOSPEDAGEM (equipe pode ver e alocar) ================= */
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/quartos$/))) {
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
        if (admin) {
          const { results } = await db.prepare(
            "SELECT id, nome, grupo FROM clientes WHERE evento_id=? ORDER BY grupo, nome").bind(eid).all();
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
          "INSERT INTO quartos (evento_id, ordem, nome, capacidade, diaria, adicional, observacoes) VALUES (?,?,?,?,?,?,?)")
          .bind(eid, q.ordem ?? 999, q.nome, q.capacidade ?? 2, q.diaria ?? null, q.adicional ?? 0, q.observacoes ?? "").run();
        return json({ ok: true, id: r.meta.last_row_id });
      }
    }
    if ((m = path.match(/^\/api\/quartos\/(\d+)$/))) {
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
        "INSERT INTO alocacoes (quarto_id, cliente_id, nome_livre, status) VALUES (?,?,?,?)")
        .bind(+m[1], cid || null, nome, S(b.status, 80)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/alocacoes\/(\d+)$/))) {
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const o = {};
        if ("status" in b) o.status = S(b.status, 80);
        if ("quarto_id" in b) o.quarto_id = I(b.quarto_id);
        if (!await upd(db, "alocacoes", id, o, ", atualizado_em=datetime('now')")) return json({ erro: "nada para atualizar" }, 400);
        return json({ ok: true });
      }
      if (method === "DELETE") { await db.prepare("DELETE FROM alocacoes WHERE id=?").bind(id).run(); return json({ ok: true }); }
    }

    /* ================= TAREFAS GERAIS (ambos os papéis) ================= */
    if (path === "/api/tarefas" && method === "GET") {
      const { results } = await db.prepare(
        "SELECT * FROM tarefas ORDER BY CASE status WHEN 'concluido' THEN 1 ELSE 0 END, ordem, COALESCE(prioridade, 999), id").all();
      // v3.6: anexa as subtarefas de cada tarefa
      {
        const rs = await db.prepare("SELECT * FROM subtarefas ORDER BY ordem, id").all();
        const porTarefa = {};
        for (const s of (rs.results || [])) (porTarefa[s.tarefa_id] = porTarefa[s.tarefa_id] || []).push(s);
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
      if (!t.titulo) return json({ erro: "informe o título da tarefa" }, 400);
      const r = await db.prepare(`
        INSERT INTO tarefas (titulo, setor, status, prioridade, data_limite, responsavel, ordem, horario, observacoes, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
        t.titulo, t.setor ?? "", t.status ?? "afazer", t.prioridade ?? null,
        t.data_limite ?? "", t.responsavel ?? "", t.ordem ?? null, t.horario ?? "",
        t.observacoes ?? "", S(b.atualizado_por, 60)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/tarefas\/(\d+)$/))) {
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const t = limparTarefa(b);
        if (!await upd(db, "tarefas", id, t, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
          return json({ erro: "nada para atualizar" }, 400);
        const tarefa = await db.prepare("SELECT * FROM tarefas WHERE id=?").bind(id).first();
        return tarefa ? json({ ok: true, tarefa }) : json({ erro: "não encontrado" }, 404);
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM subtarefas WHERE tarefa_id=?").bind(id).run();
        await db.prepare("DELETE FROM tarefas WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }
    /* v3.6: subtarefas de uma tarefa geral */
    if ((m = path.match(/^\/api\/tarefas\/(\d+)\/subtarefas$/))) {
      const tid = +m[1];
      if (method === "GET") {
        const { results } = await db.prepare("SELECT * FROM subtarefas WHERE tarefa_id=? ORDER BY ordem, id").bind(tid).all();
        return json({ subtarefas: results });
      }
      if (method === "POST") {
        const b = await request.json().catch(() => ({}));
        const c = limparSubitem(b);
        if (!c.titulo) return json({ erro: "título obrigatório" }, 400);
        const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subtarefas WHERE tarefa_id=?").bind(tid).first();
        const r = await db.prepare("INSERT INTO subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,?)")
          .bind(tid, (mx ? mx.mo : 0) + 1, c.titulo, c.concluido ?? 0).run();
        const sub = await db.prepare("SELECT * FROM subtarefas WHERE id=?").bind(r.meta.last_row_id).first();
        return json({ ok: true, subtarefa: sub });
      }
    }
    if ((m = path.match(/^\/api\/subtarefas\/(\d+)$/))) {
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        const c = limparSubitem(b);
        if (!await upd(db, "subtarefas", id, c)) return json({ erro: "nada para atualizar" }, 400);
        const sub = await db.prepare("SELECT * FROM subtarefas WHERE id=?").bind(id).first();
        return sub ? json({ ok: true, subtarefa: sub }) : json({ erro: "não encontrado" }, 404);
      }
      if (method === "DELETE") { await db.prepare("DELETE FROM subtarefas WHERE id=?").bind(id).run(); return json({ ok: true }); }
    }

    /* ================= MINI CRM (admin) ================= */
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
        c.nome, c.grupo ?? "", c.telefone ?? "", c.cpf ?? "", c.camiseta ?? "",
        c.cidade ?? "", c.origem ?? "",
        c.etapa ?? "lead", c.interesse ?? "", c.valor_potencial ?? null,
        c.proxima_acao ?? "", c.proxima_data ?? "", c.observacoes ?? "", S(b.atualizado_por, 60)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/crm\/(\d+)$/))) {
      if (!admin) return negado();
      const id = +m[1];
      if (method === "GET") {
        const contato = await db.prepare("SELECT * FROM crm_contatos WHERE id=?").bind(id).first();
        if (!contato) return json({ erro: "não encontrado" }, 404);
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
        if (!await upd(db, "crm_contatos", id, c, `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
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
      if (!resumo) return json({ erro: "descreva a interação" }, 400);
      const r = await db.prepare(
        "INSERT INTO crm_interacoes (contato_id, data, canal, resumo, criado_por) VALUES (?,?,?,?,?)")
        .bind(+m[1], S(b.data, 20), S(b.canal, 60), resumo, S(b.criado_por, 60)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/crm-interacoes\/(\d+)$/)) && method === "DELETE") {
      if (!admin) return negado();
      await db.prepare("DELETE FROM crm_interacoes WHERE id=?").bind(+m[1]).run();
      return json({ ok: true });
    }

    /* ================= FORNECEDORES (admin · globais) ================= */
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
        f.nome, f.categoria ?? "", f.contato ?? "", f.telefone ?? "", f.cidade ?? "",
        f.observacoes ?? "", S(b.atualizado_por, 60)).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
    if ((m = path.match(/^\/api\/fornecedores\/(\d+)$/))) {
      if (!admin) return negado();
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        if (!await upd(db, "fornecedores", id, limparFornecedor(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
          return json({ erro: "nada para atualizar" }, 400);
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await db.prepare("UPDATE custos SET fornecedor_id=NULL WHERE fornecedor_id=?").bind(id).run();
        await db.prepare("DELETE FROM fornecedores WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }

    /* ================= CUSTOS (admin · financeiro) ================= */
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/custos\/importar$/)) && method === "POST") {
      if (!admin) return negado();
      const eid = +m[1];
      const b = await request.json().catch(() => ({}));
      const cenId = I(b.cenario_id);
      const cen = await db.prepare("SELECT * FROM cenarios WHERE id=? AND evento_id=?").bind(cenId, eid).first();
      if (!cen) return json({ erro: "cenário não encontrado neste evento" }, 404);
      const { results: linhas } = await db.prepare(
        "SELECT * FROM cenario_linhas WHERE cenario_id=? ORDER BY ordem, id").bind(cenId).all();
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
          "INSERT INTO custos (evento_id, ordem, item, categoria, quantidade, valor, status) VALUES (?,?,?,?,?,?, 'pendente')")
          .bind(eid, ord, l.item, "", qtd, total).run();
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
    if ((m = path.match(/^\/api\/eventos\/(\d+)\/custos$/))) {
      if (!admin) return negado();
      const eid = +m[1];
      if (method === "GET") {
        const { results } = await db.prepare(`
          SELECT c.*, f.nome AS fornecedor_nome
          FROM custos c LEFT JOIN fornecedores f ON f.id=c.fornecedor_id
          WHERE c.evento_id=? ORDER BY c.ordem, c.id`).bind(eid).all();
        const { results: staff } = await db.prepare(
          "SELECT id, nome, grupo, pacote FROM clientes WHERE evento_id=? AND staff=1 ORDER BY nome COLLATE NOCASE").bind(eid).all();
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
                              forma_pagamento, parcelas, valor_pago, observacoes, atualizado_por)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
          eid, ordem, c.item, c.categoria ?? "", c.quantidade ?? 1, c.valor ?? null,
          c.fornecedor_id ?? null, c.status ?? "pendente", c.forma_pagamento ?? "", c.parcelas ?? null,
          c.valor_pago ?? 0, c.observacoes ?? "", S(b.atualizado_por, 60)).run();
        return json({ ok: true, id: r.meta.last_row_id });
      }
    }
    if ((m = path.match(/^\/api\/custos\/(\d+)$/))) {
      if (!admin) return negado();
      const id = +m[1];
      if (method === "PATCH") {
        const b = await request.json().catch(() => ({}));
        if (!await upd(db, "custos", id, limparCusto(b), `, atualizado_em=datetime('now'), atualizado_por='${S(b.atualizado_por,60).replace(/'/g,"''")}'`))
          return json({ erro: "nada para atualizar" }, 400);
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await db.prepare("DELETE FROM custos WHERE id=?").bind(id).run();
        return json({ ok: true });
      }
    }

    return json({ erro: "não encontrado" }, 404);
  },
};
