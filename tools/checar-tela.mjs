/**
 * TRAVA DA TELA ABERTA — o painel abre e cada aba renderiza sem erro de JavaScript?
 *
 *   node --import ./tools/html-como-texto.mjs tools/checar-tela.mjs
 *
 * POR QUE EXISTE, com data: em 14/10/2026 a aba Comunicação chegou à produção chamando
 * `podeEditar("comunicacao")` — função que NÃO existe neste sistema (o nome certo é
 * `pode(mod, acao)`). O cliente abriu a aba e não viu nada. E nada apontava para o defeito:
 *
 *   · o worker respondia 200 em tudo, inclusive na rota do briefing;
 *   · `checar-spa.mjs` passava, porque o arquivo COMPILA — `podeEditar` só existe (ou não)
 *     na hora em que a linha roda;
 *   · `checar-travas.mjs` passava, porque para o node o ui.html é uma string;
 *   · o erro era engolido pelo `.catch` da própria tela, que mostrava a mensagem num <div>
 *     discreto em vez de estourar.
 *
 * Três travas verdes e a tela morta. O que faltava não era mais verificação de código: era
 * ALGUÉM ABRIR A TELA. É isso que esta faz — sobe o worker de verdade sobre um banco de
 * verdade (schema.sql), abre o painel num Chromium e clica em todas as abas, reprovando se
 * aparecer um único erro de console ou uma requisição que não completou.
 *
 * O Playwright vem do checkout do qa-parresia, que já o tem instalado com os navegadores.
 * Este repositório continua sem dependências próprias.
 */
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import worker from "../worker.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHAVE = "chave-da-trava";
const PORTA = 8791;

const PLAYWRIGHT = "C:/Users/olive/Projetos/qa-parresia/node_modules/playwright/index.mjs";
let chromium;
try {
  ({ chromium } = await import(pathToFileURL(PLAYWRIGHT).href));
} catch {
  console.log("  FALHA  Playwright não encontrado em " + PLAYWRIGHT);
  console.log("         é de onde esta trava pega o navegador; sem ele ninguém abre a tela.");
  process.exit(1);
}

/* ---------------------------------------------------------------- banco de mentira, real

   schema.sql + a migração do briefing: a estrutura verdadeira, sem um dado verdadeiro
   dentro. O seed é o mínimo para cada aba ter o que desenhar. */
const sq = new DatabaseSync(":memory:");
sq.exec(readFileSync(join(raiz, "schema.sql"), "utf8"));
sq.exec(readFileSync(join(raiz, "migracao_v4_7.sql"), "utf8"));
sq.exec(`
  INSERT INTO perfis (id, nome, admin, permissoes) VALUES (1, 'Administrador Geral', 1, '[]');
  INSERT INTO eventos (id, nome, data_evento, data_evento_fim, hospedagem_diarias)
    VALUES (1, 'Expedição de Teste', '2026-12-01', '2026-12-03', 2);
  INSERT INTO itens (evento_id, ordem, dia, item, setor, status)
    VALUES (1, 1, 'D-30', 'Fechar hospedagem', 'Logística', 'pendente');
  INSERT INTO clientes (evento_id, nome, tipo, papel, utv, desistente)
    VALUES (1, 'Fulano de Teste', 'adulto', 'piloto', '4 lugares', 0);
`);

function d1(sql) {
  const st = { _a: [] };
  st.bind = (...a) => { st._a = a.map((v) => (v === undefined ? null : v)); return st; };
  st.first = async (c) => { const r = sq.prepare(sql).get(...st._a) ?? null; return r && c ? r[c] : r; };
  st.all = async () => ({ results: sq.prepare(sql).all(...st._a), success: true, meta: {} });
  st.run = async () => { const r = sq.prepare(sql).run(...st._a);
    return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }; };
  st.raw = async () => sq.prepare(sql).all(...st._a).map((o) => Object.values(o));
  return st;
}
const env = {
  DB: { prepare: d1, async batch(l) { const o = []; for (const s of l) o.push(await s.all()); return o; },
        async exec(s) { sq.exec(s); return { count: 1 }; } },
  APP_KEY: CHAVE, TEAM_KEY: "equipe-da-trava", MCP_SIGNING_KEY: "assinatura",
};

const servidor = createServer(async (req, res) => {
  const p = [];
  for await (const c of req) p.push(c);
  const r = new Request("http://localhost:" + PORTA + req.url, {
    method: req.method, headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(p),
  });
  const resp = await worker.fetch(r, env, { waitUntil() {}, passThroughOnException() {} });
  res.writeHead(resp.status, Object.fromEntries(resp.headers));
  res.end(Buffer.from(await resp.arrayBuffer()));
});
await new Promise((ok) => servidor.listen(PORTA, ok));

/* ---------------------------------------------------------------- abrir e clicar */
const problemas = [];
const browser = await chromium.launch();

