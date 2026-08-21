/* ============================================================
   FORMULÁRIO DE CARDÁPIO — parte pública (sem chave)

   Rotas tratadas aqui, antes do portão de autenticação do worker:

     GET  /cardapio/<slug>                     página do formulário
     POST /cardapio/<slug>                     grava a resposta
     GET  /cardapio/<slug>/planilha.csv?t=TOK  CSV para a planilha

   O CSV tem token próprio de propósito: a planilha do Google puxa o
   endereço em texto puro (=IMPORTDATA), então não pode ser a APP_KEY.
   Token vazado expõe respostas de cardápio, não o sistema — e trocar
   é um clique no painel.

   A página é servida montada no servidor: quem responde abre o link no
   celular, no meio do mato, com sinal ruim. Sem framework, sem build.
   ============================================================ */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* Rótulo qualificado pela seção. Na página a seção aparece como título acima do
   campo, então lá basta "Escolha seu prato"; na planilha e na mensagem de erro esse
   rótulo apareceria quatro vezes igual, sem dizer de que noite. */
/* A seção marca só a PRIMEIRA pergunta do bloco — as seguintes herdam dela na
   página. Aqui a herança é feita no dado, senão "Escolha sua proteína" apareceria
   quatro vezes na planilha sem dizer de que noite. */
function rotulosCheios(perguntas) {
  let atual = "";
  return perguntas.map((p) => {
    if (p.secao) atual = p.secao;
    return atual ? `${atual} · ${p.rotulo}` : p.rotulo;
  });
}

const TIPOS = new Set(["texto", "numero", "escolha", "multi", "sim_nao", "obs"]);

/* Acento -> letra simples, para gerar o id da pergunta a partir do rotulo. Mapa
   explicito em vez de normalize+intervalo de marcas combinantes: o intervalo fica
   ilegivel no codigo e qualquer editor que normalize o arquivo o quebra. */
const SEM_ACENTO = {
  "á": "a", "à": "a", "ã": "a", "â": "a", "ä": "a",
  "é": "e", "ê": "e", "è": "e",
  "í": "i", "î": "i",
  "ó": "o", "õ": "o", "ô": "o", "ö": "o",
  "ú": "u", "ü": "u", "û": "u",
  "ç": "c", "ñ": "n",
};

/** Perguntas de partida de um formulário novo — o painel edita todas. */
export const PERGUNTAS_PADRAO = [
  { id: "responsavel", rotulo: "Quem está respondendo", tipo: "texto", obrigatorio: true },
  { id: "whatsapp", rotulo: "WhatsApp", tipo: "texto", obrigatorio: true, ajuda: "Para falarmos com você se faltar algum detalhe" },
  { id: "grupo", rotulo: "UTV ou grupo", tipo: "texto" },
  { id: "pessoas", rotulo: "Quantas pessoas vão comer", tipo: "numero", obrigatorio: true },
  { id: "criancas", rotulo: "Dessas, quantas são crianças", tipo: "numero" },
  {
    id: "restricao",
    rotulo: "Restrição alimentar",
    tipo: "multi",
    opcoes: ["Nenhuma", "Vegetariano", "Vegano", "Sem glúten", "Sem lactose", "Alergia"],
    ajuda: "Pode marcar mais de uma",
  },
  { id: "alergia_qual", rotulo: "Se marcou alergia, a quê?", tipo: "texto" },
  { id: "carne", rotulo: "Preferência de carne", tipo: "escolha", opcoes: ["Boi", "Frango", "Porco", "Tanto faz"] },
  { id: "bebida", rotulo: "Bebidas que vai querer", tipo: "multi", opcoes: ["Água", "Refrigerante", "Suco", "Cerveja", "Vinho"] },
  { id: "obs", rotulo: "Algo que a cozinha precisa saber", tipo: "obs" },
];

