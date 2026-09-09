/**
 * TRAVA DE DEPLOY — roda ANTES de publicar o worker do cardápio.
 *
 *   node tools/checar-antes-do-deploy.mjs
 *
 * Existe por um defeito real, três vezes no mesmo dia (09/09/2026), uma delas em
 * produção: **acento grave dentro de comentário CSS fecha o template literal** que carrega
 * a página inteira. O arquivo continua parecendo certo na leitura, o CSS vira código e o
 * worker responde `Error 1101 — Worker threw exception`. O formulário de cadastro dos
 * clientes ficou fora do ar por ~2 minutos assim.
 *
 * Por que uma trava e não "prestar mais atenção": eu já sabia da armadilha (está escrita em
 * dois outros templates deste mesmo tipo) e caí nela de novo, porque o comentário em que
 * cabe o acento grave é justamente o que explica CSS. Cuidado não escala; verificação sim.
 *
 * O que checa, do mais barato ao mais caro:
 *   1. o módulo IMPORTA (pega erro de sintaxe — é o que faltou no deploy que quebrou)
 *   2. o CSS não vazou para fora do <style> (o sintoma de template fechado cedo)
 *   3. a página de cada formulário RENDERIZA com os marcos esperados (pega página que
 *      "monta" mas sai vazia, que erro de sintaxe não acusa)
 *
 * Saída diferente de 0 = não publique.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const falhas = [];
const ok = (t) => console.log(`  ok    ${t}`);
const falhou = (t, d) => {
  console.log(`  FALHA ${t}`);
  if (d) console.log(`        ${d}`);
  falhas.push(t);
};

/* ---------------------------------------------- 1. o módulo importa */
let mod;
try {
  mod = await import(pathToFileURL(join(raiz, "cardapio.js")).href);
  ok("cardapio.js importa");
} catch (e) {
  falhou("cardapio.js importa", e.message);
  console.log("\nNÃO PUBLIQUE.");
  process.exit(1); // sem o módulo nada mais dá para checar
}

/* ---------------------------------------------- 2. CSS que virou código */
/* A primeira versão desta checagem acusava acento grave em QUALQUER comentário de bloco, e
   marcava os comentários de JSDoc do topo dos arquivos — que estão fora de template literal
   e são legítimos. Oito falsos positivos num arquivo. Uma trava que grita errado é uma trava
   que se aprende a ignorar, então ela passou a olhar o SINTOMA em vez do texto-fonte: quando
   o template fecha cedo, o CSS que vinha depois sai como TEXTO na página, fora do <style>.
   Isso é observável, não heurístico. O erro de sintaxe em si é pego pela checagem 1. */
function cssVazado(html) {
  const fim = html.lastIndexOf("</style>");
  if (fim === -1) return "não há </style> na página";
  const depois = html.slice(fim + 8);
  for (const marca of ["{display:", "{width:", ";color:var(", "px;margin", "!important"]) {
    if (depois.includes(marca)) return `CSS fora do <style>: encontrei "${marca}" depois dele`;
  }
  return null;
}

/* ---------------------------------------------- 3. cada formulário renderiza */
const bancoFalso = (form) => ({
  DB: {
    prepare: () => ({
      bind: () => ({
        first: async () => form,
        all: async () => ({ results: [] }),
        run: async () => ({}),
      }),
    }),
  },
});

/* Um formulário por FORMA de campo em uso hoje. Não é a cópia da produção: é a garantia de
   que todo tipo de campo ainda desenha. Tipo novo entra aqui junto com o código. */
const AMOSTRAS = [
  {
    nome: "todos os tipos de campo",
    perguntas: [
      { rotulo: "Texto", tipo: "texto", obrigatorio: true },
      { rotulo: "Longo", tipo: "obs" },
      { rotulo: "Numero", tipo: "numero" },
      { rotulo: "Escolha", tipo: "escolha", opcoes: ["A", "B"], notas: { A: "nota da A" } },
      { rotulo: "Varias", tipo: "multi", opcoes: ["X", "Y"] },
      { rotulo: "Sim ou nao", tipo: "sim_nao" },
      { rotulo: "Nota", tipo: "nota", escala: 5, pontas: ["ruim", "otimo"] },
      { rotulo: "CPF", tipo: "cpf", obrigatorio: true },
      { rotulo: "CEP", tipo: "cep" },
      { rotulo: "Telefone", tipo: "telefone", obrigatorio: true },
      { rotulo: "E-mail", tipo: "email", obrigatorio: true },
      { rotulo: "Aviso", tipo: "informe", ajuda: "texto do aviso" },
      { rotulo: "Depende", tipo: "texto", depende: { campo: "escolha", valor: "A" } },
    ],
  },
  { nome: "com seções", perguntas: [{ rotulo: "Prato", tipo: "escolha", opcoes: ["1", "2"], secao: "Quarta" }] },
];

const MARCOS = [
  ["<form id=\"f\"", "o formulário em si"],
  ["Enviar resposta", "o botão de envio"],
  ["id=\"barra\"", "a barra de progresso"],
  ["<style>", "a folha de estilo"],
  ["</html>", "o fim do documento"],
];

for (const amostra of AMOSTRAS) {
  const perguntas = mod.limparPerguntas(amostra.perguntas);
  const form = {
    id: 1, slug: "checagem", titulo: "Checagem", sobretitulo: "", subtitulo: "",
    descricao: "", aberto: 1, prazo: "", agradecimento: "", nota_rodape: "",
    token_planilha: "x", perguntas: JSON.stringify(perguntas),
  };
  let html = "";
  try {
    const r = await mod.handleCardapio(
      new Request("http://local/cardapio/checagem"),
      bancoFalso(form)
    );
    html = await r.text();
    if (r.status !== 200) throw new Error(`status ${r.status}`);
  } catch (e) {
    falhou(`renderiza · ${amostra.nome}`, e.message);
    continue;
  }
  const faltando = MARCOS.filter(([m]) => !html.includes(m)).map(([, d]) => d);
  const vazou = cssVazado(html);
  if (faltando.length) falhou(`renderiza · ${amostra.nome}`, `falta ${faltando.join(", ")}`);
  else if (vazou) falhou(`renderiza · ${amostra.nome}`, vazou);
  else if (html.length < 8000) falhou(`renderiza · ${amostra.nome}`, `página curta demais: ${html.length} bytes`);
  else ok(`renderiza · ${amostra.nome} (${(html.length / 1024).toFixed(0)} kB, ${perguntas.length} campos)`);
}

console.log(
  falhas.length
    ? `\n${falhas.length} falha(s). NÃO PUBLIQUE.`
    : "\nTudo certo — pode publicar."
);
process.exit(falhas.length ? 1 : 0);
