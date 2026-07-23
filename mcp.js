/* ============================================================
   CONECTOR MCP · Desbravando UTV — v4.2
   Servidor MCP remoto + OAuth 2.1, tudo no mesmo Worker.

   Deixa o Claude do cliente (claude.ai web, via "custom connector")
   conversar com o sistema: ver expedições/agenda e operar (marcar
   tarefas, registrar horário realizado, criar item). NÃO expõe
   CPF/financeiro/CRM — só o módulo operacional (LGPD).

   Fluxo OAuth (o claude.ai cuida do lado dele):
     1. POST /mcp sem token  → 401 + WWW-Authenticate (aponta pro metadata)
     2. GET  /.well-known/oauth-protected-resource
     3. GET  /.well-known/oauth-authorization-server
     4. POST /oauth/register           (Dynamic Client Registration)
     5. GET/POST /oauth/authorize      (tela de login: chave de acesso → code)
     6. POST /oauth/token              (code + PKCE → access_token assinado)
     7. POST /mcp  Authorization: Bearer <token>

   Login = a mesma chave do app: APP_KEY (papel admin) ou TEAM_KEY (equipe).
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,authorization,mcp-protocol-version",
};
const jsonHdr = { "content-type": "application/json; charset=utf-8", ...CORS };

/* ---------- cripto (Web Crypto) ---------- */
function b64urlBytes(bytes) {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function bytesFromB64url(str) {
  str = String(str).replace(/-/g, "+").replace(/_/g, "/"); while (str.length % 4) str += "=";
  const bin = atob(str); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u;
}
function randToken(n = 32) { const u = new Uint8Array(n); crypto.getRandomValues(u); return b64urlBytes(u); }
async function hmac(data, key) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64urlBytes(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data))));
}
async function sha256b64url(data) {
  return b64urlBytes(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(data))));
}
function signingKey(env) { return env.MCP_SIGNING_KEY || env.APP_KEY || "dev-mcp-key"; }
async function makeToken(payload, env) {
  const body = b64urlBytes(enc.encode(JSON.stringify(payload)));
  return body + "." + (await hmac(body, signingKey(env)));
}
async function readToken(token, env) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  if ((await hmac(parts[0], signingKey(env))) !== parts[1]) return null;
  try {
    const p = JSON.parse(dec.decode(bytesFromB64url(parts[0])));
    if (p.exp && p.exp * 1000 < Date.now()) return null;
    return p;
  } catch { return null; }
}

