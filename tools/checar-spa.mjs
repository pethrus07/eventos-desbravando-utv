/**
 * TRAVA DA INTERFACE — o JavaScript do ui.html compila?
 *
 *   node tools/checar-spa.mjs
 *
 * POR QUE EXISTE: o ui.html é uma SPA de arquivo único com ~195 kB de JavaScript dentro de um
 * <script>. Um erro de sintaxe ali não derruba o Worker — ele continua respondendo 200 e
 * servindo a página. Derruba a TELA: o navegador para no primeiro erro e o painel fica em
 * branco, sem nada no log do servidor dizendo o que houve. É o pior tipo de defeito, porque
 * o monitoramento fica verde enquanto o cliente olha para uma página morta.
 *
 * O `checar-travas.mjs` importa o worker e exercita as rotas, mas o JavaScript da interface
 * nunca é executado por ele: para o node, o ui.html é só uma string.
 *
 * ARMADILHA que esta trava já pagou: a primeira versão procurava `<script>` por expressão
 * regular e casou com a palavra `<script>` escrita DENTRO de um comentário de HTML, no
 * cabeçalho do arquivo ("as telas estão em ordem no <script> abaixo"). O trecho extraído
 * começava no meio de uma frase em português e o node reprovava um arquivo que estava
 * perfeito. Por isso agora a busca é pela TAG sozinha na linha, que é como o arquivo a
 * escreve de verdade.
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(raiz, "ui.html"), "utf8");

/* A tag sozinha na linha, tolerando CRLF: o arquivo está com fim de linha do Windows, e
   procurar "\n<script>\n" não casava com "\r\n<script>\r\n" — a primeira versão desta trava
   reprovou um arquivo perfeito por isso. */
const inicio = /(^|\r?\n)<script>\r?\n/.exec(html);
const fim = html.lastIndexOf("</script>");
if (!inicio || fim === -1 || fim < inicio.index) {
  console.log("  FALHA  não achei o bloco <script> do ui.html (a tag mudou de forma?)");
  process.exit(1);
}
const js = html.slice(inicio.index + inicio[0].length, fim);

const fora = join(mkdtempSync(join(tmpdir(), "spa-")), "ui-script.js");
writeFileSync(fora, js, "utf8");
const r = spawnSync(process.execPath, ["--check", fora], { encoding: "utf8" });

if (r.status !== 0) {
  console.log("  FALHA  o JavaScript do ui.html NÃO compila — o painel abriria em branco:");
  console.log(
    (r.stderr || "")
      .split("\n")
      .filter((l) => l.trim() && !/^\s+at /.test(l))
      .slice(0, 6)
      .map((l) => "         " + l.replace(fora, "ui.html"))
      .join("\n")
  );
  process.exit(1);
}

/* Funções chamadas e nunca definidas: o `--check` não pega, porque só olha sintaxe. Aqui é
   só para os nomes que ESTE projeto usa como ponto de entrada de tela e de rota — a lista é
   curta de propósito, para não virar um analisador caseiro que grita errado. */
const ESSENCIAIS = ["telaHome", "telaEvento", "telaTarefas", "telaCRM", "telaFornecedores", "telaUsuarios",
                    "carregarMeus", "podeVer", "podeEditar", "abrirSheet", "api", "esc", "toast"];
const faltando = ESSENCIAIS.filter((n) => !new RegExp(`function\\s+${n}\\s*\\(`).test(js));
if (faltando.length) {
  console.log(`  FALHA  função de tela chamada mas não definida: ${faltando.join(", ")}`);
  process.exit(1);
}

console.log(`  ok    o JavaScript do ui.html compila (${(js.length / 1024).toFixed(0)} kB, ${ESSENCIAIS.length} telas presentes)`);