async function percorrer(rotulo, viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") problemas.push(`${rotulo} · console: ${m.text()}`); });
  page.on("pageerror", (e) => problemas.push(`${rotulo} · exceção: ${e.message}`));
  page.on("requestfailed", (r) =>
    problemas.push(`${rotulo} · não completou: ${r.url().replace("http://localhost:" + PORTA, "")} (${r.failure()?.errorText})`));
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/api/") && r.status() >= 500) problemas.push(`${rotulo} · ${r.status()} em ${u.replace("http://localhost:" + PORTA, "")}`);
  });

  await page.goto("http://localhost:" + PORTA, { waitUntil: "networkidle" });
  await page.click("#lmodo_chave");
  await page.fill("#lkey", CHAVE);
  await page.fill("#lnome", "Trava");
  await page.click("#lbtn");
  await page.waitForSelector("#app:not(.hide)", { timeout: 15000 });

  await page.click("text=Expedição de Teste");
  await page.waitForTimeout(600);

  /* Zero aba não é "tudo ok": é a trava não tendo achado a tela. Medida sem portão é
     decoração — esta linha é o portão da própria medida. */
  const abas = (await page.locator(".tabs .tab").allInnerTexts()).map((a) => a.trim()).filter(Boolean);
  if (abas.length < 8) {
    problemas.push(`${rotulo} · achei ${abas.length} abas na expedição (esperava as 8) — a tela não abriu`);
    await ctx.close();
    return abas.length;
  }
  for (const aba of abas) {
    const antes = problemas.length;
    await page.locator(`.tabs >> text="${aba}"`).first().click();
    await page.waitForTimeout(500);
    /* A tela engole o erro num <div class="empty">. Mensagem de JavaScript ali dentro é
       defeito disfarçado de estado vazio — é exatamente como o de 14/10 se escondeu. */
    const vazio = page.locator("#main .empty").first();
    if (await vazio.count()) {
      const txt = (await vazio.innerText()).trim();
      if (/is not defined|undefined|null|NaN|\bError\b|Failed to fetch/i.test(txt))
        problemas.push(`${rotulo} · aba ${aba} mostrou erro no lugar do conteúdo: ${txt.slice(0, 90)}`);
    }
    console.log(`  ${rotulo} · ${aba.padEnd(24)} ${problemas.length > antes ? "FALHA" : "ok"}`);
  }
  await ctx.close();
  return abas.length;
}

const n = await percorrer("desktop", { width: 1440, height: 980 });
await percorrer("celular", { width: 390, height: 844 });

/* ---------------------------------------------- o formulário de usuário não é beco sem saída

   15/10/2026: com só o "Administrador Geral" cadastrado, a lista de perfil do formulário de
   usuário trazia uma opção que não serve e nada mais. O Gustavo escolheu o traço, salvou,
   levou "Escolha o perfil de acesso" e parou ali — mandou vídeo e três áudios perguntando
   como escolhe os módulos da pessoa. A resposta existia a uma aba de distância e a tela não
   dizia. Caminho que não se enxerga é caminho que não existe. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:" + PORTA, { waitUntil: "networkidle" });
  await page.click("#lmodo_chave");
  await page.fill("#lkey", CHAVE);
  await page.fill("#lnome", "Trava");
  await page.click("#lbtn");
  await page.waitForSelector("#app:not(.hide)", { timeout: 15000 });

  await page.evaluate(() => { location.hash = "#/acessos"; });
  await page.waitForSelector("#usr_novo", { timeout: 10000 });
  await page.click("#usr_novo");
  await page.waitForSelector("#us_perfil", { timeout: 10000 });

  const saida = await page.locator("#us_novoperfil");
  if (!(await saida.count())) {
    problemas.push("acessos · o formulário de usuário não oferece criar um perfil de acesso");
  } else {
    await saida.click();
    await page.waitForTimeout(700);
    /* Clicar tem que CHEGAR no editor de perfil. Botão que navega para lugar nenhum passaria
       na checagem acima e deixaria o beco sem saída de pé. */
    const chegou = await page.locator("#pf_nome").count();
    if (!chegou) problemas.push("acessos · 'criar um perfil' não abre o editor de perfil");
    else console.log("  acessos · do formulário de usuário dá para criar um perfil  ok");
  }

  /* v4.9: escolher as áreas da pessoa tem que ser possível NO CADASTRO DELA, que é onde o
     Gustavo procurou. A matriz nasce escondida e aparece ao escolher o modo — se ficar
     escondida, a opção existe no menu e não serve para nada. */
  await page.evaluate(() => { location.hash = "#/acessos"; });
  await page.waitForSelector("#usr_novo", { timeout: 10000 });
  await page.click("#usr_novo");
  await page.waitForSelector("#us_perfil", { timeout: 10000 });
  const temModo = await page.locator('#us_perfil option[value="ind"]').count();
  if (!temModo) {
    problemas.push("acessos · o cadastro de usuário não oferece escolher as áreas só desta pessoa");
  } else {
    await page.selectOption("#us_perfil", "ind");
    await page.waitForTimeout(400);
    const visivel = await page.locator("#us_perms").isVisible();
    const caixas = await page.locator("#us_perms [data-perm]").count();
    if (!visivel || caixas < 10)
      problemas.push(`acessos · a matriz da pessoa não apareceu (visível=${visivel}, ${caixas} caixas)`);
    else console.log(`  acessos · dá para marcar as áreas da própria pessoa (${caixas} caixas)  ok`);
  }
  await ctx.close();
}

await browser.close();
servidor.close();

if (problemas.length) {
  console.log(`\n  FALHA  a tela abriu com ${problemas.length} problema(s):`);
  for (const p of problemas.slice(0, 12)) console.log("         " + p);
  process.exit(1);
}
console.log(`\n  ok    o painel abre e as ${n} abas renderizam sem erro (desktop e celular)`);
