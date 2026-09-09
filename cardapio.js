/* ============================================================
   FORMULÁRIO DE CARDÁPIO — parte pública (sem chave)

   O QUE É: o motor de formulário público do sistema. O nome ficou da
   primeira versão, mas hoje ele serve qualquer coisa que o cliente
   precise perguntar — o jantar das quatro noites, a avaliação da
   expedição e o CADASTRO com CPF, RG e endereço. O que muda de um
   para o outro é só a lista de perguntas gravada em cardapio_forms.

   Rotas tratadas aqui, antes do portão de autenticação do worker
   (é público de propósito: quem responde é o cliente, sem chave):

     GET  /cardapio/<slug>                     página do formulário
     POST /cardapio/<slug>                     grava a resposta
     GET  /cardapio/<slug>/planilha.csv?t=TOK  CSV para a planilha

   Criar e editar formulário NÃO é aqui: é o painel, em /api/cardapio/*
   no worker.js, com a chave admin.

   O CSV tem token próprio de propósito: a planilha do Google puxa o
   endereço em texto puro (=IMPORTDATA), então não pode ser a APP_KEY.
   Num formulário de cardápio, token vazado expõe preferência de jantar;
   no de cadastro, expõe CPF e RG de todos — trocar o token é um clique
   no painel, e é o que se faz quando o cadastro termina.

   A página é servida montada no servidor: quem responde abre o link no
   celular, no meio do mato, com sinal ruim. Sem framework, sem build.

   Ver docs/ARQUITETURA.md §8.
   ============================================================ */

import { simbolos, usoLogotipo, usoMontanha } from "./marca.js";

/* Curvas de nível do cabeçalho: geradas fora (soma de senos amostrada e suavizada
   em cúbicas) e embutidas como texto — nada é calculado no cliente. */
const TOPOGRAFIA = "<svg class=\"topografia\" viewBox=\"0 0 1200 560\" preserveAspectRatio=\"xMidYMid slice\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"><path d=\"M0 -40C12 -36 50 -21 75 -14C100 -7 125 -1 150 2C175 5 200 4 225 3C250 2 275 -3 300 -6C325 -9 350 -14 375 -16C400 -18 425 -20 450 -20C475 -19 500 -17 525 -15C550 -14 575 -11 600 -11C625 -10 650 -11 675 -14C700 -17 725 -24 750 -31C775 -38 800 -48 825 -56C850 -65 875 -75 900 -81C925 -87 950 -92 975 -94C1000 -95 1025 -93 1050 -90C1075 -87 1100 -81 1125 -75C1150 -70 1188 -62 1200 -59\"/><path d=\"M0 77C12 76 50 74 75 71C100 68 125 63 150 60C175 58 200 55 225 55C250 54 275 56 300 58C325 59 350 63 375 64C400 64 425 66 450 63C475 61 500 57 525 51C550 45 575 35 600 27C625 19 650 8 675 1C700 -7 725 -14 750 -17C775 -20 800 -20 825 -18C850 -17 875 -11 900 -7C925 -2 950 5 975 10C1000 15 1025 19 1050 21C1075 24 1100 24 1125 24C1150 24 1188 22 1200 21\"/><path d=\"M0 130C12 130 50 129 75 131C100 132 125 135 150 137C175 138 200 141 225 140C250 139 275 136 300 131C325 126 350 118 375 110C400 102 425 91 450 83C475 75 500 67 525 62C550 57 575 55 600 55C625 55 650 59 675 63C700 67 725 74 750 79C775 84 800 89 825 92C850 95 875 97 900 97C925 98 950 96 975 95C1000 95 1025 93 1050 94C1075 95 1100 98 1125 102C1150 107 1188 118 1200 121\"/><path d=\"M0 215C12 214 50 214 75 210C100 207 125 200 150 193C175 185 200 175 225 166C250 158 275 148 300 142C325 136 350 131 375 130C400 128 425 130 450 133C475 136 500 143 525 148C550 152 575 159 600 162C625 166 650 169 675 170C700 171 725 169 750 169C775 168 800 166 825 167C850 167 875 168 900 171C925 175 950 181 975 188C1000 194 1025 204 1050 211C1075 219 1100 227 1125 232C1150 237 1188 238 1200 240\"/><path d=\"M0 250C12 245 50 231 75 223C100 216 125 210 150 206C175 203 200 203 225 205C250 207 275 212 300 217C325 221 350 228 375 232C400 236 425 240 450 242C475 244 500 243 525 243C550 242 575 240 600 240C625 239 650 239 675 242C700 244 725 249 750 254C775 260 800 269 825 277C850 285 875 294 900 300C925 306 950 311 975 313C1000 314 1025 313 1050 309C1075 306 1100 299 1125 292C1150 286 1188 275 1200 271\"/><path d=\"M0 278C12 280 50 283 75 287C100 290 125 297 150 301C175 306 200 311 225 313C250 316 275 316 300 316C325 316 350 314 375 313C400 313 425 311 450 313C475 314 500 317 525 322C550 327 575 335 600 343C625 350 650 360 675 367C700 374 725 381 750 384C775 387 800 388 825 386C850 384 875 378 900 373C925 367 950 359 975 352C1000 346 1025 339 1050 335C1075 331 1100 329 1125 328C1150 327 1188 328 1200 328\"/><path d=\"M0 384C12 385 50 389 75 389C100 390 125 388 150 387C175 387 200 384 225 385C250 386 275 387 300 391C325 395 350 402 375 409C400 416 425 426 450 433C475 441 500 449 525 454C550 459 575 461 600 461C625 461 650 457 675 452C700 448 725 439 750 433C775 427 800 419 825 414C850 409 875 406 900 404C925 402 950 403 975 403C1000 403 1025 405 1050 405C1075 404 1100 403 1125 400C1150 397 1188 389 1200 386\"/><path d=\"M0 458C12 458 50 458 75 461C100 463 125 469 150 475C175 481 200 491 225 499C250 506 275 516 300 522C325 528 350 533 375 534C400 536 425 534 450 531C475 527 500 520 525 514C550 508 575 500 600 494C625 489 650 484 675 481C700 478 725 478 750 478C775 477 800 480 825 480C850 480 875 480 900 478C925 476 950 471 975 466C1000 461 1025 453 1050 447C1075 440 1100 433 1125 428C1150 424 1188 422 1200 421\"/><path d=\"M0 564C12 568 50 582 75 589C100 596 125 603 150 606C175 609 200 609 225 607C250 605 275 600 300 594C325 589 350 580 375 574C400 568 425 562 450 559C475 555 500 554 525 553C550 552 575 554 600 554C625 554 650 556 675 554C700 553 725 550 750 546C775 541 800 534 825 528C850 521 875 513 900 507C925 502 950 497 975 495C1000 494 1025 495 1050 499C1075 502 1100 510 1125 517C1150 524 1188 538 1200 542\"/><path d=\"M0 682C12 681 50 678 75 673C100 669 125 661 150 655C175 649 200 642 225 637C250 633 275 630 300 629C325 627 350 628 375 629C400 629 425 631 450 630C475 629 500 628 525 625C550 621 575 615 600 609C625 603 650 594 675 588C700 581 725 575 750 572C775 569 800 568 825 570C850 572 875 578 900 584C925 590 950 600 975 607C1000 615 1025 624 1050 629C1075 635 1100 639 1125 641C1150 643 1188 642 1200 642\"/></svg>";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/**
 * CPF: só entra se os dígitos verificadores fecharem. Não é preciosismo — o formulário
 * existe para alimentar cadastro e contrato, e CPF digitado errado só aparece quando o
 * contrato volta ou o cadastro é recusado, dias depois, com o cliente esperando. Erro de
 * digitação quase sempre quebra o dígito verificador, então a checagem pega na hora, com
 * o cliente ainda na tela.
 *
 * Devolve o CPF formatado (000.000.000-00) ou null. Formata sempre, independente de como
 * a pessoa digitou: a planilha do cadastro fica com uma coluna homogênea.
 */