/* ---------- horários (reajuste de campo) ---------- */
function hhmmMin(s) { const m = String(s || "").match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function minHhmm(t) { t = ((t % 1440) + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); }

const FASE_TIPOS = ["pesquisa", "negociacao", "contratacao", "confirmacao", "execucao", "avaliacao"];
const FASE_STATUS = new Set(["afazer", "andamento", "concluido", "nao_utilizada"]);
const ETAPA_SLUGS = new Set(["validacao", "marketing", "vendas", "contratacoes", "pre_expedicao", "operacao_campo", "fechamento"]);

/* ============================================================
   Ferramentas MCP (operacional; sem CPF/financeiro)
   ============================================================ */
const TOOLS = [
  // ----- Panorama -----
  { name: "listar_expedicoes", role: "both", description: "Lista as expedições ativas com progresso do CHECKLIST (itens concluídos) e quantos itens têm no módulo novo (Ciclo). Comece sempre por aqui para achar o evento_id.",
    inputSchema: { type: "object", properties: {} } },
  { name: "resumo_expedicao", role: "both", description: "Resumo de uma expedição: progresso do checklist, das 7 etapas do Ciclo, Operação em Campo, contagem de participantes e (só admin) custo total.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] } },
  // ----- Checklist (a operação real de hoje; ambos os papéis) -----
  { name: "ver_checklist", role: "both", description: "Itens do CHECKLIST de uma expedição — é onde está a operação real hoje. Traz dia, item, setor, status, responsável, horário, fornecedor, prazo e subtarefas. Filtra por dia/status/setor.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, dia: { type: "string" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] }, setor: { type: "string" } }, required: ["evento_id"] } },
  { name: "marcar_item_checklist", role: "both", description: "Muda o status de um item do checklist (afazer/andamento/concluido).",
    inputSchema: { type: "object", properties: { item_id: { type: "integer" }, status: { type: "string", enum: ["afazer", "andamento", "concluido"] } }, required: ["item_id", "status"] } },
  { name: "concluir_subitem_checklist", role: "both", description: "Marca/desmarca uma subtarefa de um item do checklist.",
    inputSchema: { type: "object", properties: { subitem_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["subitem_id", "concluido"] } },
  // ----- Ciclo Operacional (módulo novo; hoje preenchido só no Playbook) -----
  { name: "listar_itens_ciclo", role: "both", description: "Itens do módulo NOVO (Ciclo de 6 fases) de uma expedição e o status das fases. Filtra por etapa.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, etapa: { type: "string", enum: [...ETAPA_SLUGS] } }, required: ["evento_id"] } },
  { name: "criar_item_ciclo", role: "both", description: "Cria um item no Ciclo (só nome+categoria); o sistema gera as 6 fases automaticamente.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, etapa: { type: "string", enum: [...ETAPA_SLUGS] }, categoria: { type: "string" }, nome: { type: "string" } }, required: ["evento_id", "etapa", "nome"] } },
  { name: "marcar_microtarefa", role: "both", description: "Marca/desmarca uma microtarefa do Ciclo como concluída.",
    inputSchema: { type: "object", properties: { micro_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["micro_id", "concluido"] } },
  { name: "mudar_status_fase", role: "both", description: "Muda o status de uma fase do Ciclo (afazer, andamento, concluido, nao_utilizada).",
    inputSchema: { type: "object", properties: { fase_id: { type: "integer" }, status: { type: "string", enum: ["afazer", "andamento", "concluido", "nao_utilizada"] } }, required: ["fase_id", "status"] } },
  // ----- Operação em Campo + Agenda -----
  { name: "ver_campo", role: "both", description: "Operação em Campo: dias, tarefas cronológicas (previsto/realizado, tipo, status).",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] } },
  { name: "agenda_do_dia", role: "both", description: "Agenda cronológica: tarefas de campo + entregas (Execução) com horário. Filtra por dia.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" }, dia: { type: "string" } }, required: ["evento_id"] } },
  { name: "registrar_horario_realizado", role: "both", description: "Registra o horário real de uma tarefa de campo e conclui; com reajustar=true, cascateia o atraso/adianto nas próximas tarefas Ajustáveis.",
    inputSchema: { type: "object", properties: { tarefa_id: { type: "integer" }, h_realizado: { type: "string", description: "HH:MM" }, reajustar: { type: "boolean" } }, required: ["tarefa_id", "h_realizado"] } },
  { name: "concluir_subtarefa_campo", role: "both", description: "Marca/desmarca uma subtarefa (check) de uma tarefa de campo.",
    inputSchema: { type: "object", properties: { sub_id: { type: "integer" }, concluido: { type: "boolean" } }, required: ["sub_id", "concluido"] } },
  // ----- Dados sensíveis (só chave ADMIN) -----
  { name: "listar_participantes", role: "admin", description: "[admin] Participantes de uma expedição, com dados pessoais: nome, CPF, telefone, grupo, tipo, UTV, camiseta, contrato e pacote.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] } },
  { name: "ver_custos", role: "admin", description: "[admin] Custos de uma expedição (item, categoria, valor, status, pago, fornecedor) e o total.",
    inputSchema: { type: "object", properties: { evento_id: { type: "integer" } }, required: ["evento_id"] } },
  { name: "listar_fornecedores", role: "admin", description: "[admin] Fornecedores cadastrados (globais), com contato e cidade.",
    inputSchema: { type: "object", properties: {} } },
  { name: "ver_crm", role: "admin", description: "[admin] Contatos do CRM (leads/clientes): nome, telefone, cidade, etapa do funil, interesse e próxima ação. Filtra por etapa.",
    inputSchema: { type: "object", properties: { etapa: { type: "string", enum: ["lead", "contato", "proposta", "confirmado", "pos_evento", "perdido"] } } } },
];
function toolsParaPapel(papel) {
  return TOOLS.filter(t => t.role !== "admin" || papel === "admin").map(({ role, ...t }) => t);
}

async function runTool(name, args, env, papel) {
  const db = env.DB;
  const admin = papel === "admin";
  const eid = (args && args.evento_id != null) ? parseInt(args.evento_id, 10) : null;
  switch (name) {
    case "listar_expedicoes": {
      const { results } = await db.prepare(`
        SELECT e.id, e.nome,
          (SELECT COUNT(*) FROM itens i WHERE i.evento_id=e.id) AS checklist,
          (SELECT COUNT(*) FROM itens i WHERE i.evento_id=e.id AND i.status='concluido') AS checklist_ok,
          (SELECT COUNT(*) FROM op_itens o WHERE o.evento_id=e.id) AS itens_ciclo
        FROM eventos e WHERE e.arquivado=0 ORDER BY e.id DESC`).all();
      return (results || []).map(r => ({
        id: r.id, nome: r.nome,
        checklist_total: r.checklist, checklist_concluidos: r.checklist_ok,
        checklist_progresso: r.checklist ? Math.round(r.checklist_ok / r.checklist * 100) + "%" : "—",
        itens_no_ciclo_novo: r.itens_ciclo,
      }));
    }
    case "resumo_expedicao": {
      const ev = await db.prepare("SELECT id, nome FROM eventos WHERE id=?").bind(eid).first();
      if (!ev) throw new Error("expedição não encontrada");
      const chk = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='concluido' THEN 1 ELSE 0 END) AS ok, SUM(CASE WHEN status='andamento' THEN 1 ELSE 0 END) AS andamento FROM itens WHERE evento_id=?").bind(eid).first();
      const { results: et } = await db.prepare(`
        SELECT o.etapa, COUNT(DISTINCT o.id) AS itens, COUNT(f.id) AS fases,
          SUM(CASE WHEN f.status IN ('concluido','nao_utilizada') THEN 1 ELSE 0 END) AS fases_ok
        FROM op_itens o LEFT JOIN op_fases f ON f.item_id=o.id WHERE o.evento_id=? GROUP BY o.etapa`).bind(eid).all();
      const campo = await db.prepare(`
        SELECT COUNT(DISTINCT d.id) AS dias, COUNT(t.id) AS tarefas,
          SUM(CASE WHEN t.status='concluido' THEN 1 ELSE 0 END) AS tarefas_ok
        FROM campo_dias d LEFT JOIN campo_tarefas t ON t.dia_id=d.id WHERE d.evento_id=?`).bind(eid).first();
      const p = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN tipo='crianca' THEN 1 ELSE 0 END) AS criancas, SUM(CASE WHEN staff=1 THEN 1 ELSE 0 END) AS staff FROM clientes WHERE evento_id=?").bind(eid).first();
      const out = {
        expedicao: ev,
        checklist: { total: chk.total || 0, concluidos: chk.ok || 0, em_andamento: chk.andamento || 0 },
        ciclo_novo_por_etapa: et, operacao_campo: campo,
        participantes: { total: p.total || 0, criancas: p.criancas || 0, staff: p.staff || 0 },
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
      if (args.dia) { sql += " AND dia=?"; bind.push(String(args.dia)); }
      if (args.status) { sql += " AND status=?"; bind.push(String(args.status)); }
      if (args.setor) { sql += " AND setor=?"; bind.push(String(args.setor)); }
      sql += " ORDER BY ordem, id";
      const { results } = await db.prepare(sql).bind(...bind).all();
      const { results: subs } = await db.prepare(
        "SELECT s.id, s.item_id, s.titulo, s.concluido FROM subitens s JOIN itens i ON i.id=s.item_id WHERE i.evento_id=? ORDER BY s.ordem, s.id").bind(eid).all();
      const sp = {}; for (const s of (subs || [])) (sp[s.item_id] = sp[s.item_id] || []).push({ id: s.id, titulo: s.titulo, concluido: !!s.concluido });
      return (results || []).map(i => ({ ...i, subitens: sp[i.id] || [] }));
    }
    case "marcar_item_checklist": {
      if (!["afazer", "andamento", "concluido"].includes(args.status)) throw new Error("status inválido");
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
               c.contrato_enviado, c.contrato_assinado, c.pacote, c.staff,
               (SELECT COALESCE(SUM(p.valor),0) FROM pagamentos p WHERE p.cliente_id=c.id) AS pago
        FROM clientes c WHERE c.evento_id=? ORDER BY c.grupo, c.nome`).bind(eid).all();
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
    case "ver_crm": {
      let sql = "SELECT id, nome, grupo, telefone, cidade, origem, etapa, interesse, valor_potencial, proxima_acao, proxima_data FROM crm_contatos";
      const bind = [];
      if (args.etapa) { sql += " WHERE etapa=?"; bind.push(String(args.etapa)); }
      sql += " ORDER BY nome COLLATE NOCASE";
      const { results } = await db.prepare(sql).bind(...bind).all();
      return results || [];
    }
    case "agenda_do_dia": {
      const { results: ct } = await db.prepare(`
        SELECT t.id, t.nome, t.h_planejado AS horario, t.h_realizado, t.tipo, t.status, d.rotulo AS dia, d.ordem AS dia_ordem
        FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=?`).bind(eid).all();
      const { results: mi } = await db.prepare(`
        SELECT m.id, m.titulo AS nome, m.horario, m.responsavel, m.tipo, m.concluido, m.data AS dia, i.nome AS item
        FROM op_microtarefas m JOIN op_fases f ON f.id=m.fase_id AND f.tipo='execucao'
        JOIN op_itens i ON i.id=f.item_id WHERE i.evento_id=? AND m.horario<>''`).bind(eid).all();
      let ent = [];
      for (const t of (ct || [])) ent.push({ origem: "campo", id: t.id, dia: t.dia, dia_ordem: t.dia_ordem, horario: t.horario, h_realizado: t.h_realizado, nome: t.nome, tipo: t.tipo, status: t.status });
      for (const x of (mi || [])) ent.push({ origem: "item", id: x.id, dia: x.dia || "Sem dia", dia_ordem: 9999, horario: x.horario, nome: x.nome, item: x.item, tipo: x.tipo, status: x.concluido ? "concluido" : "afazer", responsavel: x.responsavel });
      const dia = args && args.dia ? String(args.dia).toLowerCase() : null;
      if (dia) ent = ent.filter(e => String(e.dia).toLowerCase().includes(dia));
      ent.sort((a, b) => (a.dia_ordem - b.dia_ordem) || String(a.dia).localeCompare(String(b.dia)) || String(a.horario).localeCompare(String(b.horario)));
      return ent;
    }
    case "listar_itens_ciclo": {
      let sql = "SELECT id, etapa, categoria, nome, homologado FROM op_itens WHERE evento_id=?";
      const bind = [eid];
      if (args && args.etapa && ETAPA_SLUGS.has(args.etapa)) { sql += " AND etapa=?"; bind.push(args.etapa); }
      sql += " ORDER BY ordem, id";
      const { results: itens } = await db.prepare(sql).bind(...bind).all();
      const { results: fases } = await db.prepare(
        "SELECT f.id, f.item_id, f.tipo, f.status FROM op_fases f JOIN op_itens o ON o.id=f.item_id WHERE o.evento_id=? ORDER BY f.ordem").bind(eid).all();
      const fp = {}; for (const f of (fases || [])) (fp[f.item_id] = fp[f.item_id] || []).push({ fase_id: f.id, tipo: f.tipo, status: f.status });
      return (itens || []).map(i => ({ ...i, fases: fp[i.id] || [] }));
    }
    case "ver_campo": {
      const { results: dias } = await db.prepare("SELECT id, rotulo, ordem FROM campo_dias WHERE evento_id=? ORDER BY ordem, id").bind(eid).all();
      const { results: tar } = await db.prepare(
        "SELECT t.id, t.dia_id, t.nome, t.h_planejado, t.h_realizado, t.tipo, t.status FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY t.ordem, t.id").bind(eid).all();
      const tp = {}; for (const t of (tar || [])) (tp[t.dia_id] = tp[t.dia_id] || []).push(t);
      return (dias || []).map(d => ({ ...d, tarefas: tp[d.id] || [] }));
    }
    case "criar_item_ciclo": {
      const etapa = args.etapa;
      if (!ETAPA_SLUGS.has(etapa)) throw new Error("etapa inválida");
      const nome = String(args.nome || "").slice(0, 200).trim();
      if (!nome) throw new Error("informe o nome do item");
      const mx = await db.prepare("SELECT COALESCE(MAX(ordem),0) AS mo FROM op_itens WHERE evento_id=?").bind(eid).first();
      const r = await db.prepare("INSERT INTO op_itens (evento_id, etapa, categoria, nome, ordem, atualizado_por) VALUES (?,?,?,?,?, 'Claude')")
        .bind(eid, etapa, String(args.categoria || "").slice(0, 120), nome, (mx ? mx.mo : 0) + 1).run();
      const iid = r.meta.last_row_id;
      for (let i = 0; i < FASE_TIPOS.length; i++)
        await db.prepare("INSERT INTO op_fases (item_id, tipo, ordem, status) VALUES (?,?,?, 'afazer')").bind(iid, FASE_TIPOS[i], i + 1).run();
      return { ok: true, item_id: iid, fases_criadas: FASE_TIPOS.length };
    }
    case "marcar_microtarefa": {
      const r = await db.prepare("UPDATE op_microtarefas SET concluido=? WHERE id=?").bind(args.concluido ? 1 : 0, parseInt(args.micro_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "mudar_status_fase": {
      if (!FASE_STATUS.has(args.status)) throw new Error("status inválido");
      const r = await db.prepare("UPDATE op_fases SET status=?, atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?")
        .bind(args.status, parseInt(args.fase_id, 10)).run();
      return { ok: (r.meta.changes || 0) > 0 };
    }
    case "registrar_horario_realizado": {
      const id = parseInt(args.tarefa_id, 10);
      const t = await db.prepare("SELECT t.*, d.evento_id AS eid FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE t.id=?").bind(id).first();
      if (!t) throw new Error("tarefa não encontrada");
      const hr = String(args.h_realizado || "").slice(0, 20);
      await db.prepare("UPDATE campo_tarefas SET h_realizado=?, status='concluido', atualizado_em=datetime('now'), atualizado_por='Claude' WHERE id=?").bind(hr, id).run();
      let reajustadas = 0;
      const pm = hhmmMin(t.h_planejado), rm = hhmmMin(hr);
      if (args.reajustar && pm != null && rm != null && rm !== pm) {
        const delta = rm - pm;
        const { results } = await db.prepare(
          "SELECT t.id, t.tipo, t.h_planejado FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id=? ORDER BY d.ordem, t.ordem, t.id").bind(t.eid).all();
        let passou = false;
        for (const r of (results || [])) {
          if (r.id === id) { passou = true; continue; }
          if (!passou || r.tipo !== "ajustavel") continue;
          const bm = hhmmMin(r.h_planejado); if (bm == null) continue;
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
    default: throw new Error("ferramenta desconhecida: " + name);
  }
}

/* ============================================================
   OAuth 2.1
   ============================================================ */
function papelDaChave(chave, env) {
  if (env.APP_KEY && chave === env.APP_KEY) return "admin";
  if (env.TEAM_KEY && chave === env.TEAM_KEY) return "equipe";
  return null;
}

function telaLogin(origin, params, erro) {
  const hidden = ["client_id", "redirect_uri", "state", "code_challenge", "code_challenge_method", "scope", "response_type", "resource"]
    .map(k => `<input type="hidden" name="${k}" value="${escAttr(params.get(k) || "")}">`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar ao Claude · Desbravando</title>
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
  <p>Autorize o Claude a acessar o sistema operacional das expedições. Informe a chave de acesso da equipe.</p>
  ${erro ? `<div class="erro">${escAttr(erro)}</div>` : ""}
  <label for="chave">Chave de acesso</label>
  <input id="chave" name="chave" type="password" autocomplete="off" placeholder="Chave da equipe ou admin" autofocus>
  ${hidden}
  <button type="submit">Autorizar</button>
  <div class="foot">Você só precisa fazer isso uma vez.</div>
</form></body></html>`;
}
function escAttr(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

/* ============================================================
   Roteador — retorna Response ou null (não é rota MCP/OAuth)
   ============================================================ */
export async function handleMcp(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = url.origin;
  const db = env.DB;

  const isMcpPath = path === "/mcp" || path === "/oauth/register" || path === "/oauth/authorize" ||
    path === "/oauth/token" || path === "/.well-known/oauth-protected-resource" ||
    path === "/.well-known/oauth-authorization-server";
  if (!isMcpPath) return null;

  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

  /* ---- metadata: recurso protegido (RFC 9728) ---- */
  if (path === "/.well-known/oauth-protected-resource") {
    return new Response(JSON.stringify({
      resource: origin + "/mcp",
      authorization_servers: [origin],
      scopes_supported: ["operacoes"],
      bearer_methods_supported: ["header"],
    }), { headers: jsonHdr });
  }

  /* ---- metadata: authorization server (RFC 8414) ---- */
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
      scopes_supported: ["operacoes"],
    }), { headers: jsonHdr });
  }

  /* ---- Dynamic Client Registration (RFC 7591) ---- */
  if (path === "/oauth/register" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris.filter(u => typeof u === "string").slice(0, 10) : [];
    const client_id = "cli_" + randToken(18);
    await db.prepare("INSERT INTO mcp_clients (client_id, redirect_uris, nome) VALUES (?,?,?)")
      .bind(client_id, JSON.stringify(uris), String(b.client_name || "").slice(0, 120)).run();
    return new Response(JSON.stringify({
      client_id,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }), { status: 201, headers: jsonHdr });
  }

  /* ---- Authorize: tela de login (GET) e submit (POST) ---- */
  if (path === "/oauth/authorize") {
    if (request.method === "GET") {
      const p = url.searchParams;
      const cli = await db.prepare("SELECT * FROM mcp_clients WHERE client_id=?").bind(p.get("client_id") || "").first();
      if (!cli) return new Response("client_id inválido", { status: 400, headers: CORS });
      const uris = JSON.parse(cli.redirect_uris || "[]");
      if (uris.length && !uris.includes(p.get("redirect_uri"))) return new Response("redirect_uri não registrada", { status: 400, headers: CORS });
      if (p.get("response_type") !== "code") return new Response("response_type deve ser code", { status: 400, headers: CORS });
      return new Response(telaLogin(origin, p, null), { headers: { "content-type": "text/html; charset=utf-8", ...CORS } });
    }
    if (request.method === "POST") {
      const form = new URLSearchParams(await request.text());
      const papel = papelDaChave(form.get("chave") || "", env);
      const client_id = form.get("client_id") || "";
      const redirect_uri = form.get("redirect_uri") || "";
      const cli = await db.prepare("SELECT * FROM mcp_clients WHERE client_id=?").bind(client_id).first();
      if (!cli) return new Response("client_id inválido", { status: 400, headers: CORS });
      if (!papel) return new Response(telaLogin(origin, form, "Chave incorreta. Tente de novo."), { status: 401, headers: { "content-type": "text/html; charset=utf-8", ...CORS } });
      const code = randToken(24);
      await db.prepare("INSERT INTO mcp_codes (code, client_id, redirect_uri, code_challenge, papel, expira_em) VALUES (?,?,?,?,?,?)")
        .bind(code, client_id, redirect_uri, form.get("code_challenge") || "", papel, Math.floor(Date.now() / 1000) + 600).run();
      const back = new URL(redirect_uri);
      back.searchParams.set("code", code);
      if (form.get("state")) back.searchParams.set("state", form.get("state"));
      return new Response(null, { status: 302, headers: { Location: back.toString(), ...CORS } });
    }
  }

  /* ---- Token ---- */
  if (path === "/oauth/token" && request.method === "POST") {
    const form = new URLSearchParams(await request.text());
    const grant = form.get("grant_type");
    if (grant === "authorization_code") {
      const code = form.get("code") || "";
      const row = await db.prepare("SELECT * FROM mcp_codes WHERE code=?").bind(code).first();
      if (!row) return oauthErr("invalid_grant", "código inválido");
      await db.prepare("DELETE FROM mcp_codes WHERE code=?").bind(code).run();
      if (row.expira_em < Math.floor(Date.now() / 1000)) return oauthErr("invalid_grant", "código expirado");
      if (row.client_id !== (form.get("client_id") || "")) return oauthErr("invalid_grant", "client_id não confere");
      if (row.redirect_uri !== (form.get("redirect_uri") || "")) return oauthErr("invalid_grant", "redirect_uri não confere");
      if (row.code_challenge) {
        const ver = form.get("code_verifier") || "";
        if ((await sha256b64url(ver)) !== row.code_challenge) return oauthErr("invalid_grant", "PKCE inválido");
      }
      return tokenResponse(row.papel, env);
    }
    if (grant === "refresh_token") {
      const p = await readToken(form.get("refresh_token"), env);
      if (!p || p.typ !== "refresh") return oauthErr("invalid_grant", "refresh_token inválido");
      return tokenResponse(p.papel, env);
    }
    return oauthErr("unsupported_grant_type", "grant_type não suportado");
  }

  /* ---- Endpoint MCP ---- */
  if (path === "/mcp") {
    if (request.method === "GET")
      return new Response(JSON.stringify({ erro: "use POST (Streamable HTTP)" }), { status: 405, headers: jsonHdr });
    const auth = request.headers.get("authorization") || "";
    const tok = auth.replace(/^Bearer\s+/i, "");
    const claims = await readToken(tok, env);
    if (!auth || !claims || claims.typ !== "access") {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "não autorizado" }, id: null }), {
        status: 401,
        headers: { ...jsonHdr, "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"` },
      });
    }
    const msg = await request.json().catch(() => null);
    if (!msg || msg.jsonrpc !== "2.0") return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "parse error" }, id: null }), { headers: jsonHdr });
    const id = msg.id;
    const reply = (result) => new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), { headers: jsonHdr });
    const fail = (code, message) => new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), { headers: jsonHdr });

    try {
      if (msg.method === "initialize") {
        return reply({
          protocolVersion: (msg.params && msg.params.protocolVersion) || "2025-06-18",
          capabilities: { tools: {} },
          serverInfo: { name: "Desbravando · Operações", version: "1.0.0" },
          instructions: "Sistema de gestão das expedições de UTV da Desbravando. IMPORTANTE: a operação real de cada expedição vive no CHECKLIST — use 'ver_checklist' para ver/operar o que a equipe faz no dia a dia. Há também um módulo novo (Ciclo de 6 fases por item + Operação em Campo por dias), hoje preenchido só no template 'Playbook'. Sempre comece por 'listar_expedicoes' para achar o evento_id. Com a chave admin há acesso total, inclusive participantes (CPF), custos, fornecedores e CRM; com a chave de equipe, só a operação (checklist/ciclo/campo), sem dados pessoais.",
        });
      }
      if (msg.method === "notifications/initialized" || (typeof msg.method === "string" && msg.method.startsWith("notifications/")))
        return new Response(null, { status: 202, headers: CORS });
      if (msg.method === "ping") return reply({});
      if (msg.method === "tools/list") return reply({ tools: toolsParaPapel(claims.papel) });
      if (msg.method === "tools/call") {
        const nome = msg.params && msg.params.name;
        const args = (msg.params && msg.params.arguments) || {};
        const tool = TOOLS.find(t => t.name === nome);
        if (!tool) return fail(-32602, "ferramenta desconhecida");
        if (tool.role === "admin" && claims.papel !== "admin")
          return reply({ content: [{ type: "text", text: "Esta informação (dados pessoais/financeiro) exige a chave admin. A conexão atual é de equipe." }], isError: true });
        try {
          const out = await runTool(nome, args, env, claims.papel);
          return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
        } catch (e) {
          return reply({ content: [{ type: "text", text: "Erro: " + (e.message || String(e)) }], isError: true });
        }
      }
      return fail(-32601, "método não suportado: " + msg.method);
    } catch (e) {
      return fail(-32603, "erro interno: " + (e.message || String(e)));
    }
  }

  return new Response("método não permitido", { status: 405, headers: CORS });
}

function oauthErr(error, desc) {
  return new Response(JSON.stringify({ error, error_description: desc }), { status: 400, headers: jsonHdr });
}
async function tokenResponse(papel, env) {
  const now = Math.floor(Date.now() / 1000);
  const access = await makeToken({ typ: "access", papel, exp: now + 3600 }, env);
  const refresh = await makeToken({ typ: "refresh", papel, exp: now + 60 * 60 * 24 * 30 }, env);
  return new Response(JSON.stringify({
    access_token: access, token_type: "Bearer", expires_in: 3600, refresh_token: refresh, scope: "operacoes",
  }), { headers: jsonHdr });
}
