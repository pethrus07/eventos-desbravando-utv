/* ============================================================
   BRIEFING DE COMUNICAÇÃO — S2 do docs/ROADMAP.md.

   O QUE RESOLVE: hoje um pedido de arte nasce numa mensagem, vira conversa, volta como
   pergunta e só então vira peça. São essas voltas — não o desenho — que consomem a maior
   parte das 15,9 h/mês que o acordo de R$ 500 precisa derrubar para ~6,5 h.

   A IDEIA QUE ENCOLHE TUDO: o briefing NÃO é formulário em branco, é um DIFF. Datas, dias,
   programação, cardápio escolhido e participantes já estão no D1. O sistema preenche o que
   sabe e pergunta só o buraco — porque a maior parte do tempo gasto hoje é recolher e
   transcrever informação que o sistema já tem.

   Por isso cada campo carrega `origem`: 'sistema' é dedução, 'pessoa' é afirmação. Sem essa
   distinção um palpite errado do pré-preenchimento viraria fato sem ninguém notar.

   FECHAR É O MARCO COMERCIAL: `fechar_briefing` valida a completude e trava o conteúdo, e é
   nesse instante que o prazo de 5 dias úteis começa a correr. É a cláusula do acordo virando
   código, em vez de uma frase num PDF que ninguém relê.
   ============================================================ */

/** Catálogo ativo, em ordem. Vem do banco de propósito — ver migracao_v4_7.sql. */
export async function catalogo(db) {
  const { results } = await db
    .prepare("SELECT slug, nome, oque, campos FROM catalogo_pecas WHERE ativo=1 ORDER BY ordem, slug")
    .all();
  return (results ?? []).map((p) => {
    let campos = [];
    try {
      campos = JSON.parse(p.campos || "[]");
    } catch {}
    return { ...p, campos };
  });
}

/* ---------------------------------------------------------------- pré-preenchimento

   Cada função devolve o valor de um campo a partir do que o sistema JÁ sabe, ou null quando
   não sabe. Null é resposta legítima: melhor o briefing pedir à pessoa do que inventar.
   Toda função aqui é SÓ LEITURA — o pré-preenchimento nunca altera a operação. */

const vazio = (v) => v == null || String(v).trim() === "";

async function dosDiasDeCampo(db, eid) {
  const { results } = await db
    .prepare("SELECT rotulo, data FROM campo_dias WHERE evento_id=? ORDER BY ordem, id")
    .bind(eid)
    .all();
  if (!results?.length) return null;
  return results.map((d) => [d.rotulo, d.data].filter(Boolean).join(" · ")).join("\n");
}

async function daAgendaPorDia(db, eid) {
  const { results } = await db
    .prepare(
      `SELECT d.rotulo AS dia, t.h_planejado AS hora, t.nome
         FROM campo_tarefas t
         JOIN campo_dias d ON d.id = t.dia_id
        WHERE d.evento_id = ?
        ORDER BY d.ordem, t.ordem, t.id`
    )
    .bind(eid)
    .all();
  if (!results?.length) return null;
  const porDia = {};
  for (const r of results) (porDia[r.dia] ??= []).push(`${r.hora || "—"} ${r.nome}`);
  return Object.entries(porDia)
    .map(([dia, linhas]) => `${dia}\n  ${linhas.join("\n  ")}`)
    .join("\n");
}

/* A tabela `eventos` tem só id, nome, criado_em e arquivado — não guarda data nenhuma.
   A data de saída da expedição vive no PRIMEIRO dia da Operação em Campo. Escrevi
   `eventos.data_inicio` na primeira versão e teria falhado calado, porque o DEDUZ engole
   erro de dedução de propósito: o preço de inventar campo é a dedução sumir sem avisar. */
async function daDataDoEvento(db, eid) {
  const d = await db
    .prepare("SELECT data FROM campo_dias WHERE evento_id=? AND COALESCE(data,'') <> '' ORDER BY ordem, id LIMIT 1")
    .bind(eid)
    .first();
  return vazio(d?.data) ? null : d.data;
}

async function dosNumerosDeUtv(db, eid) {
  const r = await db
    .prepare("SELECT COUNT(*) n FROM clientes WHERE evento_id=? AND COALESCE(utv,'') <> ''")
    .bind(eid)
    .first();
  return r?.n ? `${r.n} UTVs cadastrados` : null;
}

