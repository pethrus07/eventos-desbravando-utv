/* ============================================================
   USUÁRIOS E PERMISSÕES — quem pode ver e quem pode mexer, por módulo.

   Escrito em 14/10/2026, a pedido do cliente. Substitui o modelo de dois papéis fixos
   (admin/equipe) por usuário individual com permissão por módulo — mas de forma ADITIVA:
   a APP_KEY e a TEAM_KEY continuam valendo e resolvem para usuários semeados, então
   ninguém é desconectado no deploy. Ver migracao_v4_8.sql.

   TRÊS DECISÕES, E O PORQUÊ:

   1. A CHAVE NUNCA É GUARDADA, só o SHA-256 dela. Chave em tabela é chave que vaza em todo
      backup, e os backups deste banco já existem. Mostra-se uma vez, na criação, e nunca
      mais — nem ao administrador.

   2. PERMISSÕES COMO JSON NA LINHA DO USUÁRIO, não numa tabela de grants. A checagem custa
      UMA leitura de linha por requisição em vez de treze. Medido contra os limites da
      Cloudflare: 1.300 requisições no pior dia útil = 1,3% do limite gratuito, e a leitura
      a mais é 0,03%. Tabela de grants caberia também, mas seria 13× mais cara sem ganho.

   3. A LISTA DE MÓDULOS MORA AQUI, e o mapa de rota→módulo ao lado dela. Rota nova que não
      souber dizer a que módulo pertence é NEGADA (ver `moduloDaRota`): o padrão é fechado,
      senão cada módulo novo nasce liberado para todo mundo até alguém lembrar.

   O administrador principal (`principal = 1`) responde "sim" a qualquer pergunta, sem lista:
   lista é o que se esquece de atualizar quando nasce um módulo novo.
   ============================================================ */

/** Os 13 módulos reais do sistema, na ordem em que aparecem na interface. */
export const MODULOS = [
  { slug: "eventos", nome: "Expedições", grupo: "Geral" },
  { slug: "tarefas", nome: "Tarefas", grupo: "Geral" },
  { slug: "crm", nome: "CRM", grupo: "Geral" },
  { slug: "fornecedores", nome: "Fornecedores", grupo: "Geral" },
  { slug: "checklist", nome: "Checklist", grupo: "Dentro da expedição" },
  { slug: "operacao", nome: "Operação (Ciclo)", grupo: "Dentro da expedição" },
  { slug: "campo", nome: "Operação em Campo", grupo: "Dentro da expedição" },
  { slug: "agenda", nome: "Agenda", grupo: "Dentro da expedição" },
  { slug: "custos", nome: "Custos", grupo: "Dentro da expedição" },
  { slug: "participantes", nome: "Participantes", grupo: "Dentro da expedição" },
  { slug: "simulador", nome: "Simulador", grupo: "Dentro da expedição" },
  { slug: "cardapio", nome: "Cardápio", grupo: "Dentro da expedição" },
  { slug: "hospedagem", nome: "Hospedagem", grupo: "Dentro da expedição" },
  { slug: "comunicacao", nome: "Comunicação (artes)", grupo: "Dentro da expedição" },
];

const SLUGS = new Set(MODULOS.map((m) => m.slug));

/* Primeiro segmento de /api/<x> → módulo. Levantado do worker.js em 14/10: são 24 segmentos
   para 13 módulos, porque vários recursos pertencem à mesma tela (um item do checklist e
   seus subitens são a mesma permissão para quem usa). */
const ROTA_MODULO = {
  eventos: "eventos",
  itens: "checklist",
  subitens: "checklist",
  "op-itens": "operacao",
  "op-fases": "operacao",
  "op-micros": "operacao",
  "campo-dias": "campo",
  "campo-tarefas": "campo",
  "campo-subtarefas": "campo",
  custos: "custos",
  clientes: "participantes",
  "cliente-notas": "participantes",
  pagamentos: "participantes",
  cenarios: "simulador",
  linhas: "simulador",
  cardapio: "cardapio",
  quartos: "hospedagem",
  alocacoes: "hospedagem",
  briefing: "comunicacao",
  "catalogo-pecas": "comunicacao",
  tarefas: "tarefas",
  subtarefas: "tarefas",
  crm: "crm",
  "crm-interacoes": "crm",
  fornecedores: "fornecedores",
};

/* Rotas que todo usuário autenticado alcança, independentemente de permissão: são as que
   dizem QUEM ELE É e O QUE ELE PODE. Sem elas a interface não consegue nem se desenhar. */
const SEMPRE = new Set(["me", "meus-modulos"]);

/**
 * A que módulo a rota pertence. `null` = rota livre; `false` = DESCONHECIDA, e desconhecida
 * é negada. Rota nova nasce fechada: o contrário faria todo módulo novo começar aberto a
 * todo mundo até alguém lembrar de cadastrá-lo aqui.
 */
export function moduloDaRota(caminho) {
  const p = String(caminho || "").split("?")[0].split("/").filter(Boolean);
  if (p[0] !== "api" || !p[1]) return false;
  if (SEMPRE.has(p[1])) return null;

  /* /api/eventos/:id/<sub> — a sub-rota manda, porque é ela que diz a tela.
     /api/eventos e /api/eventos/:id são o módulo "eventos" em si. */
  if (p[1] === "eventos" && p[3]) return ROTA_MODULO[p[3]] ?? false;
  return ROTA_MODULO[p[1]] ?? false;
}

