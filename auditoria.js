/* ============================================================
   AUDITORIA — quem fez o quê, pelas duas portas.

   S1 do docs/ROADMAP.md, escrito em 13/10/2026.

   POR QUE EXISTE: até aqui o sistema não registrava nenhuma escrita. Se metade de um
   checklist sumisse, não havia como saber se foi pelo painel ou pelo Claude, com qual
   chave, nem quando. Sem isso, toda regra dos sprints seguintes (confirmação, papel,
   arquivamento) é promessa — não dá para conferir se pegou.

   POR QUE TABELA NOVA, e não a `historico` que já existe: a `historico` é feed de
   COMENTÁRIO por item (parent_tipo/parent_id/texto), feita para a pessoa anotar coisas
   num item do checklist. Está vazia, mas está vazia de propósito de uso, não de intenção.
   Misturar registro de sistema ali faria o painel mostrar auditoria como se fosse recado
   de colega, e um dia alguém apagaria o log achando que era nota velha.

   🛑 O QUE NUNCA ENTRA AQUI: corpo de requisição. Este sistema guarda CPF, RG, endereço e
   forma de pagamento; copiar o corpo para o log duplicaria dado pessoal num lugar com
   outra régua de acesso e outro ciclo de descarte. O log guarda O QUE foi feito e em qual
   alvo — nunca o conteúdo. Quando precisar de contexto, passe um `resumo` curto e escrito
   à mão, sem dado de pessoa.
   ============================================================ */

/** DDL — espelha migracao_v4_6.sql e schema.sql. Mudou aqui, mudou nos três. */
export const DDL_AUDITORIA = `
CREATE TABLE IF NOT EXISTS auditoria (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  quando    TEXT NOT NULL DEFAULT (datetime('now')),
  papel     TEXT NOT NULL,
  porta     TEXT NOT NULL,
  acao      TEXT NOT NULL,
  alvo      TEXT,
  resumo    TEXT,
  resultado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auditoria_quando ON auditoria(quando DESC);
`;

/** Métodos que mudam estado. GET não entra: encheria o log e esconderia o que importa. */
const ESCREVE = new Set(["POST", "PATCH", "PUT", "DELETE"]);
export const mudaEstado = (metodo) => ESCREVE.has(String(metodo || "").toUpperCase());

/**
 * Grava uma linha. NUNCA derruba o pedido: log que quebra operação é pior que log nenhum,
 * e um sistema em campo não pode parar porque a auditoria falhou.
 */
export async function registrar(db, { papel, porta, acao, alvo = null, resumo = null, resultado }) {
  try {
    await db
      .prepare(
        "INSERT INTO auditoria (papel, porta, acao, alvo, resumo, resultado) VALUES (?,?,?,?,?,?)"
      )
      .bind(
        /* 60 e nao 20: quando o papel era so "admin"/"equipe" vinte bastavam, mas desde a
           v4.8 esta coluna guarda NOME DE PESSOA, e "Equipe (chave compartilhada)" chegava
           cortada em "Equipe (chave compar". Log que trunca identidade e log que nao
           identifica. */
        String(papel ?? "?").slice(0, 60),
        String(porta ?? "?").slice(0, 10),
        String(acao ?? "").slice(0, 160),
        alvo == null ? null : String(alvo).slice(0, 160),
        resumo == null ? null : String(resumo).slice(0, 300),
        String(resultado ?? "").slice(0, 20)
      )
      .run();
  } catch (e) {
    console.error("auditoria falhou:", e?.message || e);
  }
}

/** O veredito a partir do status HTTP, para o log dizer se a ação passou ou foi barrada. */
export function resultadoDoStatus(status) {
  if (status === 401 || status === 403) return "negado";
  if (status >= 500) return "erro";
  if (status >= 400) return "recusado";
  return "ok";
}