function limparCpf(bruto) {
  const d = String(bruto ?? "").replace(/[^0-9]/g, "");
  if (d.length !== 11) return null;
  if (new Set(d).size === 1) return null; // 111.111.111-11 fecha a conta e nao existe
  for (const [ate, pos] of [[9, 10], [10, 11]]) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (pos - i);
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(d[ate])) return null;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * E-mail: validação DELIBERADAMENTE frouxa. O contrato sai por e-mail, então o campo
 * precisa pegar o erro de digitação — mas regra apertada demais recusa e-mail válido e
 * trava a reserva de um cliente real, estrago muito maior do que um endereço torto que a
 * gente conserta perguntando. Exige só o que todo e-mail tem: uma arroba, algo antes dela,
 * e um domínio com ponto. Guarda em minúsculas, senão a mesma pessoa entra duas vezes na
 * planilha com grafia diferente.
 */
function limparEmail(bruto) {
  const e = String(bruto ?? "").trim().toLowerCase().slice(0, 200);
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e) ? e : null;
}

/** CEP: oito dígitos, devolvidos como 00000-000. Sem consulta externa — a página tem de
    abrir e funcionar com sinal ruim, e endereço vindo de fora chega errado em zona rural. */
function limparCep(bruto) {
  const d = String(bruto ?? "").replace(/[^0-9]/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : null;
}

/* Promessa do rodapé quando o formulário não define a sua. Genérica de propósito: o
   texto antigo era do cardápio ("planejar a alimentação") e ficava errado em qualquer
   outro formulário — no de avaliação, chegava a prometer que nada é publicado
   justamente onde o cliente pode querer publicar o elogio. */
const NOTA_RODAPE_PADRAO =
  "Usamos estas respostas só para organizar a expedição. Nada é publicado nem repassado para terceiros.";

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

const TIPOS = new Set(["texto", "numero", "escolha", "multi", "sim_nao", "obs", "nota", "cpf", "cep", "email", "informe"]);

/* `nota` é escala de avaliação (1..escala), não número livre: nota é comparável entre
   respostas e cabe num toque, enquanto `numero` aceita 0 a 999 e é digitado. A escala
   entra no dado porque 1-5 e 1-10 medem coisas diferentes e quem edita o formulário
   decide — 5 é o padrão porque é o que o cliente pediu ("nota") e o que fecha numa
   linha no celular. */
const NOTA_ESCALA_PADRAO = 5;

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
    /* Pergunta condicional: só aparece quando outra tem um valor específico. Sem isso, a
       alternativa é perguntar sempre ("se for acompanhante, nome do piloto") e conviver com
       coluna meio vazia e com piloto preenchendo campo que não é dele. O `campo` é validado
       contra os ids JÁ aceitos: dependência de pergunta que veio depois, ou que nem existe,
       seria campo invisível para sempre. */
    if (p?.depende && typeof p.depende === "object") {
      const de = String(p.depende.campo ?? "").trim();
      const val = String(p.depende.valor ?? "").slice(0, 80).trim();
      if (vistos.has(de) && de !== unico && val) item.depende = { campo: de, valor: val };
    }
    if (tipo === "nota") {
      const e = parseInt(String(p?.escala ?? NOTA_ESCALA_PADRAO), 10);
      item.escala = Number.isFinite(e) && e >= 3 && e <= 10 ? e : NOTA_ESCALA_PADRAO;
      /* Rótulo das pontas: escala sem âncora deixa o respondente adivinhar se 1 é
         bom ou ruim, e a nota vira ruído. Só entra se vierem os dois. */
      const pontas = (Array.isArray(p?.pontas) ? p.pontas : [])
        .map((t) => String(t).slice(0, 40).trim())
        .filter(Boolean);
      if (pontas.length === 2) item.pontas = pontas;
    }
    if (tipo === "escolha" || tipo === "multi") {
      const opcoes = (Array.isArray(p?.opcoes) ? p.opcoes : String(p?.opcoes ?? "").split(/\s*[;\n]\s*/))
        .map((o) => String(o).slice(0, 80).trim())
        .filter(Boolean)
        .slice(0, 30);
      if (!opcoes.length) continue; // escolha sem opção não vira campo
      item.opcoes = opcoes;
      /* Linha de apoio por opção. Fica FORA de `opcoes` de propósito: o texto da
         opção é o valor gravado e validado, então mudar a nota nunca invalida
         resposta já no banco. Só entra nota de opção que existe. */
      if (p?.notas && typeof p.notas === "object") {
        const notas = {};
        for (const o of opcoes) {
          const t = String(p.notas[o] ?? "").slice(0, 160).trim();
          if (t) notas[o] = t;
        }
        if (Object.keys(notas).length) item.notas = notas;
      }
    }
    saida.push(item);
  }
  return saida;
}

