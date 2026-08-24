/* ============================================================
   WORKER DO CARDÁPIO — só o formulário público.

   Por que existe separado: em 23/08/2026 o worker "eventos" foi publicado
   de uma cópia do projeto que não tem o módulo do cardápio, e a rota
   /cardapio/<slug> saiu do ar. A produção atual tem anexos em R2 (67
   arquivos em uso) e uma UI que não está em nenhum git — republicar o
   "eventos" daqui apagaria isso.

   Então o formulário volta num worker próprio, apontando para o MESMO
   banco D1. Consequências, todas de propósito:

     · nenhum byte do worker "eventos" é tocado
     · as respostas continuam na mesma tabela: quando a outra cópia
       finalmente juntar o `main`, a aba Cardápio do painel encontra tudo
       onde sempre esteve
     · o próximo deploy da outra cópia não derruba este worker

   O código do formulário é o mesmo `cardapio.js` do sistema — um fonte só,
   nada duplicado.

   Publicar:  npx wrangler deploy -c wrangler.cardapio.toml
   ============================================================ */

import { handleCardapio } from "./cardapio.js";

/* Link curto: aqui o host já é do cardápio, então /<slug> basta e o
   /cardapio/<slug> continua valendo (é o caminho do sistema, e um dia a
   rota volta para lá). A reescrita preserva o /planilha.csv do fim. */
function normalizar(url) {
  if (url.pathname === "/" || url.pathname.startsWith("/cardapio/")) return url;
  const novo = new URL(url);
  novo.pathname = "/cardapio" + url.pathname;
  return novo;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const alvo = normalizar(url);
    const pedido = alvo.href === url.href ? request : new Request(alvo, request);

    const resposta = await handleCardapio(pedido, env);
    if (resposta) return resposta;

    return new Response(paginaVazia(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  },
};

function paginaVazia() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Desbravando UTV</title>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600&display=swap" rel="stylesheet">
<style>body{background:#0A0A0A;color:#FFF;font-family:'Archivo',Arial,sans-serif;display:grid;
place-items:center;min-height:100vh;text-align:center;padding:24px}
h1{font-family:'Anton',sans-serif;font-weight:400;text-transform:uppercase;font-size:28px;margin-bottom:12px}
p{color:#B9B9B9;max-width:400px;font-size:15px}</style></head>
<body><div><h1>Nada neste endereço</h1>
<p>Confira o link com quem enviou, ou fale com a equipe da Desbravando UTV.</p></div></body></html>`;
}
