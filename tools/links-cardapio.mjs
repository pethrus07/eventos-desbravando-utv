/**
 * Imprime, para cada formulário de cardápio, o link público e a fórmula da planilha
 * PRONTA PARA COLAR — com o token lido do banco.
 *
 *   node tools/links-cardapio.mjs [slug]
 *
 * Existe por causa de um erro real: em 25/08/2026 eu passei ao cliente um token que
 * havia truncado no meu próprio log ("84aeb6…") e completei de cabeça. O servidor
 * respondeu 403 e o Google traduziu como "não foi possível encontrar o URL" — meia
 * hora perdida procurando bloqueio de rede num problema de credencial inventada.
 *
 * A regra que este script materializa: valor de credencial nunca é redigitado nem
 * reconstruído; sai da fonte e vai inteiro para a mão de quem vai usar.
 */
import { spawnSync } from "node:child_process";

const HOST = "https://cardapio.desbravando-utv.workers.dev";
const alvo = process.argv[2];

/* Comando como STRING única: com shell:true no Windows o spawnSync não cita o
   argumento que tem espaços, e o wrangler recebe o SQL picado em vários. O SQL não
   tem aspas duplas dentro, então envolver em aspas duplas é seguro. */
const SQL =
  "SELECT slug, titulo, aberto, token_planilha," +
  " (SELECT COUNT(*) FROM cardapio_respostas r WHERE r.form_id=f.id) AS respostas" +
  " FROM cardapio_forms f ORDER BY f.id";

const r = spawnSync(
  `npx --yes wrangler d1 execute eventos --remote --json --command "${SQL}"`,
  { encoding: "utf8", shell: true }
);
if (r.status !== 0) {
  console.error(r.stderr || r.stdout);
  process.exit(1);
}

/* o wrangler imprime avisos antes do JSON; pega do primeiro "[" em diante */
const bruto = r.stdout.slice(r.stdout.indexOf("["));
const formularios = JSON.parse(bruto)[0].results.filter((f) => !alvo || f.slug === alvo);

if (!formularios.length) {
  console.error(alvo ? `nenhum formulário com slug "${alvo}"` : "nenhum formulário no banco");
  process.exit(1);
}

for (const f of formularios) {
  const link = `${HOST}/${f.slug}`;
  const csv = `${link}/planilha.csv?t=${f.token_planilha}`;
  console.log(`\n${"─".repeat(78)}`);
  console.log(`${f.titulo}   [${f.aberto ? "recebendo respostas" : "ENCERRADO"}] · ${f.respostas} resposta(s)`);
  console.log(`${"─".repeat(78)}`);
  console.log(`\nlink para o grupo:\n  ${link}`);
  /* A fórmula sai nas duas formas porque o separador de ARGUMENTOS do Sheets muda com
     o idioma da planilha: pt-BR usa ";", en-US usa ",". O segundo argumento (";") é o
     separador DOS DADOS, e esse é sempre ";" — ver respostasCsv em cardapio.js. */
  console.log(`\nfórmula (planilha em português):\n  =IMPORTDATA("${csv}";";")`);
  console.log(`\nfórmula (planilha em inglês):\n  =IMPORTDATA("${csv}", ";")`);
  console.log(`\nbaixar em CSV padrão de vírgula:\n  ${csv}&sep=,`);
}
console.log("");