/** Valida e normaliza a lista de perguntas vinda do painel. */
export function limparPerguntas(bruto) {
  let lista = bruto;
  if (typeof lista === "string") {
    try {
      lista = JSON.parse(lista);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(lista)) return null;
  const vistos = new Set();
  const saida = [];
  for (const p of lista.slice(0, 40)) {
    const rotulo = String(p?.rotulo ?? "").slice(0, 160).trim();
    const tipo = TIPOS.has(p?.tipo) ? p.tipo : "texto";
    if (!rotulo) continue;
    // id estável: o que já vier do painel manda, senão sai do rótulo
    let id = String(p?.id ?? "").replace(/[^a-z0-9_]/gi, "").slice(0, 40).toLowerCase();
    if (!id) {
      id = rotulo.toLowerCase().replace(/[^a-z0-9]/g, (c) => SEM_ACENTO[c] ?? "_")
        .replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "campo";
    }
    let unico = id, n = 2;
    while (vistos.has(unico)) unico = `${id}_${n++}`;
    vistos.add(unico);
    const item = { id: unico, rotulo, tipo };
    // secao = titulo que abre um bloco (ex.: "QUARTA-FEIRA"); vem antes do campo
    if (p?.secao) item.secao = String(p.secao).slice(0, 80);
    if (p?.ajuda) item.ajuda = String(p.ajuda).slice(0, 200);
    if (p?.obrigatorio) item.obrigatorio = true;
    if (tipo === "escolha" || tipo === "multi") {
      const opcoes = (Array.isArray(p?.opcoes) ? p.opcoes : String(p?.opcoes ?? "").split(/\s*[;\n]\s*/))
        .map((o) => String(o).slice(0, 80).trim())
        .filter(Boolean)
        .slice(0, 30);
      if (!opcoes.length) continue; // escolha sem opção não vira campo
      item.opcoes = opcoes;
    }
    saida.push(item);
  }
  return saida;
}

/* -------------------------------------------------- página pública */

function campoHtml(p) {
  const req = p.obrigatorio ? " required" : "";
  const abertura = p.secao ? `<h2 class="dia anton">${esc(p.secao)}</h2>` : "";
  /* Opção comprida (nome de prato com descrição) não cabe em chip lado a lado no
     celular — acima de 28 caracteres o grupo vira lista empilhada. */
  const compridas = (p.opcoes ?? []).some((o) => String(o).length > 28) ? " col" : "";
  const ajuda = p.ajuda ? `<small>${esc(p.ajuda)}</small>` : "";
  const marca = p.obrigatorio ? ' <i class="req">obrigatório</i>' : "";
  let controle = "";
  if (p.tipo === "obs") {
    controle = `<textarea name="${esc(p.id)}" rows="3" maxlength="800"${req}></textarea>`;
  } else if (p.tipo === "numero") {
    controle = `<input type="number" inputmode="numeric" min="0" max="999" name="${esc(p.id)}"${req}>`;
  } else if (p.tipo === "sim_nao") {
    controle =
      `<div class="opcoes">` +
      ["Sim", "Não"]
        .map((o) => `<label class="op"><input type="radio" name="${esc(p.id)}" value="${esc(o)}"${req}><span>${esc(o)}</span></label>`)
        .join("") +
      `</div>`;
  } else if (p.tipo === "escolha") {
    controle =
      `<div class="opcoes${compridas}">` +
      p.opcoes
        .map((o) => `<label class="op"><input type="radio" name="${esc(p.id)}" value="${esc(o)}"${req}><span>${esc(o)}</span></label>`)
        .join("") +
      `</div>`;
  } else if (p.tipo === "multi") {
    controle =
      `<div class="opcoes${compridas}">` +
      p.opcoes
        .map((o) => `<label class="op"><input type="checkbox" name="${esc(p.id)}" value="${esc(o)}"><span>${esc(o)}</span></label>`)
        .join("") +
      `</div>`;
  } else {
    controle = `<input type="text" name="${esc(p.id)}" maxlength="200"${req}>`;
  }
  return `${abertura}<div class="campo"><label class="rot">${esc(p.rotulo)}${marca}</label>${ajuda}${controle}</div>`;
}

export function paginaFormulario(form, perguntas) {
  const fechado = !form.aberto;
  const prazo = form.prazo ? `<p class="prazo">Responda até <b>${esc(form.prazo)}</b></p>` : "";
  const corpo = fechado
    ? `<div class="aviso"><h2 class="anton">As respostas foram encerradas</h2>
         <p>Este formulário está fechado. Se você ainda precisa avisar algo sobre a alimentação,
            fale direto com a equipe da Desbravando.</p></div>`
    : `<form id="f" novalidate>
         ${perguntas.map(campoHtml).join("")}
         <button class="btn" type="submit" id="env">Enviar resposta</button>
         <p class="lgpd">Usamos estas respostas só para planejar a alimentação da expedição.
            Nada é publicado nem repassado para terceiros.</p>
       </form>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(form.titulo)} · Desbravando UTV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#0B0B0B;--card:#141414;--line:#2B2B2B;--txt:#FFF;--mut:#C7C7C7;--dim:#8A8A8A;--ok:#6FCF97;--erro:#EB5757}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--txt);font-family:'Archivo',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.55;padding:0 0 80px}
.anton{font-family:'Anton',sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:-.5px;line-height:.95}
.wrap{max-width:620px;margin:0 auto;padding:0 20px}
header{border-bottom:1px solid var(--line);padding:34px 0 26px;margin-bottom:26px}
.marca{display:flex;align-items:center;gap:10px;color:var(--dim);font-size:11px;letter-spacing:2.4px;text-transform:uppercase;margin-bottom:18px}
.marca svg{width:26px;height:auto;opacity:.9}
h1{font-size:34px}
.sub{color:var(--mut);font-size:15px;margin-top:10px}
.desc{color:var(--mut);font-size:15px;margin-top:14px;white-space:pre-line}
.prazo{margin-top:16px;font-size:13px;color:var(--dim);border-left:2px solid #444;padding-left:10px}
.campo{margin-bottom:22px}
.rot{display:block;font-size:15px;font-weight:600;margin-bottom:2px}
.req{font-style:normal;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--dim);margin-left:6px}
.campo small{display:block;color:var(--dim);font-size:13px;margin-bottom:8px}
input[type=text],input[type=number],textarea{width:100%;background:#0F0F0F;border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:12px 13px;font-family:inherit;font-size:16px;margin-top:6px}
input:focus,textarea:focus{outline:none;border-color:#FFF}
textarea{resize:vertical}
.dia{font-size:15px;letter-spacing:2px;color:var(--dim);border-top:1px solid var(--line);padding-top:20px;margin:30px 0 16px}
.dia:first-of-type{border-top:none;padding-top:0;margin-top:0}
.opcoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.opcoes.col{flex-direction:column;align-items:stretch}
.opcoes.col .op{width:100%}
.op{display:inline-flex;align-items:center;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;font-size:15px;cursor:pointer}
.op:hover{border-color:#5A5A5A}
/* Controle desenhado na mão: com accent-color no fundo escuro o radio DESMARCADO
   aparece como bolinha branca cheia e o formulário parece já respondido. */
.op input{appearance:none;-webkit-appearance:none;flex:none;margin:0;width:18px;height:18px;
  border:1.5px solid #6B6B6B;border-radius:50%;background:transparent;position:relative;cursor:pointer}
.op input[type=checkbox]{border-radius:5px}
.op input:checked{border-color:#FFF}
.op input[type=radio]:checked::after{content:"";position:absolute;inset:3px;background:#FFF;border-radius:50%}
.op input[type=checkbox]:checked{background:#FFF}
.op input[type=checkbox]:checked::after{content:"";position:absolute;left:5px;top:2px;width:4px;height:8px;
  border:solid #000;border-width:0 2px 2px 0;transform:rotate(45deg)}
.op input:focus-visible{outline:2px solid #FFF;outline-offset:2px}
.op:has(input:checked){border-color:#FFF;background:#1D1D1D}
.btn{width:100%;background:#FFF;color:#000;border:none;border-radius:12px;padding:16px;font-family:inherit;font-size:16px;font-weight:700;cursor:pointer;margin-top:8px}
.btn:disabled{opacity:.5;cursor:default}
.lgpd{color:var(--dim);font-size:12px;margin-top:16px}
.aviso,.fim{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px}
.aviso h2,.fim h2{font-size:24px;margin-bottom:10px}
.aviso p,.fim p{color:var(--mut);font-size:15px}
.erro{background:#2A1414;border:1px solid #5E2626;color:#FFC9C9;border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px;display:none}
.campo.falta input,.campo.falta textarea{border-color:var(--erro)}
.campo.falta .opcoes{outline:1px solid var(--erro);outline-offset:6px;border-radius:6px}
footer{color:#5E5E5E;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;text-align:center;margin-top:34px}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
</head>
<body>
<header><div class="wrap">
  <div class="marca">
    <svg viewBox="0 0 64 26" aria-hidden="true"><path fill="currentColor" d="M2 24 20 4l9 11 6-7 8 9 5-5 12 12H2Z"/></svg>
    Desbravando UTV
  </div>
  <h1 class="anton">${esc(form.titulo)}</h1>
  ${form.subtitulo ? `<p class="sub">${esc(form.subtitulo)}</p>` : ""}
  ${form.descricao ? `<p class="desc">${esc(form.descricao)}</p>` : ""}
  ${fechado ? "" : prazo}
</div></header>
<main class="wrap">
  <div class="erro" id="erro"></div>
  ${corpo}
  <div class="fim" id="fim" style="display:none">
    <h2 class="anton">Resposta registrada</h2>
    <p>${esc(form.agradecimento || "Obrigado! A cozinha já recebeu. Se mudar algo, é só responder de novo.")}</p>
  </div>
</main>
<footer class="wrap">Desbravando UTV</footer>
<script>
(function(){
  var f = document.getElementById("f");
  if (!f) return;
  var erro = document.getElementById("erro"), btn = document.getElementById("env");
  f.addEventListener("submit", function(ev){
    ev.preventDefault();
    erro.style.display = "none";
    // validação na mão: o navegador não marca grupo de radio de forma clara no celular
    var faltando = [];
    Array.prototype.forEach.call(f.querySelectorAll(".campo"), function(c){
      c.classList.remove("falta");
      var req = c.querySelector("[required]");
      if (!req) return;
      var nome = req.getAttribute("name");
      var grupo = f.querySelectorAll('[name="' + nome + '"]');
      var ok = false;
      Array.prototype.forEach.call(grupo, function(i){
        if (i.type === "radio" || i.type === "checkbox") { if (i.checked) ok = true; }
        else if (String(i.value).trim()) ok = true;
      });
      if (!ok) { faltando.push(c); c.classList.add("falta"); }
    });
    if (faltando.length) {
      erro.textContent = faltando.length === 1
        ? "Falta responder um campo obrigatório."
        : "Faltam " + faltando.length + " campos obrigatórios.";
      erro.style.display = "block";
      faltando[0].scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    var dados = {};
    Array.prototype.forEach.call(f.elements, function(el){
      if (!el.name) return;
      if (el.type === "checkbox") { if (el.checked) (dados[el.name] = dados[el.name] || []).push(el.value); }
      else if (el.type === "radio") { if (el.checked) dados[el.name] = el.value; }
      else if (String(el.value).trim()) dados[el.name] = el.value;
    });
    btn.disabled = true; btn.textContent = "Enviando…";
    fetch(location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ respostas: dados })
    }).then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error(j.erro||"Erro"); return j; }); })
      .then(function(){
        f.style.display = "none";
        document.getElementById("fim").style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function(e){
        erro.textContent = e.message + " — tente de novo em alguns segundos.";
        erro.style.display = "block";
        btn.disabled = false; btn.textContent = "Enviar resposta";
      });
  });
})();
</script>
</body>
</html>`;
}

/* ---------------------------------------------------------- CSV */

const celula = (v) => {
  let s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
  s = s.replace(/\r?\n/g, " ");
  // apóstrofo na frente de = + - @ : impede a planilha de interpretar como fórmula
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return /[",;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

/**
 * Respostas → CSV. Uma coluna por pergunta, na ordem do formulário.
 *
 * Resposta cuja pergunta foi apagada depois vira coluna extra no fim, com o id
 * cru no cabeçalho: quem editou o formulário no meio do caminho não perde dado
 * que já tinha chegado — a planilha é o registro.
 */
export function respostasCsv(perguntas, linhas) {
  const lidas = linhas.map((l) => {
    try {
      return { criado_em: l.criado_em, v: JSON.parse(l.respostas || "{}") };
    } catch {
      return { criado_em: l.criado_em, v: {} };
    }
  });
  const conhecidos = new Set(perguntas.map((p) => p.id));
  const orfaos = [];
  for (const { v } of lidas) {
    for (const k of Object.keys(v)) {
      if (!conhecidos.has(k) && !orfaos.includes(k)) orfaos.push(k);
    }
  }
  const cab = [
    "Enviado em",
    ...rotulosCheios(perguntas),
    ...orfaos.map((k) => `${k} (pergunta removida)`),
  ];
  const corpo = lidas.map(({ criado_em, v }) => [
    criado_em,
    ...perguntas.map((p) => v[p.id]),
    ...orfaos.map((k) => v[k]),
  ]);
  // ; como separador: é o que Excel e Sheets em pt-BR esperam
  return [cab, ...corpo].map((linha) => linha.map(celula).join(";")).join("\r\n") + "\r\n";
}

/* ------------------------------------------------------- rotas */

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

/**
 * Trata as rotas públicas do cardápio. Devolve null quando o caminho não é
 * daqui — assim o worker segue o roteamento normal.
 */
export async function handleCardapio(request, env) {
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/cardapio\/([A-Za-z0-9._-]{1,60})(\/planilha\.csv)?$/);
  if (!m) return null;
  const [, slug, csv] = m;
  const metodo = request.method;
  if (metodo === "OPTIONS") return new Response(null, { headers: CORS });

  const form = await env.DB.prepare(
    `SELECT id, evento_id, slug, titulo, subtitulo, descricao, perguntas, aberto, prazo,
            agradecimento, token_planilha
       FROM cardapio_forms WHERE slug=?`
  ).bind(slug).first();

  if (!form) {
    return csv
      ? json({ erro: "formulário não encontrado" }, 404)
      : new Response(paginaNaoEncontrada(), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  }

  let perguntas = [];
  try {
    perguntas = JSON.parse(form.perguntas || "[]");
  } catch {}

  /* CSV para a planilha */
  if (csv) {
    if (metodo !== "GET") return json({ erro: "método não permitido" }, 405);
    const t = url.searchParams.get("t") || "";
    // comparação de tamanho fixo primeiro evita vazar o tamanho do token
    if (t.length !== form.token_planilha.length || t !== form.token_planilha) {
      return json({ erro: "token inválido" }, 403);
    }
    const { results } = await env.DB.prepare(
      "SELECT criado_em, respostas FROM cardapio_respostas WHERE form_id=? ORDER BY id"
    ).bind(form.id).all();
    return new Response(respostasCsv(perguntas, results ?? []), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `inline; filename="cardapio-${slug}.csv"`,
        "cache-control": "no-store",
        ...CORS,
      },
    });
  }

  /* página */
  if (metodo === "GET") {
    return new Response(paginaFormulario(form, perguntas), {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  }

  /* gravar resposta */
  if (metodo === "POST") {
    if (!form.aberto) return json({ erro: "as respostas deste formulário foram encerradas" }, 403);
    const corpo = await request.json().catch(() => null);
    if (!corpo || typeof corpo.respostas !== "object" || Array.isArray(corpo.respostas)) {
      return json({ erro: "resposta em formato inesperado" }, 400);
    }
    // só entra o que o formulário perguntou, no formato que ele definiu
    const limpo = {};
    for (const p of perguntas) {
      const v = corpo.respostas[p.id];
      if (v === undefined || v === null || v === "") continue;
      if (p.tipo === "multi") {
        const lista = (Array.isArray(v) ? v : [v]).map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 30);
        if (lista.length) limpo[p.id] = lista.filter((x) => p.opcoes?.includes(x));
      } else if (p.tipo === "escolha" || p.tipo === "sim_nao") {
        const permitido = p.tipo === "sim_nao" ? ["Sim", "Não"] : p.opcoes ?? [];
        const s = String(v).slice(0, 80);
        if (permitido.includes(s)) limpo[p.id] = s;
      } else if (p.tipo === "numero") {
        const n = parseInt(String(v), 10);
        if (Number.isFinite(n) && n >= 0 && n <= 999) limpo[p.id] = n;
      } else {
        limpo[p.id] = String(v).slice(0, p.tipo === "obs" ? 800 : 200);
      }
    }
    const faltando = perguntas.filter((p) => p.obrigatorio && limpo[p.id] === undefined);
    if (faltando.length) {
      const nomes = rotulosCheios(perguntas);
      const quais = perguntas.map((p, i) => [p, nomes[i]]).filter(([p]) => faltando.includes(p)).map(([, n]) => n);
      return json({ erro: `falta responder: ${quais.join(", ")}` }, 400);
    }
    if (!Object.keys(limpo).length) return json({ erro: "nada foi respondido" }, 400);

    // nome/contato saem das duas primeiras perguntas de texto, só para a lista do painel
    const textos = perguntas.filter((p) => p.tipo === "texto");
    const nome = String(limpo[textos[0]?.id] ?? "").slice(0, 120);
    const contato = String(limpo[textos[1]?.id] ?? "").slice(0, 120);

    await env.DB.prepare(
      "INSERT INTO cardapio_respostas (form_id, respostas, nome, contato) VALUES (?,?,?,?)"
    ).bind(form.id, JSON.stringify(limpo), nome, contato).run();
    return json({ ok: true });
  }

  return json({ erro: "método não permitido" }, 405);
}

function paginaNaoEncontrada() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Formulário não encontrado</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600&display=swap" rel="stylesheet">
<style>body{background:#0B0B0B;color:#FFF;font-family:'Archivo',Arial,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}
h1{font-family:'Anton',sans-serif;font-weight:400;text-transform:uppercase;font-size:30px;margin-bottom:12px}
p{color:#C7C7C7;max-width:420px}</style></head>
<body><div><h1>Este link não existe mais</h1>
<p>Confira o endereço com quem enviou, ou fale com a equipe da Desbravando UTV.</p></div></body></html>`;
}