/* -------------------------------------------------- página pública */

/**
 * Um campo. A seção NÃO sai daqui: quem monta os blocos por noite é o
 * corpoCampos(), que precisa abrir e fechar <section> em volta de vários campos.
 */
function campoHtml(p) {
  const req = p.obrigatorio ? " required" : "";
  const ajuda = p.ajuda ? `<small class="ajuda">${esc(p.ajuda)}</small>` : "";
  const marca = p.obrigatorio ? "" : ' <i class="opc">opcional</i>';
  /* Nome de prato não cabe lado a lado no celular. O limiar é baixo (16) de
     propósito: com um valor alto, um bloco saía em cartões de larguras desiguais e o
     seguinte em lista, e a mistura desalinha a página. Fica inline só o que é
     realmente curto — Sim/Não e afins. */
  const empilha = (p.opcoes ?? []).some((o) => String(o).length > 16) ? " col" : "";
  const opcao = (o, tipo) => {
    const nota = p.notas?.[o];
    return (
      `<label class="op${nota ? " com-nota" : ""}">` +
      `<input type="${tipo}" name="${esc(p.id)}" value="${esc(o)}"${tipo === "radio" ? req : ""}>` +
      `<i class="marca" aria-hidden="true"></i>` +
      `<span class="txt">${esc(o)}${nota ? `<i class="nota">${esc(nota)}</i>` : ""}</span>` +
      `</label>`
    );
  };

  let controle = "";
  if (p.tipo === "obs") {
    controle = `<textarea name="${esc(p.id)}" rows="3" maxlength="800" placeholder="Escreva aqui"${req}></textarea>`;
  } else if (p.tipo === "email") {
    controle =
      `<input type="email" inputmode="email" autocomplete="email" autocapitalize="off" ` +
      `spellcheck="false" maxlength="200" placeholder="voce@email.com"${req} name="${esc(p.id)}">`;
  } else if (p.tipo === "cpf") {
    controle =
      `<input type="text" inputmode="numeric" autocomplete="off" maxlength="14" ` +
      `placeholder="000.000.000-00" data-mascara="cpf"${req} name="${esc(p.id)}">`;
  } else if (p.tipo === "cep") {
    controle =
      `<input type="text" inputmode="numeric" autocomplete="postal-code" maxlength="9" ` +
      `placeholder="00000-000" data-mascara="cep"${req} name="${esc(p.id)}">`;
  } else if (p.tipo === "numero") {
    controle = `<input type="number" inputmode="numeric" min="0" max="999" placeholder="0"${req} name="${esc(p.id)}">`;
  } else if (p.tipo === "nota") {
    const max = p.escala ?? NOTA_ESCALA_PADRAO;
    const botoes = Array.from({ length: max }, (_, i) => i + 1)
      .map(
        (n) =>
          `<label class="nt"><input type="radio" name="${esc(p.id)}" value="${n}"${req}>` +
          `<span class="anton">${n}</span></label>`
      )
      .join("");
    controle =
      `<div class="notas">${botoes}</div>` +
      (p.pontas
        ? `<div class="pontas"><span>${esc(p.pontas[0])}</span><span>${esc(p.pontas[1])}</span></div>`
        : "");
  } else if (p.tipo === "sim_nao") {
    controle = `<div class="opcoes">${["Sim", "Não"].map((o) => opcao(o, "radio")).join("")}</div>`;
  } else if (p.tipo === "escolha") {
    controle = `<div class="opcoes${empilha}">${p.opcoes.map((o) => opcao(o, "radio")).join("")}</div>`;
  } else if (p.tipo === "multi") {
    controle = `<div class="opcoes${empilha}">${p.opcoes.map((o) => opcao(o, "checkbox")).join("")}</div>`;
  } else {
    controle = `<input type="text" maxlength="200" placeholder="Escreva aqui"${req} name="${esc(p.id)}">`;
  }
  /* `informe` não é pergunta: é informação dentro do formulário (o valor do pacote, uma
     condição de pagamento). Não tem controle, não conta na barra de progresso e NÃO VIRA
     COLUNA na planilha — coluna vazia com título de aviso é o tipo de sujeira que faz quem
     lê a planilha desconfiar do resto. */
  if (p.tipo === "informe") {
    return `<div class="informe" data-informe="${esc(p.id)}">
      <span class="informe-rot">${esc(p.rotulo)}</span>
      ${p.ajuda ? `<p class="informe-txt">${esc(p.ajuda)}</p>` : ""}
    </div>`;
  }

  /* Campo condicional nasce escondido e SEM required: se nascesse obrigatório e oculto, o
     navegador barraria o envio apontando para um campo que ninguém vê. Quem devolve o
     required é o script, quando a condição passa a valer. */
  const dep = p.depende
    ? ` hidden data-de="${esc(p.depende.campo)}" data-de-valor="${esc(p.depende.valor)}"` +
      (p.obrigatorio ? ` data-req="1"` : "")
    : "";
  const controleFinal = p.depende && p.obrigatorio ? controle.replace(" required", "") : controle;
  return `<div class="campo" data-campo="${esc(p.id)}"${dep}>
      <label class="rot">${esc(p.rotulo)}${marca}</label>${ajuda}${controleFinal}
    </div>`;
}

