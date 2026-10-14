/**
 * TRAVA DO PACOTE — o .zip que o painel gera abre num descompactador de verdade?
 *
 *   node tools/checar-zip.mjs
 *
 * POR QUE EXISTE: o ZIP do painel é escrito à mão, byte a byte, para o repositório continuar
 * sem dependências. Um deslocamento errado no diretório central produz um arquivo que o
 * navegador baixa sem reclamar, com o tamanho certo, e que só falha quando o cliente clica
 * duas vezes nele — provavelmente na véspera da expedição. "Baixou" não é "abre".
 *
 * Então a trava não olha os bytes: ela gera o pacote com a MESMA função do painel e manda o
 * `zipfile` do Python abrir. Se o descompactador aceitar e os conteúdos voltarem iguais aos
 * que entraram, o formato está certo. Se não, o erro aparece aqui e não no WhatsApp.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(raiz, "ui.html"), "utf8");

/* Pega do ui.html exatamente o código que roda no navegador. Copiar a função para cá faria
   as duas versões divergirem na primeira correção — e a testada seria a cópia. */
const corte = html.indexOf("var CRC_TAB");
const fimCorte = html.indexOf("function baixarBlob");
if (corte === -1 || fimCorte === -1 || fimCorte < corte) {
  console.log("  FALHA  não achei as funções de ZIP no ui.html");
  process.exit(1);
}
const fonte = html.slice(corte, fimCorte);
const zipar = new Function(fonte + "\nreturn zipar;")();

const ENTRADA = [
  { nome: "briefing.json", conteudo: JSON.stringify({ expedicao: "Expedição Origens", n: 10 }, null, 2) },
  { nome: "pecas/cronograma_dia.txt", conteudo: "Cronograma por dia\n\nAgenda  [preenchido pelo sistema]\nSexta 08h30 Saída\n" },
  /* Acento e cedilha no CONTEÚDO e no NOME: o ZIP guarda nome em bytes, e UTF-8 sem a flag
     de idioma é o ponto onde um pacote abre com nome corrompido em metade dos programas. */
  { nome: "pecas/comunicação-ação.txt", conteudo: "Ação, coração, informação — 1.234 km\n" },
  { nome: "LEIA-ME.txt", conteudo: "PACOTE DE COMUNICACAO\n" },
];

const blob = zipar(ENTRADA);
const bytes = new Uint8Array(await blob.arrayBuffer());
const destino = join(mkdtempSync(join(tmpdir(), "zip-")), "pacote.zip");
writeFileSync(destino, bytes);

const py = spawnSync(
  "python",
  ["-c", `
import json, sys, zipfile
z = zipfile.ZipFile(${JSON.stringify(destino)})
ruim = z.testzip()
if ruim: print(json.dumps({"erro": "arquivo corrompido: " + ruim})); sys.exit(0)
print(json.dumps({"nomes": z.namelist(),
                  "conteudos": {n: z.read(n).decode("utf8") for n in z.namelist()}}))
`],
  { encoding: "utf8" }
);

if (py.status !== 0) {
  console.log("  FALHA  o descompactador recusou o pacote:");
  console.log("         " + (py.stderr || "").trim().split("\n").slice(-3).join("\n         "));
  process.exit(1);
}

const r = JSON.parse(py.stdout);
if (r.erro) { console.log("  FALHA  " + r.erro); process.exit(1); }

const falhas = [];
if (r.nomes.length !== ENTRADA.length) falhas.push(`${r.nomes.length} arquivos no zip, esperava ${ENTRADA.length}`);
for (const a of ENTRADA) {
  if (!r.nomes.includes(a.nome)) { falhas.push(`faltou "${a.nome}" (nome corrompido?)`); continue; }
  if (r.conteudos[a.nome] !== a.conteudo) falhas.push(`"${a.nome}" voltou diferente do que entrou`);
}

if (falhas.length) {
  falhas.forEach((f) => console.log("  FALHA  " + f));
  process.exit(1);
}
console.log(`  ok    o .zip do painel abre e confere (${ENTRADA.length} arquivos, ${(bytes.length / 1024).toFixed(1)} kB, acentos preservados)`);
