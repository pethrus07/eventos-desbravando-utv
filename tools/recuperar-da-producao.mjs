/**
 * RECUPERAR O FONTE DO QUE ESTÁ NO AR.
 *
 *   node tools/recuperar-da-producao.mjs [--saida=recuperado]
 *
 * POR QUE EXISTE: este worker é publicado por DUAS cópias de código que divergiram, e só uma
 * está no git (ver docs/ARQUITETURA.md e a nota de 24/08/2026). Em 14/10 a diferença era
 * grande: 53 tabelas em produção contra 25 no `schema.sql`, `ui.html` de 425 kB contra 210 kB,
 * e módulos inteiros — financeiro com 264 contas a receber, anexos com 83 arquivos, usuários
 * com perfis e sessões — que não existem neste checkout. **Um `wrangler deploy` daqui apagaria
 * tudo isso.** Este script é o caminho de volta: traz o que está no ar para cá, para que o
 * repositório volte a ser a verdade.
 *
 * O QUE VOLTA E O QUE NÃO VOLTA:
 *   · `ui.html` volta ORIGINAL — módulos de texto não passam pelo empacotador;
 *   · `worker.js` e `mcp.js` voltam EMPACOTADOS pelo esbuild. Rodam, e dá para ler, mas
 *     **todos os comentários se perderam** — o empacotador os remove. O que se recupera é o
 *     comportamento, não a explicação dele. Por isso o resultado vai para uma pasta à parte e
 *     não por cima do checkout: a decisão de qual versão vira o fonte é humana.
 *
 * ARMADILHAS (pagas em 24/08 e confirmadas em 14/10):
 *   1. `/content` sem o `/v2` recusa a credencial com `10405`. Só `/content/v2` serve.
 *   2. A resposta é `multipart/form-data` SEM header de mensagem — o boundary tem de ser lido
 *      da primeira linha do corpo e prefixado à mão antes de parsear.
 *   3. `/versions/{id}/content` devolve só metadados (bindings, secrets), não o código.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, p) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? p;
const SAIDA = join(raiz, arg("saida", "recuperado"));
const CONTA = arg("conta", "c8c7dba80266ce63cfac94490604fa14");
const SCRIPT = arg("script", "eventos");

/* O token sai do cf.ps1 (cifrado por DPAPI). Nunca é impresso: entra como variável de
   ambiente do processo filho e morre com ele. */
function token(apelido = "ryze") {
  const ps = `$c=(Get-Content "$env:USERPROFILE\\.cloudflare\\contas.json" -Raw|ConvertFrom-Json).${apelido}.token;` +
    `[Runtime.InteropServices.Marshal]::PtrToStringAuto(` +
    `[Runtime.InteropServices.Marshal]::SecureStringToBSTR((ConvertTo-SecureString $c)))`;
  return execSync(`powershell -NoProfile -Command "${ps}"`, { encoding: "utf8" }).trim();
}

const r = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${CONTA}/workers/scripts/${SCRIPT}/content/v2`,
  { headers: { Authorization: `Bearer ${token()}` } }
);
if (!r.ok) throw new Error(`a Cloudflare recusou: ${r.status} ${await r.text()}`);
const bruto = Buffer.from(await r.arrayBuffer());

/* Boundary da primeira linha: a resposta vem sem o header que o diria. */
const limite = bruto.subarray(0, bruto.indexOf("\r\n")).toString().trim();
mkdirSync(SAIDA, { recursive: true });
writeFileSync(join(SAIDA, "_bundle-original.bin"), bruto);

const partes = bruto.toString("binary").split(limite).slice(1, -1);
const escritos = [];
for (const p of partes) {
  const corte = p.indexOf("\r\n\r\n");
  if (corte === -1) continue;
  const cab = p.slice(0, corte);
  const corpo = Buffer.from(p.slice(corte + 4).replace(/\r\n$/, ""), "binary");
  const nome = (cab.match(/filename="([^"]+)"/) ?? cab.match(/name="([^"]+)"/))?.[1];
  if (!nome) continue;
  /* O ui.html vem com o hash do esbuild no nome; o arquivo é o mesmo. */
  const limpo = nome.split("/").pop().replace(/^[0-9a-f]{40}-/, "");
  writeFileSync(join(SAIDA, limpo), corpo);
  escritos.push([limpo, corpo.length]);
}

/* O bundle guarda as fronteiras dos módulos como comentário `// nome.js`. Separar por elas
   devolve arquivos por módulo — sem os comentários originais, mas com o código de verdade. */
const js = escritos.find(([n]) => n.endsWith(".js"));
if (js) {
  const texto = readFileSync(join(SAIDA, js[0]), "utf8");
  const marcas = [...texto.matchAll(/^\/\/ ([\w.-]+\.js)$/gm)].map((m) => ({ nome: m[1], em: m.index }));
  const limpar = (s) =>
    s.replace(/^var __defProp[^\n]*\n/gm, "")
     .replace(/^var __name = [^\n]*\n/gm, "")
     .replace(/^__name\([^)]*\);\n/gm, "")
     .replace(/\n{3,}/g, "\n\n");

  const porModulo = {};
  for (let i = 0; i < marcas.length; i++) {
    const fim = i + 1 < marcas.length ? marcas[i + 1].em : texto.length;
    const trecho = texto.slice(marcas[i].em + marcas[i].nome.length + 3, fim);
    porModulo[marcas[i].nome] = (porModulo[marcas[i].nome] ?? "") + trecho;
  }
  mkdirSync(join(SAIDA, "modulos"), { recursive: true });
  for (const [nome, corpo] of Object.entries(porModulo)) {
    const fora = limpar(corpo);
    writeFileSync(join(SAIDA, "modulos", nome), fora, "utf8");
    escritos.push([`modulos/${nome}`, Buffer.byteLength(fora)]);
  }
}

console.log(`recuperado de ${SCRIPT} (conta ${CONTA.slice(0, 8)}…) para ${SAIDA}:\n`);
for (const [n, t] of escritos) console.log(`  ${n.padEnd(34)} ${(t / 1024).toFixed(0).padStart(5)} kB`);
console.log(
  "\n⚠️  O JavaScript volta SEM COMENTÁRIOS — o empacotador os remove. O que se recupera é o\n" +
  "    comportamento, não a explicação. Nada foi escrito por cima do checkout: comparar antes."
);