/**
 * Monta o corpo agrupando por seção. Cada seção vira um bloco numerado — é o que
 * dá ritmo de "uma noite por vez" em vez de uma lista longa de perguntas.
 */
function corpoCampos(perguntas) {
  let html = "";
  let dentro = false;
  let n = 0;
  for (const p of perguntas) {
    if (p.secao) {
      if (dentro) html += `</section>`;
      n += 1;
      html +=
        `<section class="bloco">` +
        `<h2 class="cab"><i class="num anton">${String(n).padStart(2, "0")}</i>` +
        `<span class="nome">${esc(p.secao)}</span><i class="risco"></i></h2>`;
      dentro = true;
    }
    html += campoHtml(p);
  }
  return html + (dentro ? `</section>` : "");
}

export function paginaFormulario(form, perguntas) {
  const fechado = !form.aberto;
  const obrigatorias = perguntas.filter((p) => p.obrigatorio).length;

  const corpo = fechado
    ? `<div class="cartao">
         ${usoMontanha('class="selo"')}
         <h2 class="anton">As respostas foram encerradas</h2>
         <p>Este formulário está fechado. Se você ainda precisa falar alguma coisa com a
            gente, fale direto com a equipe da Desbravando.</p>
       </div>`
    : `<form id="f" novalidate>
         ${corpoCampos(perguntas)}
         <div class="enviar">
           <button class="btn" type="submit" id="env">
             <span>Enviar resposta</span>
             <svg viewBox="0 0 20 12" aria-hidden="true"><path d="M0 6h17M12 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
           </button>
           <p class="lgpd">${esc(String(form.nota_rodape ?? "").trim() || NOTA_RODAPE_PADRAO)}</p>
         </div>
       </form>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0A0A0A">
<title>${esc(form.titulo)} · Desbravando UTV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0A0A0A; --bg2:#0E0E0E; --cartao:#131313; --cartao2:#171717;
  --linha:#242424; --linha2:#333; --txt:#FFF; --mut:#B9B9B9; --dim:#7C7C7C; --erro:#E86A6A;
}
*{margin:0;padding:0;box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--txt);font-family:'Archivo',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;padding-bottom:64px}
.anton{font-family:'Anton',sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:-.4px;line-height:.98}
.wrap{max-width:640px;margin:0 auto;padding:0 22px}
:focus-visible{outline:2px solid #FFF;outline-offset:3px;border-radius:6px}

/* ---------- progresso: 2 px no topo, único indicador de que falta algo ---------- */
.progresso{position:fixed;inset:0 0 auto;height:2px;background:#1C1C1C;z-index:9}
.progresso i{display:block;height:100%;width:0;background:#FFF;transition:width .25s ease}

/* ---------- cabeçalho ---------- */
header{position:relative;overflow:hidden;border-bottom:1px solid var(--linha);
  background:linear-gradient(#101010,var(--bg));padding:40px 0 30px;margin-bottom:34px}
/* curvas de nível: textura só no hero, o formulário fica limpo */
.topografia{position:absolute;inset:-30% -10% auto -10%;height:150%;color:#FFF;opacity:.055;pointer-events:none}
header .wrap{position:relative}
.logo{display:block;width:172px;height:auto;color:#FFF;margin-bottom:26px}
.sobre{font-size:10.5px;letter-spacing:2.6px;text-transform:uppercase;color:var(--dim);margin-bottom:10px}
h1{font-size:clamp(30px,8.5vw,42px);max-width:15ch;text-wrap:balance}
.sub{color:var(--mut);font-size:15px;margin-top:12px}
.regua{width:46px;height:2px;background:#FFF;margin:24px 0 20px;opacity:.85}
.desc{color:var(--mut);font-size:15px;white-space:pre-line;max-width:52ch}
.prazo{display:inline-flex;align-items:center;gap:8px;margin-top:18px;font-size:12.5px;color:var(--mut);
  border:1px solid var(--linha2);border-radius:99px;padding:6px 14px}
.prazo b{color:#FFF;font-weight:600}
.prazo::before{content:"";width:6px;height:6px;border-radius:50%;background:#FFF;flex:none}

/* ---------- bloco por noite ---------- */
.bloco{margin-bottom:38px}
.cab{display:flex;align-items:center;gap:12px;margin-bottom:20px}
.cab .num{font-size:15px;color:var(--dim);letter-spacing:0;font-variant-numeric:tabular-nums}
.cab .nome{font-size:11.5px;letter-spacing:2.6px;text-transform:uppercase;color:#FFF;font-weight:600;white-space:nowrap}
.cab .risco{flex:1;height:1px;background:var(--linha)}

/* ---------- campo ---------- */
.campo{margin-bottom:24px}
.rot{display:block;font-size:16px;font-weight:600;letter-spacing:-.1px}
.opc{font-style:normal;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:var(--dim);
  border:1px solid var(--linha);border-radius:99px;padding:2px 7px;margin-left:8px;vertical-align:2px}
.ajuda{display:block;color:var(--dim);font-size:13px;margin-top:3px}
/* Seletor por exclusão, não por lista de tipos: era [type=text],[type=number] e o campo
   de e-mail entrou sem estilo nenhum — caixa branca do navegador no meio de um formulário
   escuro. Lista de tipos permitidos esquece o tipo que ainda não existe. */
input:not([type=radio]):not([type=checkbox]),textarea{width:100%;margin-top:10px;background:var(--cartao);
  border:1px solid var(--linha);color:var(--txt);border-radius:12px;padding:14px 15px;
  font-family:inherit;font-size:16px;transition:border-color .15s}
input:hover,textarea:hover{border-color:var(--linha2)}
input:focus,textarea:focus{outline:none;border-color:#FFF}
::placeholder{color:#4E4E4E}
textarea{resize:vertical;line-height:1.5}

/* ---------- opções ---------- */
.opcoes{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
.opcoes.col{flex-direction:column}
.op{position:relative;display:flex;align-items:center;gap:12px;flex:0 1 auto;
  background:var(--cartao);border:1px solid var(--linha);border-radius:12px;
  padding:14px 17px 14px 15px;font-size:15.5px;cursor:pointer;
  transition:border-color .15s,background .15s,transform .12s}
.opcoes.col .op{width:100%}
.op:hover{border-color:var(--linha2);background:var(--cartao2)}
.op input{position:absolute;opacity:0;width:0;height:0}
/* indicador desenhado: com accent-color o radio desmarcado fica branco cheio no
   fundo escuro e o formulário parece já respondido */
.op .marca{flex:none;width:19px;height:19px;border:1.5px solid #5E5E5E;border-radius:50%;
  position:relative;transition:border-color .15s,background .15s}
.op input[type=checkbox]~.marca{border-radius:6px}
.op .txt{min-width:0;display:block}
.op .nota{display:block;font-style:normal;font-size:13px;line-height:1.45;color:var(--dim);margin-top:3px}
.op.com-nota{align-items:flex-start}
.op.com-nota .marca{margin-top:2px}
.op:has(input:checked) .nota{color:var(--mut)}
.op:has(input:checked){border-color:#FFF;background:#1B1B1B}
.op:has(input:checked)::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;
  background:#FFF;border-radius:0 3px 3px 0}
.op input:checked~.marca{border-color:#FFF}
.op input[type=radio]:checked~.marca::after{content:"";position:absolute;inset:3.5px;background:#FFF;border-radius:50%}
.op input[type=checkbox]:checked~.marca{background:#FFF}
.op input[type=checkbox]:checked~.marca::after{content:"";position:absolute;left:5.5px;top:2px;
  width:4px;height:9px;border:solid #000;border-width:0 2px 2px 0;transform:rotate(45deg)}
.op:focus-within{outline:2px solid #FFF;outline-offset:3px}
.op:active{transform:scale(.995)}

/* ---------- nota ----------
   flex com base de 56px em vez de grid de N colunas: numa escala de 1 a 10 o grid
   deixaria cada botao com ~25px no celular, menor que o alvo de toque; assim os
   cinco enchem a linha e os dez quebram em duas linhas de cinco.
   Selecionado fica SOLIDO (fundo branco, numero preto) — na escala o que importa e
   ver de longe qual foi marcada, e contorno se perde entre cinco caixas iguais. */
.notas{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}
.nt{position:relative;flex:1 1 56px;min-width:56px;display:grid;place-items:center;
  background:var(--cartao);border:1px solid var(--linha);border-radius:12px;
  padding:15px 0;cursor:pointer;transition:border-color .15s,background .15s,transform .12s}
.nt:hover{border-color:var(--linha2);background:var(--cartao2)}
.nt input{position:absolute;opacity:0;width:0;height:0}
.nt span{font-size:25px;color:var(--mut);transition:color .15s}
.nt:has(input:checked){background:#FFF;border-color:#FFF}
.nt:has(input:checked) span{color:#000}
.nt:focus-within{outline:2px solid #FFF;outline-offset:3px}
.nt:active{transform:scale(.99)}
.pontas{display:flex;justify-content:space-between;gap:12px;margin-top:9px;
  font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:var(--dim)}

/* ---------- informe ----------
   Painel, não texto solto: o valor do pacote é o número que a pessoa está aceitando e
   precisa ler como declaração, não como observação em letra miúda. */
.informe{margin:24px 0 4px;background:var(--cartao);border:1px solid var(--linha2);
  border-radius:14px;padding:18px 19px}
.informe-rot{display:block;font-family:'Anton',sans-serif;font-weight:400;
  text-transform:uppercase;letter-spacing:-.2px;font-size:22px;line-height:1.15;color:#FFF}
.informe-txt{margin-top:9px;font-size:14.5px;line-height:1.55;color:var(--mut)}

/* ---------- envio ---------- */
.enviar{border-top:1px solid var(--linha);padding-top:26px;margin-top:36px}
.btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:12px;
  background:#FFF;color:#000;border:none;border-radius:14px;padding:18px;
  font-family:inherit;font-size:16.5px;font-weight:700;letter-spacing:-.1px;cursor:pointer;transition:opacity .15s}
.btn svg{width:20px}
.btn:hover{opacity:.9}
.btn:disabled{opacity:.45;cursor:default}
.lgpd{color:var(--dim);font-size:12.5px;margin-top:16px;text-align:center}

/* ---------- cartão de aviso / fim ---------- */
.cartao{background:var(--cartao);border:1px solid var(--linha);border-radius:18px;padding:34px 28px}
.cartao .selo{display:block;width:52px;color:#FFF;opacity:.9;margin-bottom:20px}
.cartao h2{font-size:26px;margin-bottom:12px}
.cartao p{color:var(--mut);font-size:15px}
.resumo{margin-top:24px;border-top:1px solid var(--linha);padding-top:20px}
.resumo h3{font-size:10.5px;letter-spacing:2.4px;text-transform:uppercase;color:var(--dim);margin-bottom:14px}
.resumo dl{display:grid}
.resumo .par{display:grid;gap:3px;padding:12px 0;border-top:1px solid #1E1E1E}
.resumo .par:first-child{border-top:none;padding-top:0}
.resumo dt{font-size:10.5px;letter-spacing:1.8px;text-transform:uppercase;color:var(--dim)}
.resumo dd{color:#FFF;font-weight:600;font-size:15.5px;line-height:1.35}

/* ---------- erro ---------- */
.erro{display:none;gap:10px;align-items:flex-start;background:#241414;border:1px solid #4E2626;
  color:#FFD3D3;border-radius:12px;padding:14px 16px;font-size:14px;margin-bottom:22px}
.erro.on{display:flex}
.erro svg{flex:none;width:18px;margin-top:2px}
.campo.falta input,.campo.falta textarea{border-color:var(--erro)}
.campo.falta .rot::after{content:"falta responder";display:inline-block;margin-left:8px;font-size:10px;
  letter-spacing:1.4px;text-transform:uppercase;color:var(--erro);font-weight:600;vertical-align:2px}
.campo.falta .op{border-color:#4E2626}

footer{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:46px;
  color:#4A4A4A;font-size:10px;letter-spacing:2.4px;text-transform:uppercase}
footer svg{width:22px;color:#4A4A4A}

@media(prefers-reduced-motion:reduce){*{transition:none!important}}
@media(min-width:620px){
  header{padding:56px 0 40px}
  .logo{width:196px}
  .op{padding:15px 19px 15px 17px}
}
</style>
</head>
<body>
${simbolos()}
<div class="progresso" aria-hidden="true"><i id="barra"></i></div>

<header>
  ${TOPOGRAFIA}
  <div class="wrap">
    ${usoLogotipo('class="logo" role="img" aria-label="Desbravando UTV"')}
    ${form.sobretitulo ? `<p class="sobre">${esc(form.sobretitulo)}</p>` : ""}
    <h1 class="anton">${esc(form.titulo)}</h1>
    ${form.subtitulo ? `<p class="sub">${esc(form.subtitulo)}</p>` : ""}
    ${form.descricao ? `<div class="regua"></div><p class="desc">${esc(form.descricao)}</p>` : ""}
    ${!fechado && form.prazo ? `<p class="prazo">Responda até <b>${esc(form.prazo)}</b></p>` : ""}
  </div>
</header>

<main class="wrap">
  <div class="erro" id="erro">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <circle cx="10" cy="10" r="8.2"/><path d="M10 6v5.4M10 14.2v.2"/></svg>
    <span id="erro_txt"></span>
  </div>
  ${corpo}
  <div class="cartao" id="fim" style="display:none">
    ${usoMontanha('class="selo"')}
    <h2 class="anton" id="fim_titulo">Escolha registrada</h2>
    <p>${esc(form.agradecimento || "Obrigado! A cozinha já recebeu. Se mudar algo, responda de novo — vale a última resposta.")}</p>
    <div class="resumo" id="resumo" style="display:none">
      <h3>O que você escolheu</h3>
      <dl id="resumo_lista"></dl>
    </div>
  </div>
</main>

<footer>${usoMontanha()} Desbravando UTV</footer>

<script>
(function(){
  var f = document.getElementById("f");
  if (!f) return;
  var erro = document.getElementById("erro"), erroTxt = document.getElementById("erro_txt");
  var btn = document.getElementById("env"), barra = document.getElementById("barra");
  /* Campo condicional muda o denominador da barra: com número fixo, marcar
     "acompanhante" fazia a barra andar para trás. O total é recontado a cada passada,
     sobre o que está visível. */
  function condicionais(){
    Array.prototype.forEach.call(f.querySelectorAll("[data-de]"), function(c){
      var de = c.getAttribute("data-de"), esperado = c.getAttribute("data-de-valor");
      var marcado = f.querySelector('[name="' + de + '"]:checked');
      var vale = marcado ? marcado.value === esperado : false;
      c.hidden = !vale;
      var campo = c.querySelector("input,textarea,select");
      if (campo){
        if (vale && c.getAttribute("data-req")) campo.setAttribute("required", "");
        if (!vale){ campo.removeAttribute("required"); campo.value = ""; }
      }
      if (!vale) c.classList.remove("falta");
    });
  }

  /* rótulo de cada pergunta, com a seção herdada do bloco — o mesmo critério da
     planilha, para o resumo final não dizer "Escolha seu prato" quatro vezes */
  var ROTULOS = {};
  Array.prototype.forEach.call(f.querySelectorAll("[data-campo]"), function(c){
    var bloco = c.closest(".bloco");
    var sec = bloco ? (bloco.querySelector(".cab .nome") || {}).textContent : "";
    var rot = c.querySelector(".rot").textContent.replace(/\\s*opcional\\s*$/, "").trim();
    ROTULOS[c.getAttribute("data-campo")] = sec ? sec + " · " + rot : rot;
  });

  function valores(){
    var d = {};
    Array.prototype.forEach.call(f.elements, function(el){
      if (!el.name) return;
      if (el.type === "checkbox") { if (el.checked) (d[el.name] = d[el.name] || []).push(el.value); }
      else if (el.type === "radio") { if (el.checked) d[el.name] = el.value; }
      else if (String(el.value).trim()) d[el.name] = el.value.trim();
    });
    return d;
  }

  function respondido(campo){
    var req = campo.querySelector("[required]");
    if (!req) return true;
    var grupo = f.querySelectorAll('[name="' + req.getAttribute("name") + '"]');
    for (var i = 0; i < grupo.length; i++){
      var el = grupo[i];
      if (el.type === "radio" || el.type === "checkbox") { if (el.checked) return true; }
      else if (String(el.value).trim()) return true;
    }
    return false;
  }

  function progresso(){
    var total = 0;
    Array.prototype.forEach.call(f.querySelectorAll("[data-campo]"), function(c){
      if (!c.hidden && c.querySelector("[required]")) total++;
    });
    if (!total) { barra.style.width = "0%"; return; }
    var feitas = 0;
    Array.prototype.forEach.call(f.querySelectorAll("[data-campo]"), function(c){
      if (!c.hidden && c.querySelector("[required]") && respondido(c)) feitas++;
    });
    barra.style.width = Math.round(feitas / total * 100) + "%";
  }
  /* Máscara enquanto digita. Só formata o que já foi digitado — nunca completa nem
     corrige, porque campo que "conserta" o número do documento do cliente é campo que
     grava documento errado com aparência de certo. */
  f.addEventListener("input", function(e){
    var el = e.target, tipo = el.getAttribute && el.getAttribute("data-mascara");
    if (tipo) {
      var d = el.value.replace(/[^0-9]/g, "");
      if (tipo === "cpf") {
        d = d.slice(0, 11);
        el.value = d.length > 9 ? d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6,9)+"-"+d.slice(9)
                 : d.length > 6 ? d.slice(0,3)+"."+d.slice(3,6)+"."+d.slice(6)
                 : d.length > 3 ? d.slice(0,3)+"."+d.slice(3)
                 : d;
      } else {
        d = d.slice(0, 8);
        el.value = d.length > 5 ? d.slice(0,5)+"-"+d.slice(5) : d;
      }
    }
    progresso();
    var c = e.target.closest(".campo");
    if (c && c.classList.contains("falta") && respondido(c)) c.classList.remove("falta");
  });
  f.addEventListener("change", function(){ condicionais(); progresso(); });
  condicionais();
  progresso();

  f.addEventListener("submit", function(ev){
    ev.preventDefault();
    erro.classList.remove("on");
    var faltando = [];
    Array.prototype.forEach.call(f.querySelectorAll("[data-campo]"), function(c){
      c.classList.remove("falta");
      if (!respondido(c)) { faltando.push(c); c.classList.add("falta"); }
    });
    if (faltando.length) {
      erroTxt.textContent = faltando.length === 1
        ? "Falta responder um campo. Marcamos ele abaixo."
        : "Faltam " + faltando.length + " respostas. Marcamos elas abaixo.";
      erro.classList.add("on");
      faltando[0].scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    var dados = valores();
    btn.disabled = true; btn.querySelector("span").textContent = "Enviando…";
    fetch(location.pathname, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ respostas: dados })
    }).then(function(r){ return r.json().then(function(j){ if(!r.ok) throw new Error(j.erro||"Erro"); return j; }); })
      .then(function(){
        /* devolve a escolha na tela: quem respondeu por quatro noites quer conferir */
        var nome = "";
        var lista = document.getElementById("resumo_lista"), n = 0;
        Object.keys(ROTULOS).forEach(function(id){
          var v = dados[id];
          if (v === undefined) return;
          // rótulo sem " · " = campo fora dos blocos de noite, ou seja o nome
          if (!nome && typeof v === "string" && ROTULOS[id].indexOf(" · ") === -1) nome = v;
          var linha = document.createElement("div");
          linha.className = "par";
          var dt = document.createElement("dt"); dt.textContent = ROTULOS[id];
          var dd = document.createElement("dd"); dd.textContent = Array.isArray(v) ? v.join(", ") : v;
          linha.appendChild(dt); linha.appendChild(dd); lista.appendChild(linha); n++;
        });
        if (n) document.getElementById("resumo").style.display = "block";
        if (nome) document.getElementById("fim_titulo").textContent = "Obrigado, " + nome.split(" ")[0];
        f.style.display = "none";
        barra.style.width = "100%";
        document.getElementById("fim").style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function(e){
        erroTxt.textContent = e.message + " — tente de novo em alguns segundos.";
        erro.classList.add("on");
        btn.disabled = false; btn.querySelector("span").textContent = "Enviar resposta";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
  });
})();
</script>
</body>
</html>`;
}

