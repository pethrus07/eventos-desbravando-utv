/**
 * Suíte mínima contra o Worker de verdade, rodando em `wrangler dev` local.
 *
 *   npm test
 *
 * O que cobre: a tela abre, login com e-mail e senha, permissão por pessoa (v4.9), o ciclo
 * de vida de uma expedição (criar, ler, editar, excluir com confirmação) e o anexo em R2
 * (subir, baixar o mesmo conteúdo, apagar).
 *
 * Como roda: cria um banco D1 local numa pasta temporária a partir do `schema.sql`, sobe o
 * `wrangler dev` apontado para ela e fala com ele por HTTP, como o navegador falaria. Nada
 * sai desta máquina: o `--persist-to` mantém D1 e R2 no disco, e as chaves são de teste.
 * Nenhum dado real entra aqui.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = 8797;
const BASE = `http://127.0.0.1:${PORTA}`;
const CHAVE_ADMIN = "chave-admin-de-teste";
const CHAVE_EQUIPE = "chave-equipe-de-teste";
const estado = mkdtempSync(join(tmpdir(), "eventos-teste-"));
const wrangler = join(raiz, "node_modules", "wrangler", "bin", "wrangler.js");
let servidor;

function rodarWrangler(args) {
  return execFileSync(process.execPath, [wrangler, ...args], { cwd: raiz, stdio: "pipe", encoding: "utf8" });
}

async function esperarNoAr(ms = 60000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try {
      const r = await fetch(BASE + "/");
      if (r.status === 200) return;
    } catch { /* ainda subindo */ }
    await new Promise((ok) => setTimeout(ok, 400));
  }
  throw new Error("o wrangler dev não respondeu em " + ms / 1000 + " s");
}

const api = (caminho, { chave = CHAVE_ADMIN, metodo = "GET", corpo, cabecalhos = {} } = {}) =>
  fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(chave ? { "x-app-key": chave } : {}),
      ...(corpo && !(corpo instanceof FormData) ? { "content-type": "application/json" } : {}),
      ...cabecalhos,
    },
    body: corpo instanceof FormData ? corpo : corpo ? JSON.stringify(corpo) : undefined,
  });

before(async () => {
  // Banco local com a estrutura verdadeira e um perfil de administrador, sem dado real.
  rodarWrangler(["d1", "execute", "eventos", "--local", "--persist-to", estado, "--file", "schema.sql"]);
  rodarWrangler(["d1", "execute", "eventos", "--local", "--persist-to", estado, "--command",
    "INSERT INTO perfis (id, nome, admin, permissoes) VALUES (1, 'Administrador Geral', 1, '[]')"]);
  servidor = spawn(process.execPath, [wrangler, "dev", "--local", "--ip", "127.0.0.1", "--port", String(PORTA),
    "--persist-to", estado, "--var", `APP_KEY:${CHAVE_ADMIN}`, "--var", `TEAM_KEY:${CHAVE_EQUIPE}`,
    "--var", "MCP_SIGNING_KEY:assinatura-de-teste", "--show-interactive-dev-session=false"],
    { cwd: raiz, stdio: "ignore" });
  await esperarNoAr();
});

after(() => {
  if (servidor) servidor.kill();
  try { rmSync(estado, { recursive: true, force: true }); } catch { /* o Windows às vezes segura o arquivo */ }
});

test("a tela abre na raiz", async () => {
  const r = await fetch(BASE + "/");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
});

test("a API recusa pedido sem chave nem sessão", async () => {
  const r = await api("/api/eventos", { chave: null });
  assert.equal(r.status, 401);
});

test("login: senha errada recusa, senha certa devolve sessão", async () => {
  const cria = await api("/api/usuarios", { metodo: "POST", corpo: {
    nome: "Pessoa Admin", email: "admin@teste.local", senha: "senha-forte-123", perfil_id: 1 } });
  assert.equal(cria.status, 200, await cria.clone().text());

  const errada = await api("/api/login", { chave: null, metodo: "POST", corpo: { email: "admin@teste.local", senha: "outra" } });
  assert.equal(errada.status, 401);

  const certa = await api("/api/login", { chave: null, metodo: "POST", corpo: { email: "admin@teste.local", senha: "senha-forte-123" } });
  assert.equal(certa.status, 200);
  const { token } = await certa.json();
  assert.match(token, /^sess_/);

  const eu = await api("/api/me", { chave: token });
  assert.equal(eu.status, 200);
  assert.equal((await eu.json()).admin, true);
});

test("permissão por pessoa: quem só vê eventos não cria evento", async () => {
  const cria = await api("/api/usuarios", { metodo: "POST", corpo: {
    nome: "Pessoa Leitura", email: "leitura@teste.local", senha: "senha-forte-123",
    permissoes: ["eventos.acessar", "eventos.visualizar"] } });
  assert.equal(cria.status, 200, await cria.clone().text());

  const login = await api("/api/login", { chave: null, metodo: "POST", corpo: { email: "leitura@teste.local", senha: "senha-forte-123" } });
  const { token } = await login.json();

  const lista = await api("/api/eventos", { chave: token });
  assert.equal(lista.status, 200);

  const novo = await api("/api/eventos", { chave: token, metodo: "POST", corpo: { nome: "Não pode" } });
  assert.equal(novo.status, 403);

  const acessos = await api("/api/acessos", { chave: token });
  assert.equal(acessos.status, 403, "só o Administrador Geral mexe em acessos");
});

test("expedição: criar, ler, editar e excluir só com confirmação", async () => {
  const cria = await api("/api/eventos", { metodo: "POST", corpo: { nome: "Expedição de Teste", data_evento: "2026-12-01" } });
  assert.equal(cria.status, 200, await cria.clone().text());
  const { id } = await cria.json();
  assert.ok(id);

  const edita = await api(`/api/eventos/${id}`, { metodo: "PATCH", corpo: { nome: "Expedição Renomeada" } });
  assert.equal(edita.status, 200, await edita.clone().text());

  const lista = await (await api("/api/eventos")).json();
  const achado = (lista.eventos || lista).find((e) => e.id === id);
  assert.equal(achado?.nome, "Expedição Renomeada");

  const semConfirmar = await api(`/api/eventos/${id}`, { metodo: "DELETE" });
  assert.notEqual(semConfirmar.status, 200, "excluir sem repetir o nome não pode passar");

  const confirmado = await api(`/api/eventos/${id}`, { metodo: "DELETE", corpo: { confirmar: "Expedição Renomeada" } });
  assert.equal(confirmado.status, 200, await confirmado.clone().text());
});

test("anexo: sobe para o R2, baixa o mesmo conteúdo e apaga", async () => {
  const conteudo = "anexo de teste " + Date.now();
  const fd = new FormData();
  fd.set("parent_tipo", "item");
  fd.set("parent_id", "1");
  fd.set("arquivo", new Blob([conteudo], { type: "text/plain" }), "nota.txt");
  const sobe = await api("/api/anexos", { metodo: "POST", corpo: fd });
  assert.equal(sobe.status, 200, await sobe.clone().text());
  const { id } = await sobe.json();

  const baixa = await api(`/api/anexos/${id}/arquivo`);
  assert.equal(baixa.status, 200);
  assert.equal(await baixa.text(), conteudo);

  const apaga = await api(`/api/anexos/${id}`, { metodo: "DELETE" });
  assert.equal(apaga.status, 200);
  const depois = await api(`/api/anexos/${id}/arquivo`);
  assert.equal(depois.status, 404);
});