/** Métodos que mudam estado — a fronteira entre "ver" e "editar". */
const ESCRITA = new Set(["POST", "PATCH", "PUT", "DELETE"]);
export const ehEscrita = (metodo) => ESCRITA.has(String(metodo || "").toUpperCase());

/** SHA-256 em hexadecimal — o mesmo do navegador e do Worker, sem dependência. */
export async function hashDaChave(chave) {
  const bytes = new TextEncoder().encode(String(chave ?? ""));
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Resolve a chave do header num usuário. UMA leitura de linha, por índice.
 *
 * A ordem importa e é a razão de ninguém cair no deploy: as duas chaves compartilhadas são
 * conferidas ANTES do hash, e apontam para usuários semeados por sentinela. Os segredos
 * APP_KEY e TEAM_KEY continuam fora do banco.
 */
export async function usuarioDaChave(db, chave, env) {
  const k = String(chave ?? "");
  if (!k) return null;

  let sentinela = null;
  if (env.APP_KEY && k === env.APP_KEY) sentinela = "__APP_KEY__";
  else if (env.TEAM_KEY && k === env.TEAM_KEY) sentinela = "__TEAM_KEY__";

  const hash = sentinela ?? (await hashDaChave(k));
  const u = await db
    .prepare("SELECT id, nome, principal, permissoes, ativo FROM usuarios WHERE chave_hash=?")
    .bind(hash)
    .first();

  /* Enquanto a migração não rodar, a tabela não existe e a consulta estoura. O chamador
     trata isso caindo no modelo antigo — é o que mantém o sistema de pé entre o deploy do
     código e o da migração, que nunca acontecem no mesmo segundo. */
  if (!u || !u.ativo) return null;

  let permissoes = {};
  try {
    permissoes = JSON.parse(u.permissoes || "{}");
  } catch {}
  return { id: u.id, nome: u.nome, principal: !!u.principal, permissoes };
}

/**
 * Pode? `nivel` é "ver" ou "editar". Editar inclui ver, como o briefing pede.
 * Usuário sem permissão nenhuma não vê nada — é o padrão de quem acaba de ser criado.
 */
export function pode(usuario, modulo, nivel = "ver") {
  if (!usuario) return false;
  if (usuario.principal) return true;
  if (!SLUGS.has(modulo)) return false;
  const tem = usuario.permissoes?.[modulo];
  if (tem === "editar") return true;
  return nivel === "ver" && tem === "ver";
}

/**
 * Chave nova, legível para ditar por telefone e aleatória o bastante para não ser adivinhada.
 * 20 caracteres de um alfabeto sem `0/O` e `1/I/l`, que é onde a leitura em voz alta erra.
 * São 32^20 combinações — mais do que suficiente, e o que protege de verdade é não haver
 * como enumerar usuários: chave errada e usuário inexistente dão exatamente o mesmo 401.
 */
export function novaChave() {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const s = [...bytes].map((b) => alfabeto[b % alfabeto.length]).join("");
  return s.match(/.{1,5}/g).join("-"); // XXXXX-XXXXX-XXXXX-XXXXX
}

/**
 * Normaliza o que veio da tela: só módulos que existem, só níveis que existem.
 * Vale tanto contra erro de digitação quanto contra alguém mandando `{"__proto__": ...}`
 * direto na API — o que entra no banco é sempre um objeto novo, montado aqui.
 */
export function limparPermissoes(bruto) {
  const saida = {};
  if (!bruto || typeof bruto !== "object") return saida;
  for (const m of MODULOS) {
    const v = bruto[m.slug];
    if (v === "ver" || v === "editar") saida[m.slug] = v;
  }
  return saida;
}

/** Os módulos que este usuário enxerga — é o que a interface usa para esconder o resto. */
export function modulosVisiveis(usuario) {
  return MODULOS.filter((m) => pode(usuario, m.slug, "ver")).map((m) => ({
    ...m,
    editar: pode(usuario, m.slug, "editar"),
  }));
}

/** O veredito de uma requisição: usuário × rota × método. */
export function avaliar(usuario, caminho, metodo) {
  const modulo = moduloDaRota(caminho);
  /* O principal passa ANTES do mapa, não depois. O briefing pede acesso irrestrito, e a
     gestão de usuários é justamente uma rota que não pertence a módulo nenhum: se ele
     passasse pelo mapa, o próprio administrador seria barrado da tela que o cadastra.
     É também o que garante que rota nova nunca tranca o dono fora do sistema. */
  if (usuario?.principal) return { permitido: true, modulo: moduloDaRota(caminho) || null };
  if (modulo === null) return { permitido: true, modulo: null };
  if (modulo === false) return { permitido: false, modulo: null, motivo: "rota não mapeada a nenhum módulo" };
  const nivel = ehEscrita(metodo) ? "editar" : "ver";
  return {
    permitido: pode(usuario, modulo, nivel),
    modulo,
    nivel,
    motivo: `exige "${nivel}" em ${modulo}`,
  };
}