/* ---------------------------------------------------------- CSV */

const celula = (v, sep = ";") => {
  let s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
  s = s.replace(/\r?\n/g, " ");
  // apóstrofo na frente de = + - @ : impede a planilha de interpretar como fórmula
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  // aspas quando o texto contém o separador em uso ou aspas
  return s.includes(sep) || s.includes('"')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
};

/**
 * Respostas → CSV. Uma coluna por pergunta, na ordem do formulário.
 *
 * Resposta cuja pergunta foi apagada depois vira coluna extra no fim, com o id
 * cru no cabeçalho: quem editou o formulário no meio do caminho não perde dado
 * que já tinha chegado — a planilha é o registro.
 */
export function respostasCsv(perguntas, linhas, sep = ";") {
  /* `informe` sai fora: não é pergunta, não tem resposta, e viraria coluna vazia. */
  perguntas = perguntas.filter((p) => p.tipo !== "informe");
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
  /* ";" por padrão porque é o que a planilha do cliente já usa e funciona:
     `=IMPORTDATA(url;";")`. Mudar o padrão quebraria fórmula em produção — o
     segundo argumento diz ao Sheets em que caractere separar, então dado em
     vírgula com fórmula pedindo ";" cai tudo numa coluna só. `?sep=,` entrega o
     CSV padrão para quem precisar. */
  return [cab, ...corpo].map((linha) => linha.map((v) => celula(v, sep)).join(sep))
    .join("\r\n") + "\r\n";
}