async function daGradeDeCamiseta(db, eid) {
  const { results } = await db
    .prepare(
      "SELECT camiseta, COUNT(*) n FROM clientes WHERE evento_id=? AND COALESCE(camiseta,'') <> '' GROUP BY camiseta"
    )
    .bind(eid)
    .all();
  if (!results?.length) return null;
  return results.map((r) => `${r.camiseta}: ${r.n}`).join(" · ");
}

async function doCardapioRespondido(db, eid) {
  const r = await db
    .prepare(
      `SELECT COUNT(*) n FROM cardapio_respostas cr
         JOIN cardapio_forms f ON f.id = cr.form_id
        WHERE f.evento_id = ?`
    )
    .bind(eid)
    .first()
    .catch(() => null);
  return r?.n ? `${r.n} respostas no formulário de cardápio` : null;
}

async function daHospedagem(db, eid) {
  const { results } = await db
    .prepare("SELECT DISTINCT nome FROM quartos WHERE evento_id=? AND COALESCE(nome,'') <> ''")
    .bind(eid)
    .all()
    .catch(() => ({ results: [] }));
  return results?.length ? results.map((q) => q.nome).join(", ") : null;
}

/** Qual função resolve qual campo. O que não estiver aqui é pergunta para a pessoa. */
const DEDUZ = {
  "cronograma_geral.dias": dosDiasDeCampo,
  "cronograma_dia.agenda": daAgendaPorDia,
  "contagem.data_saida": daDataDoEvento,
  "adesivo.numeros": dosNumerosDeUtv,
  "camiseta.tamanhos": daGradeDeCamiseta,
  "cardapio.refeicoes": doCardapioRespondido,
  "guia_logistico.hospedagem": daHospedagem,
};

/**
 * Abre (ou devolve) o briefing da expedição, já com o que o sistema sabe.
 * Não sobrescreve nada que uma PESSOA tenha escrito — dedução não ganha de afirmação.
 */
export async function abrir(db, eid) {
  let b = await db.prepare("SELECT * FROM briefing WHERE evento_id=?").bind(eid).first();
  if (!b) {
    await db.prepare("INSERT INTO briefing (evento_id) VALUES (?)").bind(eid).run();
    b = await db.prepare("SELECT * FROM briefing WHERE evento_id=?").bind(eid).first();
  }
  if (b.status === "fechado") return ver(db, eid);

  const pecas = await catalogo(db);
  for (const p of pecas) {
    for (const c of p.campos) {
      if (c.origem !== "sistema") continue;
      const chave = `${p.slug}.${c.campo}`;
      const fn = DEDUZ[chave];
      if (!fn) continue;

      const atual = await db
        .prepare("SELECT origem, valor FROM briefing_campo WHERE briefing_id=? AND peca=? AND campo=?")
        .bind(b.id, p.slug, c.campo)
        .first();
      if (atual && atual.origem === "pessoa") continue; // afirmação vence dedução

      const valor = await fn(db, eid).catch(() => null);
      if (valor == null) continue;
      await db
        .prepare(
          `INSERT INTO briefing_campo (briefing_id, peca, campo, valor, origem) VALUES (?,?,?,?,'sistema')
             ON CONFLICT(briefing_id, peca, campo) DO UPDATE SET valor=excluded.valor, origem='sistema'`
        )
        .bind(b.id, p.slug, c.campo, valor)
        .run();
    }
  }
  return ver(db, eid);
}

/** O estado do briefing: o que está preenchido, por quem, e o que falta. */
export async function ver(db, eid) {
  const b = await db.prepare("SELECT * FROM briefing WHERE evento_id=?").bind(eid).first();
  if (!b) return { existe: false, dica: "Chame abrir_briefing primeiro." };

  const pecas = await catalogo(db);
  const { results } = await db
    .prepare("SELECT peca, campo, valor, origem FROM briefing_campo WHERE briefing_id=?")
    .bind(b.id)
    .all();
  const mapa = {};
  for (const r of results ?? []) mapa[`${r.peca}.${r.campo}`] = r;

  const faltando = [];
  const detalhe = pecas.map((p) => ({
    peca: p.slug,
    nome: p.nome,
    campos: p.campos.map((c) => {
      const r = mapa[`${p.slug}.${c.campo}`];
      const preenchido = r && !vazio(r.valor);
      if (!preenchido && c.obrigatorio) faltando.push({ peca: p.slug, campo: c.campo, rotulo: c.rotulo });
      return {
        campo: c.campo,
        rotulo: c.rotulo,
        valor: r?.valor ?? null,
        origem: preenchido ? r.origem : null,
        obrigatorio: !!c.obrigatorio,
      };
    }),
  }));

  const total = pecas.reduce((s, p) => s + p.campos.length, 0);
  const cheios = Object.values(mapa).filter((r) => !vazio(r.valor)).length;
  return {
    existe: true,
    evento_id: eid,
    status: b.status,
    fechado_em: b.fechado_em,
    preenchimento: `${cheios} de ${total} campos`,
    pelo_sistema: Object.values(mapa).filter((r) => r.origem === "sistema" && !vazio(r.valor)).length,
    faltando,
    pecas: detalhe,
  };
}

