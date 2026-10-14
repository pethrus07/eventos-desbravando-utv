/* Preâmbulo do esbuild, preservado da versão publicada — ver tools/recuperar-da-producao.mjs */
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

var enc = new TextEncoder();
var dec = new TextDecoder();
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization,mcp-protocol-version"
};
var jsonHdr = { "content-type": "application/json; charset=utf-8", ...CORS };
function b64urlBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(b64urlBytes, "b64urlBytes");
function bytesFromB64url(str) {
  str = String(str).replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
__name(bytesFromB64url, "bytesFromB64url");
function randToken(n = 32) {
  const u = new Uint8Array(n);
  crypto.getRandomValues(u);
  return b64urlBytes(u);
}
__name(randToken, "randToken");
async function hmac(data, key) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64urlBytes(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data))));
}
__name(hmac, "hmac");
async function sha256b64url(data) {
  return b64urlBytes(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(data))));
}
__name(sha256b64url, "sha256b64url");
function signingKey(env) {
  return env.MCP_SIGNING_KEY || env.APP_KEY || "dev-mcp-key";
}
__name(signingKey, "signingKey");
async function makeToken(payload, env) {
  const body = b64urlBytes(enc.encode(JSON.stringify(payload)));
  return body + "." + await hmac(body, signingKey(env));
}
__name(makeToken, "makeToken");
async function readToken(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  if (await hmac(parts[0], signingKey(env)) !== parts[1]) return null;
  try {
    const p = JSON.parse(dec.decode(bytesFromB64url(parts[0])));
    if (p.exp && p.exp * 1e3 < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
__name(readToken, "readToken");
function hhmmMin(s) {
  const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/);
  return m ? +m[1] * 60 + +m[2] : null;
}
__name(hhmmMin, "hhmmMin");
function minHhmm(t) {
  t = (t % 1440 + 1440) % 1440;
  return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
}
__name(minHhmm, "minHhmm");
var TOOLS = [
  // ----- Panorama -----
  {
    name: "listar_expedicoes",
    role: "both",
    description: "Lista as expedi\xE7\xF5es ativas com progresso do CHECKLIST (itens conclu\xEDdos) e quantos itens t\xEAm no m\xF3dulo novo (Ciclo). Comece sempre por aqui para achar o evento_id.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "resumo_expedicao",
    role: "both",
    description: "Resumo de uma expedi\xE7\xE3o: progresso do checklist, das 7 etapas do Ciclo, Opera\xE7\xE3o em Campo, contagem de participantes e (s\xF3 admin) custo total.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] }
  },
  // ----- Checklist (a operação real de hoje; ambos os papéis) -----
  {
    name: "ver_checklist",
    role: "both",
    description: "Itens do CHECKLIST de uma expedi\xE7\xE3o \u2014 \xE9 onde est\xE1 a opera\xE7\xE3o real hoje. Traz dia, item, setor, status, respons\xE1vel, hor\xE1rio, fornecedor, prazo e subtarefas. Filtra por dia/status/setor.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, dia: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, setor: { type: "string" } }, required: ["evento_id"] }
  },
  {
    name: "marcar_item_checklist",
    role: "both",
    description: "Muda o status de um item do checklist (afazer/andamento/concluido).",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] } }, required: ["item_id", "status"] }
  },
  {
    name: "concluir_subitem_checklist",
    role: "both",
    description: "Marca/desmarca uma subtarefa de um item do checklist.",
    inputSchema: { type: "object", properties: { subitem_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["subitem_id", "concluido"] }
  },
  {
    name: "criar_item_checklist",
    role: "both",
    description: "Adiciona um item ao checklist de uma expedi\xE7\xE3o.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, item: { type: "string" }, dia: { type: "string" }, setor: { type: "string" }, responsavel: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, horario: { type: "string" }, fornecedor: { type: "string" }, quantidade: { type: "string" }, observacoes: { type: "string" } }, required: ["evento_id", "item"] }
  },
  {
    name: "editar_item_checklist",
    role: "both",
    description: "Edita campos de um item do checklist (item, dia, setor, respons\xE1vel, status, hor\xE1rio, fornecedor, quantidade, observa\xE7\xF5es; valor s\xF3 admin).",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, item: { type: "string" }, dia: { type: "string" }, setor: { type: "string" }, responsavel: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, horario: { type: "string" }, fornecedor: { type: "string" }, quantidade: { type: "string" }, observacoes: { type: "string" }, valor: { type: "number" } }, required: ["item_id"] }
  },
  {
    name: "excluir_item_checklist",
    role: "both",
    description: "Exclui um item do checklist (e suas subtarefas).",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" } }, required: ["item_id"] }
  },
  {
    name: "criar_subitem_checklist",
    role: "both",
    description: "Adiciona uma subtarefa a um item do checklist.",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, titulo: { type: "string" } }, required: ["item_id", "titulo"] }
  },
  {
    name: "excluir_subitem_checklist",
    role: "both",
    description: "Exclui uma subtarefa de um item do checklist.",
    inputSchema: { type: "object", properties: { subitem_id: { type: "integer" } }, required: ["subitem_id"] }
  },
  // ----- Tarefas gerais (fora das expedições) -----
  {
    name: "listar_tarefas",
    role: "both",
    description: "Lista as tarefas gerais (n\xE3o ligadas a uma expedi\xE7\xE3o), com subtarefas.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "criar_tarefa",
    role: "both",
    description: "Cria uma tarefa geral.",
    inputSchema: { type: "object", properties: { titulo: { type: "string" }, setor: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, prioridade: { type: "integer" }, data_limite: { type: "string" }, responsavel: { type: "string" }, horario: { type: "string" }, observacoes: { type: "string" } }, required: ["titulo"] }
  },
  {
    name: "editar_tarefa",
    role: "both",
    description: "Edita uma tarefa geral (t\xEDtulo, setor, status, prioridade, prazo, respons\xE1vel, hor\xE1rio, observa\xE7\xF5es).",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" }, titulo: { type: "string" }, setor: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, prioridade: { type: "integer" }, data_limite: { type: "string" }, responsavel: { type: "string" }, horario: { type: "string" }, observacoes: { type: "string" } }, required: ["tarefa_id"] }
  },
  {
    name: "excluir_tarefa",
    role: "both",
    description: "Exclui uma tarefa geral (e suas subtarefas).",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" } }, required: ["tarefa_id"] }
  },
  {
    name: "criar_subtarefa",
    role: "both",
    description: "Adiciona uma subtarefa a uma tarefa geral.",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" }, titulo: { type: "string" } }, required: ["tarefa_id", "titulo"] }
  },
  {
    name: "marcar_subtarefa",
    role: "both",
    description: "Marca/desmarca uma subtarefa de uma tarefa geral.",
    inputSchema: { type: "object", properties: { subtarefa_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["subtarefa_id", "concluido"] }
  },
  {
    name: "excluir_subtarefa",
    role: "both",
    description: "Exclui uma subtarefa de uma tarefa geral.",
    inputSchema: { type: "object", properties: { subtarefa_id: { type: "integer" } }, required: ["subtarefa_id"] }
  },
  // ----- Ciclo Operacional: Etapa → Categoria → Tópico → Tarefas (checklist) -----
  {
    name: "listar_etapas",
    role: "both",
    description: "Lista as etapas cadastradas do Sistema Operacional (nome, se est\xE1 ativa, se abre a tela de Opera\xE7\xE3o em Campo). Use antes de criar_item_ciclo pra saber o nome exato da etapa.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "listar_categorias",
    role: "both",
    description: "Lista as categorias cadastradas do Sistema Operacional (nome, se est\xE1 ativa). Use antes de criar_item_ciclo pra saber o nome exato da categoria.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "listar_itens_ciclo",
    role: "both",
    description: "T\xF3picos do Ciclo de uma expedi\xE7\xE3o (nome, categoria, respons\xE1vel, status, prazo) com seu checklist de tarefas. Filtra por etapa (nome, use listar_etapas pra ver as op\xE7\xF5es).",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, etapa: { type: "string" } }, required: ["evento_id"] }
  },
  {
    name: "criar_item_ciclo",
    role: "both",
    description: "Cria um t\xF3pico no Ciclo (nome+etapa+categoria, respons\xE1vel/prazo opcionais). etapa e categoria s\xE3o pelo nome cadastrado (veja listar_etapas/listar_categorias).",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, etapa: { type: "string" }, categoria: { type: "string" }, nome: { type: "string" }, responsavel: { type: "string" }, data_limite: { type: "string" } }, required: ["evento_id", "etapa", "nome"] }
  },
  {
    name: "editar_item_ciclo",
    role: "both",
    description: "Edita campos de um t\xF3pico do Ciclo (respons\xE1vel, prazo, observa\xE7\xF5es). O status do t\xF3pico n\xE3o \xE9 edit\xE1vel \u2014 ele reflete automaticamente as tarefas dele (use marcar_tarefa_ciclo).",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, responsavel: { type: "string" }, data_limite: { type: "string" }, observacoes: { type: "string" } }, required: ["item_id"] }
  },
  {
    name: "criar_tarefa_ciclo",
    role: "both",
    description: "Adiciona uma tarefa (linha do checklist) a um t\xF3pico do Ciclo.",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, titulo: { type: "string" }, responsavel: { type: "string" }, data_limite: { type: "string" } }, required: ["item_id", "titulo"] }
  },
  {
    name: "marcar_tarefa_ciclo",
    role: "both",
    description: "Marca/desmarca uma tarefa (linha do checklist) de um t\xF3pico do Ciclo como conclu\xEDda.",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["tarefa_id", "concluido"] }
  },
  {
    name: "excluir_tarefa_ciclo",
    role: "both",
    description: "Exclui uma tarefa (linha do checklist) de um t\xF3pico do Ciclo.",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" } }, required: ["tarefa_id"] }
  },
  // ----- Operação em Campo + Agenda -----
  {
    name: "ver_campo",
    role: "both",
    description: "Opera\xE7\xE3o em Campo: dias, tarefas cronol\xF3gicas (previsto/realizado, tipo, status).",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] }
  },
  {
    name: "agenda_do_dia",
    role: "both",
    description: "Agenda cronol\xF3gica: tarefas de campo + entregas (Execu\xE7\xE3o) com hor\xE1rio. Filtra por dia.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, dia: { type: "string" } }, required: ["evento_id"] }
  },
  {
    name: "registrar_horario_realizado",
    role: "both",
    description: "Registra o hor\xE1rio real de uma tarefa de campo e conclui; com reajustar=true, cascateia o atraso/adianto nas pr\xF3ximas tarefas Ajust\xE1veis.",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" }, h_realizado: { type: "string", description: "HH:MM" }, reajustar: { type: "boolean" } }, required: ["tarefa_id", "h_realizado"] }
  },
  {
    name: "concluir_subtarefa_campo",
    role: "both",
    description: "Marca/desmarca uma subtarefa (check) de uma tarefa de campo.",
    inputSchema: { type: "object", properties: { sub_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["sub_id", "concluido"] }
  },
  {
    name: "criar_dia_campo",
    role: "both",
    description: "Cria um dia na Opera\xE7\xE3o em Campo de uma expedi\xE7\xE3o.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, rotulo: { type: "string" }, data: { type: "string" } }, required: ["evento_id", "rotulo"] }
  },
  {
    name: "criar_tarefa_campo",
    role: "both",
    description: "Cria uma tarefa cronol\xF3gica num dia da Opera\xE7\xE3o em Campo.",
    inputSchema: { type: "object", properties: { dia_id: { type: "integer" }, nome: { type: "string" }, h_planejado: { type: "string" }, tipo: { type: "string", enum: ["ajustavel", "fixa"] }, responsavel: { type: "string" }, data_limite: { type: "string" } }, required: ["dia_id", "nome"] }
  },
  // ----- Dados sensíveis (só chave ADMIN) -----
  {
    name: "listar_participantes",
    role: "admin",
    description: "[admin] Participantes de uma expedi\xE7\xE3o, com dados pessoais: nome, CPF, telefone, grupo, tipo, UTV, camiseta, contrato e pacote.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] }
  },
  {
    name: "ver_custos",
    role: "admin",
    description: "[admin] Custos de uma expedi\xE7\xE3o (item, categoria, valor, status, pago, fornecedor) e o total.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] }
  },
  {
    name: "listar_fornecedores",
    role: "admin",
    description: "[admin] Fornecedores cadastrados (globais), com contato e cidade.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "ver_crm",
    role: "admin",
    description: "[admin] Contatos do CRM (leads/clientes): nome, telefone, cidade, etapa do funil, interesse e pr\xF3xima a\xE7\xE3o. Filtra por etapa.",
    inputSchema: { type: "object", properties: { etapa: { type: "string", enum: ["lead", "contato", "proposta", "confirmado", "pos_evento", "perdido"] } } }
  }
];
function toolsParaPapel(papel2) {
  return TOOLS.filter((t) => t.role !== "admin" || papel2 === "admin").map(({ role, ...t }) => t);
}
__name(toolsParaPapel, "toolsParaPapel");
async function recomputeItemStatus(db, itemId) {
  const { results } = await db.prepare("SELECT status FROM op_tarefas WHERE item_id=?").bind(itemId).all();
  const novo = results.length && results.every((t) => t.status === "concluido") ? "concluido" : "afazer";
  await db.prepare("UPDATE op_itens SET status=? WHERE id=?").bind(novo, itemId).run();
}
__name(recomputeItemStatus, "recomputeItemStatus");
async function runTool(name, args, env, papel2) {
  const db = env.DB;
  const admin = papel2 === "admin";
  const eid = args && args.evento_id != null ? parseInt(args.evento_id, 10) : null;
  switch (name) {
    case "listar_expedicoes": {
      const { results } = await db.prepare(`
        SELECT e.id, e.nome,
          (SELECT COUNT(*) FROM itens i WHERE i.evento_id=e.id) AS checklist,
          (SELECT COUNT(*) FROM itens i WHERE i.evento_id=e.id AND i.status='concluido') AS checklist_ok,
          (SELECT COUNT(*) FROM op_itens o WHERE o.evento_id=e.id) AS itens_ciclo
        FROM eventos e WHERE e.arquivado=0 ORDER BY e.id DESC`).all();
      return (results || []).map((r) => ({
        id: r.id,
        nome: r.nome,
        checklist_total: r.checklist,
        checklist_concluidos: r.checklist_ok,
        checklist_progresso: r.checklist ? Math.round(r.checklist_ok / r.checklist * 100) + "%" : "\u2014",
        itens_no_ciclo_novo: r.itens_ciclo
      }));
    }
    case "resumo_expedicao": {
      const ev = await db.prepare("SELECT id, nome FROM eventos WHERE id=?").bind(eid).first();
      if (!ev) throw new Error("expedi\xE7\xE3o n\xE3o encontrada");
      const chk = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) AS ok, SUM(CASE WHEN status='andamento' THEN 1 ELSE 0 END) AS andamento FROM itens WHERE evento_id=?").bind(eid).first();
      const { results: et } = await db.prepare(`
        SELECT o.etapa, COUNT(DISTINCT o.id) AS topicos, COUNT(t.id) AS tarefas,
          SUM(CASE WHEN t.concluido=1 THEN 1 ELSE 0 END) AS tarefas_ok
        FROM op_itens o LEFT JOIN op_tarefas t ON t.item_id=o.id WHERE o.evento_id=? GROUP BY o.etapa`).bind(eid).all();
      const campo = await db.prepare(`
        SELECT COUNT(DISTINCT d.id) AS dias, COUNT(t.id) AS tarefas,
          SUM(CASE WHEN t.status='concluido' THEN 1 ELSE 0 END) AS tarefas_ok
        FROM campo_dias d LEFT JOIN campo_tarefas t ON t.dia_id=d.id WHERE d.evento_id=?`).bind(eid).first();
      const p = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN tipo='crianca' THEN 1 ELSE 0 END) AS criancas, SUM(CASE WHEN staff=1 THEN 1 ELSE 0 END) AS staff FROM clientes WHERE evento_id=?").bind(eid).first();
      const out = {
        expedicao: ev,
        checklist: { total: chk.total || 0, concluidos: chk.ok || 0, em_andamento: chk.andamento || 0 },
        ciclo_novo_por_etapa: et,
        operacao_campo: campo,
        participantes: { total: p.total || 0, criancas: p.criancas || 0, staff: p.staff || 0 }
      };
      if (admin) {
        const c = await db.prepare("SELECT COALESCE(SUM(valor),0) AS total, COALESCE(SUM(valor_pago),0) AS pago FROM custos WHERE evento_id=?").bind(eid).first();
        out.custos = { total: c.total || 0, pago: c.pago || 0 };
      }
      return out;
    }
    case "ver_checklist": {
      let sql = "SELECT id, dia, item, setor, status, prioridade, responsavel, data_limite, horario, fornecedor, quantidade, observacoes" + (admin ? ", valor" : "") + " FROM itens WHERE evento_id=?";
      const bind = [eid];
      if (args.dia) {
        sql += " AND dia=?";
        bind.push(String(args.dia));
      }
      if (args.status) {
        sql += " AND status=?";
        bind.push(String(args.status));
      }
      if (args.setor) {
        sql += " AND setor=?";
        bind.push(String(args.setor));
      }
      sql += " ORDER BY ordem, id";
      const { results } = await db.prepare(sql).bind(...bind).all();
      const { results: subs } = await db.prepare(
        "SELECT s.id, s.item_id, s.titulo, s.concluido FROM subitens s JOIN itens i ON i.id=s.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id"
      ).bind(eid).all();
      const sp = {};
      for (const s of subs || []) (sp[s.item_id] = sp[s.item_id] || []).push({ id: s.id, titulo: s.titulo, concluido: !!s.concluido });
      return (results || []).map((i) => ({ ...i, subitens: sp[i.id] || [] }));
    }
    case "marcar_item_checklist": {
      if (!["afazer", "andamento", "concluido"].includes(args.status)) throw new Error("status inv\xE1lido");
      const r = await db.prepare("UPDATE itens SET status=?, atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?").bind(args.status, parseInt(args.item_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "concluir_subitem_checklist": {
      const r = await db.prepare("UPDATE subitens SET concluido=? WHERE id=?").bind(args.concluido ? 1 : 0, parseInt(args.subitem_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "listar_participantes": {
      const { results } = await db.prepare(`
        SELECT c.id, c.grupo, c.nome, c.cpf, c.telefone, c.tipo, c.camiseta, c.utv, c.nf,
               c.contrato_enviado, c.contrato_assinado, c.staff,
               COALESCE(fr.valor_previsto, c.pacote) AS pacote,
               (SELECT COALESCE(SUM(p.valor),0) FROM pagamentos p WHERE p.cliente_id=c.id) AS pago
        FROM clientes c LEFT JOIN financeiro_receber fr ON fr.cliente_id=c.id
        WHERE c.evento_id=? ORDER BY c.grupo, c.nome`).bind(eid).all();
      return results || [];
    }
    case "ver_custos": {
      const { results } = await db.prepare(`
        SELECT c.id, c.item, c.categoria, c.quantidade, c.valor, c.status, c.valor_pago, c.forma_pagamento, f.nome AS fornecedor
        FROM custos c LEFT JOIN fornecedores f ON f.id=c.fornecedor_id WHERE c.evento_id=? ORDER BY c.ordem, c.id`).bind(eid).all();
      const total = (results || []).reduce((a, x) => a + (x.valor || 0), 0);
      const pago = (results || []).reduce((a, x) => a + (x.valor_pago || 0), 0);
      return { total, pago, custos: results || [] };
    }
    case "listar_fornecedores": {
      const { results } = await db.prepare("SELECT id, nome, categoria, contato, telefone, cidade FROM fornecedores ORDER BY nome COLLATE NOCASE").all();
      return results || [];
    }
    case "listar_etapas": {
      const { results } = await db.prepare("SELECT id, nome, ativo, redireciona_campo FROM etapas ORDER BY ordem, id").all();
      return results || [];
    }
    case "listar_categorias": {
      const { results } = await db.prepare("SELECT id, nome, ativo FROM categorias ORDER BY ordem, id").all();
      return results || [];
    }
    case "ver_crm": {
      let sql = "SELECT id, nome, grupo, telefone, cidade, origem, etapa, interesse, valor_potencial, proxima_acao, proxima_data FROM crm_contatos";
      const bind = [];
      if (args.etapa) {
        sql += " WHERE etapa=?";
        bind.push(String(args.etapa));
      }
      sql += " ORDER BY nome COLLATE NOCASE";
      const { results } = await db.prepare(sql).bind(...bind).all();
      return results || [];
    }
    case "agenda_do_dia": {
      const { results: ct } = await db.prepare(`
        SELECT t.id, t.nome, t.h_planejado AS horario, t.h_realizado, t.tipo, t.status, d.rotulo AS dia, d.ordem AS dia_ordem
        FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=?`).bind(eid).all();
      let ent = (ct || []).map((t) => ({ origem: "campo", id: t.id, dia: t.dia, dia_ordem: t.dia_ordem, horario: t.horario, h_realizado: t.h_realizado, nome: t.nome, tipo: t.tipo, status: t.status }));
      const dia = args && args.dia ? String(args.dia).toLowerCase() : null;
      if (dia) ent = ent.filter((e) => String(e.dia).toLowerCase().includes(dia));
      ent.sort((a, b) => a.dia_ordem - b.dia_ordem || String(a.dia).localeCompare(String(b.dia)) || String(a.horario).localeCompare(String(b.horario)));
      return ent;
    }
    case "listar_itens_ciclo": {
      let sql = "SELECT id, etapa, categoria, etapa_id, categoria_id, nome, responsavel, status, data_limite, homologado FROM op_itens WHERE evento_id=?";
      const bind = [eid];
      if (args && args.etapa) {
        const et = await db.prepare("SELECT id FROM etapas WHERE nome=? COLLATE NOCASE").bind(String(args.etapa)).first();
        if (!et) throw new Error("etapa n\xE3o encontrada \u2014 use listar_etapas pra ver os nomes cadastrados");
        sql += " AND etapa_id=?";
        bind.push(et.id);
      }
      sql += " ORDER BY ordem, id";
      const { results: itens } = await db.prepare(sql).bind(...bind).all();
      const { results: tarefas } = await db.prepare(
        "SELECT t.id, t.item_id, t.titulo, t.concluido FROM op_tarefas t JOIN op_itens o ON o.id=t.item_id WHERE o.evento_id=? ORDER BY t.ordem"
      ).bind(eid).all();
      const tp = {};
      for (const t of tarefas || []) (tp[t.item_id] = tp[t.item_id] || []).push({ tarefa_id: t.id, titulo: t.titulo, concluido: !!t.concluido });
      return (itens || []).map((i) => ({ ...i, tarefas: tp[i.id] || [] }));
    }
    case "ver_campo": {
      const { results: dias } = await db.prepare("SELECT id, rotulo, ordem FROM campo_dias WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
      const { results: tar } = await db.prepare(
        "SELECT t.id, t.dia_id, t.nome, t.h_planejado, t.h_realizado, t.tipo, t.status FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY t.ordem, t.id"
      ).bind(eid).all();
      const tp = {};
      for (const t of tar || []) (tp[t.dia_id] = tp[t.dia_id] || []).push(t);
      return (dias || []).map((d) => ({ ...d, tarefas: tp[d.id] || [] }));
    }
    case "criar_item_ciclo": {
      const et = await db.prepare("SELECT id, nome FROM etapas WHERE nome=? COLLATE NOCASE AND ativo=1").bind(String(args.etapa || "")).first();
      if (!et) throw new Error("etapa n\xE3o encontrada (ou inativa) \u2014 use listar_etapas pra ver os nomes cadastrados");
      let cat = null;
      if (args.categoria) {
        cat = await db.prepare("SELECT id, nome FROM categorias WHERE nome=? COLLATE NOCASE AND ativo=1").bind(String(args.categoria)).first();
        if (!cat) throw new Error("categoria n\xE3o encontrada (ou inativa) \u2014 use listar_categorias pra ver os nomes cadastrados");
      }
      const nome = String(args.nome || "").slice(0, 200).trim();
      if (!nome) throw new Error("informe o nome do t\xF3pico");
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_itens WHERE evento_id=?").bind(eid).first();
      const r = await db.prepare(`
        INSERT INTO op_itens (evento_id, etapa, categoria, etapa_id, categoria_id, nome, ordem, responsavel, data_limite, atualizado_por)
        VALUES (?,?,?,?,?,?,?,?,?, 'Claude')`).bind(
        eid,
        et.nome,
        cat ? cat.nome : "",
        et.id,
        cat ? cat.id : null,
        nome,
        (mx ? mx.mo : 0) + 1,
        String(args.responsavel || "").slice(0, 120),
        String(args.data_limite || "").slice(0, 20)
      ).run();
      return { ok: true, item_id: r.meta.last_row_id };
    }
    case "editar_item_ciclo": {
      const iid = parseInt(args.item_id, 10);
      const sets = [], bind = [];
      if ("responsavel" in args) {
        sets.push("responsavel=?");
        bind.push(String(args.responsavel).slice(0, 120));
      }
      if ("data_limite" in args) {
        sets.push("data_limite=?");
        bind.push(String(args.data_limite).slice(0, 20));
      }
      if ("observacoes" in args) {
        sets.push("observacoes=?");
        bind.push(String(args.observacoes).slice(0, 600));
      }
      if (!sets.length) throw new Error("nada para atualizar");
      bind.push(iid);
      const r = await db.prepare(`UPDATE op_itens SET ${sets.join(", ")}, atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?`).bind(...bind).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "criar_tarefa_ciclo": {
      const titulo = String(args.titulo || "").slice(0, 300).trim();
      if (!titulo) throw new Error("informe o t\xEDtulo da tarefa");
      const iid = parseInt(args.item_id, 10);
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_tarefas WHERE item_id=?").bind(iid).first();
      const r = await db.prepare("INSERT INTO op_tarefas (item_id, ordem, titulo, responsavel, data_limite) VALUES (?,?,?,?,?)").bind(iid, (mx ? mx.mo : 0) + 1, titulo, String(args.responsavel || ""), String(args.data_limite || "")).run();
      await recomputeItemStatus(db, iid);
      return { ok: true, tarefa_id: r.meta.last_row_id };
    }
    case "marcar_tarefa_ciclo": {
      const concluido = args.concluido ? 1 : 0;
      const tid = parseInt(args.tarefa_id, 10);
      const antes = await db.prepare("SELECT item_id FROM op_tarefas WHERE id=?").bind(tid).first();
      const r = await db.prepare("UPDATE op_tarefas SET concluido=?, status=? WHERE id=?").bind(concluido, concluido ? "concluido" : "afazer", tid).run();
      if (antes) await recomputeItemStatus(db, antes.item_id);
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "excluir_tarefa_ciclo": {
      const tid = parseInt(args.tarefa_id, 10);
      const antes = await db.prepare("SELECT item_id FROM op_tarefas WHERE id=?").bind(tid).first();
      const r = await db.prepare("DELETE FROM op_tarefas WHERE id=?").bind(tid).run();
      if (antes) await recomputeItemStatus(db, antes.item_id);
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "registrar_horario_realizado": {
      const id = parseInt(args.tarefa_id, 10);
      const t = await db.prepare("SELECT t.*, d.evento_id AS eid FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE t.id=?").bind(id).first();
      if (!t) throw new Error("tarefa n\xE3o encontrada");
      const hr = String(args.h_realizado || "").slice(0, 20);
      await db.prepare("UPDATE campo_tarefas SET h_realizado=?, status='concluido', atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?").bind(hr, id).run();
      let reajustadas = 0;
      const pm = hhmmMin(t.h_planejado), rm = hhmmMin(hr);
      if (args.reajustar && pm != null && rm != null && rm !== pm) {
        const delta = rm - pm;
        const { results } = await db.prepare(
          "SELECT t.id, t.tipo, t.h_planejado FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY d.ordem, t.ordem, t.id"
        ).bind(t.eid).all();
        let passou = false;
        for (const r of results || []) {
          if (r.id === id) {
            passou = true;
            continue;
          }
          if (!passou || r.tipo !== "ajustavel") continue;
          const bm = hhmmMin(r.h_planejado);
          if (bm == null) continue;
          await db.prepare("UPDATE campo_tarefas SET h_planejado=?, atualizado_em=datetime('now') WHERE id=?").bind(minHhmm(bm + delta), r.id).run();
          reajustadas++;
        }
      }
      return { ok: true, reajustadas };
    }
    case "concluir_subtarefa_campo": {
      const r = await db.prepare("UPDATE campo_subtarefas SET concluido=? WHERE id=?").bind(args.concluido ? 1 : 0, parseInt(args.sub_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    // ---- Checklist CRUD ----
    case "criar_item_checklist": {
      const item = String(args.item || "").slice(0, 300).trim();
      if (!item) throw new Error("informe o item");
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM itens WHERE evento_id=?").bind(eid).first();
      const st = ["afazer", "andamento", "concluido"].includes(args.status) ? args.status : "afazer";
      const r = await db.prepare("INSERT INTO itens (evento_id, ordem, dia, item, setor, status, responsavel, horario, fornecedor, quantidade, observacoes, atualizado_por) VALUES (?,?,?,?,?,?,?,?,?,?,?, 'Claude')").bind(eid, (mx ? mx.mo : 0) + 1, String(args.dia || ""), item, String(args.setor || ""), st, String(args.responsavel || ""), String(args.horario || ""), String(args.fornecedor || ""), String(args.quantidade || ""), String(args.observacoes || "")).run();
      return { ok: true, item_id: r.meta.last_row_id };
    }
    case "editar_item_checklist": {
      const o = {};
      for (const c of ["item", "dia", "setor", "responsavel", "horario", "fornecedor", "quantidade", "observacoes"]) if (c in args) o[c] = String(args[c] || "").slice(0, 600);
      if ("status" in args && ["afazer", "andamento", "concluido"].includes(args.status)) o.status = args.status;
      if (admin && "valor" in args) o.valor = args.valor == null ? null : Number(args.valor);
      const keys = Object.keys(o);
      if (!keys.length) throw new Error("nada para atualizar");
      const r = await db.prepare(`UPDATE itens SET ${keys.map((k) => k + "=?").join(", ")}, atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?`).bind(...keys.map((k) => o[k]), parseInt(args.item_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "excluir_item_checklist": {
      const id = parseInt(args.item_id, 10);
      await db.prepare("DELETE FROM subitens WHERE item_id=?").bind(id).run();
      const r = await db.prepare("DELETE FROM itens WHERE id=?").bind(id).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "criar_subitem_checklist": {
      const t = String(args.titulo || "").slice(0, 200).trim();
      if (!t) throw new Error("informe o t\xEDtulo");
      const iid = parseInt(args.item_id, 10);
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subitens WHERE item_id=?").bind(iid).first();
      const r = await db.prepare("INSERT INTO subitens (item_id, ordem, titulo, concluido) VALUES (?,?,?,0)").bind(iid, (mx ? mx.mo : 0) + 1, t).run();
      return { ok: true, subitem_id: r.meta.last_row_id };
    }
    case "excluir_subitem_checklist": {
      const r = await db.prepare("DELETE FROM subitens WHERE id=?").bind(parseInt(args.subitem_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    // ---- Tarefas gerais ----
    case "listar_tarefas": {
      const { results } = await db.prepare("SELECT * FROM tarefas ORDER BY CASE status WHEN 'concluido' THEN 1 ELSE 0 END, ordem, COALESCE(prioridade,999), id").all();
      const { results: subs } = await db.prepare("SELECT * FROM subtarefas ORDER BY ordem, id").all();
      const sp = {};
      for (const s of subs || []) (sp[s.tarefa_id] = sp[s.tarefa_id] || []).push({ id: s.id, titulo: s.titulo, concluido: !!s.concluido });
      return (results || []).map((t) => ({ id: t.id, titulo: t.titulo, setor: t.setor, status: t.status, prioridade: t.prioridade, data_limite: t.data_limite, responsavel: t.responsavel, horario: t.horario, observacoes: t.observacoes, subtarefas: sp[t.id] || [] }));
    }
    case "criar_tarefa": {
      const tit = String(args.titulo || "").slice(0, 300).trim();
      if (!tit) throw new Error("informe o t\xEDtulo");
      const st = ["afazer", "andamento", "concluido"].includes(args.status) ? args.status : "afazer";
      const r = await db.prepare("INSERT INTO tarefas (titulo, setor, status, prioridade, data_limite, responsavel, horario, observacoes, atualizado_por) VALUES (?,?,?,?,?,?,?,?, 'Claude')").bind(tit, String(args.setor || ""), st, args.prioridade != null ? parseInt(args.prioridade, 10) : null, String(args.data_limite || ""), String(args.responsavel || ""), String(args.horario || ""), String(args.observacoes || "")).run();
      return { ok: true, tarefa_id: r.meta.last_row_id };
    }
    case "editar_tarefa": {
      const o = {};
      for (const c of ["titulo", "setor", "data_limite", "responsavel", "horario", "observacoes"]) if (c in args) o[c] = String(args[c] || "").slice(0, 600);
      if ("status" in args && ["afazer", "andamento", "concluido"].includes(args.status)) o.status = args.status;
      if ("prioridade" in args) o.prioridade = args.prioridade == null ? null : parseInt(args.prioridade, 10);
      const keys = Object.keys(o);
      if (!keys.length) throw new Error("nada para atualizar");
      const r = await db.prepare(`UPDATE tarefas SET ${keys.map((k) => k + "=?").join(", ")}, atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?`).bind(...keys.map((k) => o[k]), parseInt(args.tarefa_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "excluir_tarefa": {
      const id = parseInt(args.tarefa_id, 10);
      await db.prepare("DELETE FROM subtarefas WHERE tarefa_id=?").bind(id).run();
      const r = await db.prepare("DELETE FROM tarefas WHERE id=?").bind(id).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "criar_subtarefa": {
      const t = String(args.titulo || "").slice(0, 200).trim();
      if (!t) throw new Error("informe o t\xEDtulo");
      const tid = parseInt(args.tarefa_id, 10);
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM subtarefas WHERE tarefa_id=?").bind(tid).first();
      const r = await db.prepare("INSERT INTO subtarefas (tarefa_id, ordem, titulo, concluido) VALUES (?,?,?,0)").bind(tid, (mx ? mx.mo : 0) + 1, t).run();
      return { ok: true, subtarefa_id: r.meta.last_row_id };
    }
    case "marcar_subtarefa": {
      const r = await db.prepare("UPDATE subtarefas SET concluido=? WHERE id=?").bind(args.concluido ? 1 : 0, parseInt(args.subtarefa_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "excluir_subtarefa": {
      const r = await db.prepare("DELETE FROM subtarefas WHERE id=?").bind(parseInt(args.subtarefa_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    // ---- Operação em Campo: criar ----
    case "criar_dia_campo": {
      const rot = String(args.rotulo || "").slice(0, 160).trim();
      if (!rot) throw new Error("informe o r\xF3tulo");
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM campo_dias WHERE evento_id=?").bind(eid).first();
      const r = await db.prepare("INSERT INTO campo_dias (evento_id, rotulo, data, ordem) VALUES (?,?,?,?)").bind(eid, rot, String(args.data || ""), (mx ? mx.mo : 0) + 1).run();
      return { ok: true, dia_id: r.meta.last_row_id };
    }
    case "criar_tarefa_campo": {
      const nome = String(args.nome || "").slice(0, 200).trim();
      if (!nome) throw new Error("informe o nome");
      const did = parseInt(args.dia_id, 10);
      const tipo = ["ajustavel", "fixa"].includes(args.tipo) ? args.tipo : "ajustavel";
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM campo_tarefas WHERE dia_id=?").bind(did).first();
      const r = await db.prepare("INSERT INTO campo_tarefas (dia_id, nome, h_planejado, tipo, status, ordem, responsavel, data_limite, atualizado_por) VALUES (?,?,?,?, 'afazer', ?, ?, ?, 'Claude')").bind(did, nome, String(args.h_planejado || ""), tipo, (mx ? mx.mo : 0) + 1, String(args.responsavel || ""), String(args.data_limite || "")).run();
      return { ok: true, tarefa_id: r.meta.last_row_id };
    }
    default:
      throw new Error("ferramenta desconhecida: " + name);
  }
}
__name(runTool, "runTool");
function papelDaChave(chave, env) {
  if (env.APP_KEY && chave === env.APP_KEY) return "admin";
  if (env.TEAM_KEY && chave === env.TEAM_KEY) return "equipe";
  return null;
}
__name(papelDaChave, "papelDaChave");
function telaLogin(origin, params, erro) {
  const hidden = ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "scope", "response_type", "resource"].map((k) => `<input type="hidden" name="${k}" value="${escAttr(params.get(k) || "")}">`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar ao Claude \xB7 Desbravando</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0B0B0B;color:#fff;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{width:100%;max-width:400px;background:#171717;border:1px solid #2B2B2B;border-radius:18px;padding:30px 26px}
.brand{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#8A8A8A;margin-bottom:12px}
h1{font-size:26px;line-height:1.1;margin-bottom:8px}
p{color:#C7C7C7;font-size:14px;margin-bottom:18px}
label{display:block;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8A8A8A;margin:0 0 6px}
input[type=password]{width:100%;background:#0F0F0F;border:1px solid #2B2B2B;color:#fff;border-radius:10px;padding:12px 13px;font-size:15px}
input[type=password]:focus{outline:none;border-color:#fff}
button{width:100%;margin-top:18px;background:#fff;color:#000;border:none;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer}
.erro{background:#2a1414;border:1px solid #6b2222;color:#EB5757;border-radius:10px;padding:10px 12px;font-size:13px;margin-bottom:14px;font-weight:600}
.foot{color:#5E5E5E;font-size:12px;margin-top:16px;text-align:center}
</style></head><body>
<form class="box" method="POST" action="${origin}/oauth/authorize">
  <div class="brand">Desbravando UTV</div>
  <h1>Conectar ao Claude</h1>
  <p>Autorize o Claude a acessar o sistema operacional das expedi\xE7\xF5es. Informe a chave de acesso da equipe.</p>
  ${erro ? `<div class="erro">${escAttr(erro)}</div>` : ""}
  <label for="chave">Chave de acesso</label>
  <input id="chave" name="chave" type="password" autocomplete="off" placeholder="Chave da equipe ou admin" autofocus>
  ${hidden}
  <button type="submit">Autorizar</button>
  <div class="foot">Voc\xEA s\xF3 precisa fazer isso uma vez.</div>
</form></body></html>`;
}
__name(telaLogin, "telaLogin");
function escAttr(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(escAttr, "escAttr");
async function handleMcp(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;
  const db = env.DB;
  const isMcpPath = path === "/mcp" || path === "/api/mcp" || path === "/oauth/register" || path === "/oauth/authorize" || path === "/oauth/token" || path === "/.well-known/oauth-protected-resource" || path === "/.well-known/oauth-authorization-server";
  if (!isMcpPath) return null;
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (path === "/.well-known/oauth-protected-resource") {
    return new Response(JSON.stringify({
      resource: origin + "/mcp",
      authorization_servers: [origin],
      scopes_supported: ["operacoes"],
      bearer_methods_supported: ["header"]
    }), { headers: jsonHdr });
  }
  if (path === "/.well-known/oauth-authorization-server") {
    return new Response(JSON.stringify({
      issuer: origin,
      authorization_endpoint: origin + "/oauth/authorize",
      token_endpoint: origin + "/oauth/token",
      registration_endpoint: origin + "/oauth/register",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["operacoes"]
    }), { headers: jsonHdr });
  }
  if (path === "/oauth/register" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris.filter((u) => typeof u === "string").slice(0, 10) : [];
    const client_id = "cli_" + randToken(18);
    await db.prepare("INSERT INTO mcp_clients (client_id, redirect_uris, nome) VALUES (?,?,?)").bind(client_id, JSON.stringify(uris), String(b.client_name || "").slice(0, 120)).run();
    return new Response(JSON.stringify({
      client_id,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(Date.now() / 1e3)
    }), { status: 201, headers: jsonHdr });
  }
  if (path === "/oauth/authorize") {
    if (request.method === "GET") {
      const p = url.searchParams;
      const cli = await db.prepare("SELECT * FROM mcp_clients WHERE client_id=?").bind(p.get("client_id") || "").first();
      if (!cli) return new Response("client_id inv\xE1lido", { status: 400, headers: CORS });
      const uris = JSON.parse(cli.redirect_uris || "[]");
      if (uris.length && !uris.includes(p.get("redirect_uri"))) return new Response("redirect_uri n\xE3o registrada", { status: 400, headers: CORS });
      if (p.get("response_type") !== "code") return new Response("response_type deve ser code", { status: 400, headers: CORS });
      return new Response(telaLogin(origin, p, null), { headers: { "content-type": "text/html; charset=utf-8", ...CORS } });
    }
    if (request.method === "POST") {
      const form = new URLSearchParams(await request.text());
      const papel2 = papelDaChave(form.get("chave") || "", env);
      const client_id = form.get("client_id") || "";
      const redirect_uri = form.get("redirect_uri") || "";
      const cli = await db.prepare("SELECT * FROM mcp_clients WHERE client_id=?").bind(client_id).first();
      if (!cli) return new Response("client_id inv\xE1lido", { status: 400, headers: CORS });
      if (!papel2) return new Response(telaLogin(origin, form, "Chave incorreta. Tente de novo."), { status: 401, headers: { "content-type": "text/html; charset=utf-8", ...CORS } });
      const code = randToken(24);
      await db.prepare("INSERT INTO mcp_codes (code, client_id, redirect_uri, code_challenge, papel, expira_em) VALUES (?,?,?,?,?,?)").bind(code, client_id, redirect_uri, form.get("code_challenge") || "", papel2, Math.floor(Date.now() / 1e3) + 600).run();
      const back = new URL(redirect_uri);
      back.searchParams.set("code", code);
      if (form.get("state")) back.searchParams.set("state", form.get("state"));
      return new Response(null, { status: 302, headers: { Location: back.toString(), ...CORS } });
    }
  }
  if (path === "/oauth/token" && request.method === "POST") {
    const form = new URLSearchParams(await request.text());
    const grant = form.get("grant_type");
    if (grant === "authorization_code") {
      const code = form.get("code") || "";
      const row = await db.prepare("SELECT * FROM mcp_codes WHERE code=?").bind(code).first();
      if (!row) return oauthErr("invalid_grant", "c\xF3digo inv\xE1lido");
      await db.prepare("DELETE FROM mcp_codes WHERE code=?").bind(code).run();
      if (row.expira_em < Math.floor(Date.now() / 1e3)) return oauthErr("invalid_grant", "c\xF3digo expirado");
      if (row.client_id !== (form.get("client_id") || "")) return oauthErr("invalid_grant", "client_id n\xE3o confere");
      if (row.redirect_uri !== (form.get("redirect_uri") || "")) return oauthErr("invalid_grant", "redirect_uri n\xE3o confere");
      if (row.code_challenge) {
        const ver = form.get("code_verifier") || "";
        if (await sha256b64url(ver) !== row.code_challenge) return oauthErr("invalid_grant", "PKCE inv\xE1lido");
      }
      return tokenResponse(row.papel, env);
    }
    if (grant === "refresh_token") {
      const p = await readToken(form.get("refresh_token"), env);
      if (!p || p.typ !== "refresh") return oauthErr("invalid_grant", "refresh_token inv\xE1lido");
      return tokenResponse(p.papel, env);
    }
    return oauthErr("unsupported_grant_type", "grant_type n\xE3o suportado");
  }
  if (path === "/mcp" || path === "/api/mcp") {
    if (request.method === "GET")
      return new Response(JSON.stringify({ erro: "use POST (Streamable HTTP)" }), { status: 405, headers: jsonHdr });
    const auth = request.headers.get("authorization") || "";
    const bearer = auth.replace(/^Bearer\s+/i, "");
    const claims = await readToken(bearer, env);
    let papel2 = claims && claims.typ === "access" ? claims.papel : null;
    if (!papel2) papel2 = papelDaChave(request.headers.get("x-app-key") || "", env);
    if (!papel2) papel2 = papelDaChave(bearer, env);
    if (!papel2) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "n\xE3o autorizado" }, id: null }), {
        status: 401,
        headers: { ...jsonHdr, "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` }
      });
    }
    const msg = await request.json().catch(() => null);
    if (!msg || msg.jsonrpc !== "2.0") return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "parse error" }, id: null }), { headers: jsonHdr });
    const id = msg.id;
    const reply = /* @__PURE__ */ __name((result) => new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { headers: jsonHdr }), "reply");
    const fail = /* @__PURE__ */ __name((code, message) => new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { headers: jsonHdr }), "fail");
    try {
      if (msg.method === "initialize") {
        return reply({
          protocolVersion: msg.params && msg.params.protocolVersion || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "Desbravando \xB7 Opera\xE7\xF5es", version: "1.0.0" },
          instructions: "Sistema de gest\xE3o das expedi\xE7\xF5es de UTV da Desbravando. IMPORTANTE: a opera\xE7\xE3o real de cada expedi\xE7\xE3o vive no CHECKLIST \u2014 use 'ver_checklist' (e criar/editar/excluir item) para o que a equipe faz no dia a dia. Tamb\xE9m h\xE1 'listar_tarefas' (tarefas gerais, fora das expedi\xE7\xF5es), um m\xF3dulo novo de Ciclo (6 fases por item) + Opera\xE7\xE3o em Campo (dias/tarefas), hoje preenchido s\xF3 no template 'Playbook'. Sempre comece por 'listar_expedicoes' para achar o evento_id. Com a chave admin h\xE1 acesso total, inclusive participantes (CPF), custos, fornecedores e CRM; com a chave de equipe, s\xF3 a opera\xE7\xE3o, sem dados pessoais."
        });
      }
      if (msg.method === "notifications/initialized" || typeof msg.method === "string" && msg.method.startsWith("notifications/"))
        return new Response(null, { status: 202, headers: CORS });
      if (msg.method === "ping") return reply({});
      if (msg.method === "tools/list") return reply({ tools: toolsParaPapel(papel2) });
      if (msg.method === "tools/call") {
        const nome = msg.params && msg.params.name;
        const args = msg.params && msg.params.arguments || {};
        const tool = TOOLS.find((t) => t.name === nome);
        if (!tool) return fail(-32602, "ferramenta desconhecida");
        if (tool.role === "admin" && papel2 !== "admin")
          return reply({ content: [{ type: "text", text: "Esta informa\xE7\xE3o (dados pessoais/financeiro) exige a chave admin. A conex\xE3o atual \xE9 de equipe." }], isError: true });
        try {
          const out = await runTool(nome, args, env, papel2);
          return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
        } catch (e) {
          return reply({ content: [{ type: "text", text: "Erro: " + (e.message || String(e)) }], isError: true });
        }
      }
      return fail(-32601, "m\xE9todo n\xE3o suportado: " + msg.method);
    } catch (e) {
      return fail(-32603, "erro interno: " + (e.message || String(e)));
    }
  }
  return new Response("m\xE9todo n\xE3o permitido", { status: 405, headers: CORS });
}
__name(handleMcp, "handleMcp");
function oauthErr(error, desc) {
  return new Response(JSON.stringify({ error, error_description: desc }), { status: 400, headers: jsonHdr });
}
__name(oauthErr, "oauthErr");
async function tokenResponse(papel2, env) {
  const now = Math.floor(Date.now() / 1e3);
  const access = await makeToken({ typ: "access", papel: papel2, exp: now + 3600 }, env);
  const refresh = await makeToken({ typ: "refresh", papel: papel2, exp: now + 60 * 60 * 24 * 30 }, env);
  return new Response(JSON.stringify({
    access_token: access,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: refresh,
    scope: "operacoes"
  }), { headers: jsonHdr });
}
__name(tokenResponse, "tokenResponse");



export { handleMcp };