/* ------------------------------------------------------- rotas */

const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });

const COLUNAS_FORM = `id, evento_id, slug, titulo, sobretitulo, subtitulo, descricao,
            perguntas, aberto, prazo, agradecimento, token_planilha`;

/**
 * Busca o formulário tolerando banco sem a migração v4.5. Deploy do worker e migração
 * do banco são dois passos, e se o worker chegar primeiro o SELECT com a coluna nova
 * falha — servir o formulário sem a nota personalizada é muito melhor do que devolver
 * erro para quem abriu o link no meio do mato.
 */
async function achaForm(env, slug) {
  try {
    return await env.DB.prepare(
      `SELECT ${COLUNAS_FORM}, nota_rodape FROM cardapio_forms WHERE slug=?`
    ).bind(slug).first();
  } catch {
    return await env.DB.prepare(
      `SELECT ${COLUNAS_FORM} FROM cardapio_forms WHERE slug=?`
    ).bind(slug).first();
  }
}

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

  const form = await achaForm(env, slug);

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
    /* Sem content-disposition: com ele o buscador do Google trata a resposta como
       arquivo para baixar em vez de dado, e o IMPORTDATA reclama que não alcançou
       a URL. */
    const sep = url.searchParams.get("sep") === "," ? "," : ";";
    return new Response(respostasCsv(perguntas, results ?? [], sep), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
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
      /* `informe` não é pergunta: nada que venha com o id dele entra. Pela tela é
         impossível responder (não há controle), mas quem chama a API direto conseguiria
         gravar texto arbitrário nessa chave. */
      if (p.tipo === "informe") continue;
      const v = corpo.respostas[p.id];
      if (v === undefined || v === null || v === "") continue;
      if (p.tipo === "multi") {
        const lista = (Array.isArray(v) ? v : [v]).map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 30);
        if (lista.length) limpo[p.id] = lista.filter((x) => p.opcoes?.includes(x));
      } else if (p.tipo === "escolha" || p.tipo === "sim_nao") {
        const permitido = p.tipo === "sim_nao" ? ["Sim", "Não"] : p.opcoes ?? [];
        const s = String(v).slice(0, 80);
        if (permitido.includes(s)) limpo[p.id] = s;
      } else if (p.tipo === "email") {
        const e = limparEmail(v);
        if (e) limpo[p.id] = e;
      } else if (p.tipo === "cpf" || p.tipo === "cep") {
        const v2 = p.tipo === "cpf" ? limparCpf(v) : limparCep(v);
        /* Inválido é tratado como NÃO respondido: se o campo é obrigatório, a mensagem
           de "falta responder" já aponta qual é. Guardar CPF quebrado seria pior. */
        if (v2) limpo[p.id] = v2;
      } else if (p.tipo === "nota") {
        const n = parseInt(String(v), 10);
        const max = p.escala ?? NOTA_ESCALA_PADRAO;
        if (Number.isFinite(n) && n >= 1 && n <= max) limpo[p.id] = n;
      } else if (p.tipo === "numero") {
        const n = parseInt(String(v), 10);
        if (Number.isFinite(n) && n >= 0 && n <= 999) limpo[p.id] = n;
      } else {
        limpo[p.id] = String(v).slice(0, p.tipo === "obs" ? 800 : 200);
      }
    }
    /* Dependência não satisfeita: o valor sai e a pergunta deixa de ser obrigatória. O
       cliente não vê o campo, então não pode ser cobrado por ele — e piloto que mandasse
       nome de piloto por engano (ou de propósito) não sujaria a planilha do cadastro. */
    const ativa = (p) =>
      !p.depende || String(limpo[p.depende.campo] ?? "") === String(p.depende.valor);
    for (const p of perguntas) if (!ativa(p)) delete limpo[p.id];

    const faltando = perguntas.filter((p) => p.obrigatorio && ativa(p) && limpo[p.id] === undefined);
    if (faltando.length) {
      const nomes = rotulosCheios(perguntas);
      const quais = perguntas.map((p, i) => [p, nomes[i]]).filter(([p]) => faltando.includes(p)).map(([, n]) => n);
      return json({ erro: `falta responder: ${quais.join(", ")}` }, 400);
    }
    if (!Object.keys(limpo).length) return json({ erro: "nada foi respondido" }, 400);

    /* nome/contato são cópia desnormalizada das duas primeiras perguntas de
       texto: a lista do painel precisa ordenar e mostrar quem respondeu sem
       abrir o JSON de cada linha. É heurística, e falha de propósito para o
       lado seguro — num formulário que não comece por nome, essas duas colunas
       saem erradas, mas a resposta em si continua íntegra em `respostas`. */
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