/** Grava em lote. Recusa briefing fechado: depois do fecho, mudança é rodada, não edição. */
export async function preencher(db, eid, valores) {
  const b = await db.prepare("SELECT * FROM briefing WHERE evento_id=?").bind(eid).first();
  if (!b) throw new Error("não há briefing aberto para esta expedição");
  if (b.status === "fechado")
    throw new Error(
      "este briefing está fechado e o prazo já começou a correr. Mudança depois do fecho conta como rodada de ajuste — fale com a RYZE."
    );

  const validos = await catalogo(db);
  const existe = new Set(validos.flatMap((p) => p.campos.map((c) => `${p.slug}.${c.campo}`)));

  let gravados = 0;
  const recusados = [];
  for (const v of Array.isArray(valores) ? valores : []) {
    const chave = `${v.peca}.${v.campo}`;
    /* Campo fora do catálogo é recusado em silêncio? Não: devolvido. Assistente que inventa
       campo precisa ver que inventou, senão repete e ninguém descobre. */
    if (!existe.has(chave)) {
      recusados.push({ ...v, motivo: "campo não existe no catálogo" });
      continue;
    }
    await db
      .prepare(
        `INSERT INTO briefing_campo (briefing_id, peca, campo, valor, origem) VALUES (?,?,?,?,'pessoa')
           ON CONFLICT(briefing_id, peca, campo) DO UPDATE SET valor=excluded.valor, origem='pessoa'`
      )
      .bind(b.id, v.peca, v.campo, String(v.valor ?? ""))
      .run();
    gravados++;
  }
  const estado = await ver(db, eid);
  return { gravados, recusados, faltando: estado.faltando, preenchimento: estado.preenchimento };
}

/** Fecha: valida a completude e TRAVA. É aqui que o prazo começa. */
export async function fechar(db, eid, quem) {
  const estado = await ver(db, eid);
  if (!estado.existe) throw new Error("não há briefing para esta expedição");
  if (estado.status === "fechado") return { ...estado, aviso: "já estava fechado" };
  if (estado.faltando.length)
    return {
      fechado: false,
      motivo: "faltam campos obrigatórios",
      faltando: estado.faltando,
      dica: "Preencha os campos acima e chame fechar_briefing de novo.",
    };

  await db
    .prepare("UPDATE briefing SET status='fechado', fechado_em=datetime('now'), fechado_por=? WHERE evento_id=?")
    .bind(String(quem || "").slice(0, 60), eid)
    .run();
  return {
    fechado: true,
    quando: new Date().toISOString().slice(0, 16).replace("T", " "),
    proximo_passo:
      "O briefing está travado e o prazo de 5 dias úteis começou a correr. As peças voltam pelo painel.",
  };
}

/**
 * Pedido fora do catálogo. NASCE INERTE.
 *
 * Esta é a trava comercial inteira: não existe ferramenta para "faça esta arte para mim" fora
 * das dez do catálogo. Existe só para "quero um orçamento disto", que grava uma linha e para.
 * Nada é produzido até alguém da RYZE orçar e o cliente aprovar — e isso não é uma regra
 * escrita num documento, é a ausência do verbo.
 */
export async function pedirExtra(db, { eid = null, pedido, quem }) {
  const texto = String(pedido || "").trim();
  if (!texto) throw new Error("descreva o que você precisa");
  const r = await db
    .prepare("INSERT INTO pedido_extra (evento_id, pedido, criado_por) VALUES (?,?,?)")
    .bind(eid, texto.slice(0, 1000), String(quem || "").slice(0, 60))
    .run();
  return {
    registrado: true,
    pedido_id: r.meta.last_row_id,
    status: "pendente_orcamento",
    aviso:
      "Registrado como pedido de ORÇAMENTO — nada foi produzido e nada entrou em nenhuma fila. " +
      "A RYZE responde com o valor, e o trabalho só começa depois da aprovação.",
  };
}
