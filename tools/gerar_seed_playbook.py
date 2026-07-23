# -*- coding: utf-8 -*-
"""
Gera o seed do "Playbook Desbravando (Modelo)" a partir da planilha
Levantamento_Tarefas_Expedicoes.xlsx.

Uso:
    python tools/gerar_seed_playbook.py [caminho_da_planilha.xlsx] > seed_playbook.sql

Modelo de destino (uniforme, conforme o spec):
    Expedição → 7 Etapas → Itens (Nome+Categoria) → 6 Fases → Microtarefas
    A etapa "Operação em Campo" NÃO usa itens/ciclo: vira Dias → Tarefas → Subtarefas.

Como cada aba mapeia (só as abas limpas; ignora Pedrinho/Pedro/Cópia):
    "1. Validação da Expedição"  (Etapa|Categoria|Microtarefa) → etapas 1,2,3
                                  item.nome = item.categoria = Categoria (col B)
    "4. Planejamento Operacional"(Processo|Categoria|Atividade|Microtarefa) → etapa 4
                                  item.nome=Processo, categoria=Categoria, FASE=Atividade
    "5. Evento Pré-Expedição"    (Processo|Atividade|Microtarefa) → etapa 5
                                  item.nome=item.categoria=Processo (col A)
    "6. Operação em Campo"       (Processo|Atividade|Microtarefa) → CAMPO
                                  dia=Processo, tarefa=Atividade, subtarefa=Microtarefa
    "7. Fechamento da Expedição" (Processo|Atividade|Microtarefa) → etapa 7
                                  item.nome=item.categoria=Processo (col A)

A colocação de cada microtarefa nas 6 fases (etapas 1,2,3,5,7) é HEURÍSTICA por
palavra-chave — serve de ponto de partida; a curadoria fina é feita depois na UI.
Na etapa 4 a fase vem direto da coluna "Atividade" (mapa determinístico).
"""
import sys, os, re, zipfile, unicodedata
from xml.etree import ElementTree as ET

PLAYBOOK = "Playbook Desbravando (Modelo)"

# etapa (slug) por aba
ETAPA_SLUG = {
    "Validação": "validacao", "Marketing": "marketing", "Vendas": "vendas",
    "4": "contratacoes", "5": "pre_expedicao", "7": "fechamento",
}

FASES = ["pesquisa", "negociacao", "contratacao", "confirmacao", "execucao", "avaliacao"]

# etapa 4: coluna "Atividade" → fase (determinístico)
ATIVIDADE_FASE = {
    "cotacao": "pesquisa",
    "cardapio": "negociacao",
    "fechamento": "contratacao", "fechamento / compra": "contratacao", "compra": "contratacao",
    "confirmacao do pedido": "confirmacao",
    "cobranca pre-entrega": "confirmacao",
    "confirmacao de entrega": "execucao",
}

def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip()

# classificador heurístico p/ etapas 1,2,3,5,7 — 1ª regra que casar vence
REGRAS = [
    ("avaliacao", ["avaliar desempenho", "avaliar a operacao", "avaliar operacao",
                   "retrospectiva", "feedback", "pesquisa de satisfacao", "satisfacao",
                   "documentar princip", "identificar desvios", "registrar aprendizado",
                   "aprendizado", "atualizar checklist", "atualizar processo",
                   "comparar", "margem final", "melhoria", "aprovar ou reprovar",
                   "consolidar respostas", "registrar pontos", "conferir receita",
                   "lancar custo", "registrar ocorrencia", "registrar problema",
                   "registrar melhoria", "banco de conhecimento"]),
    ("negociacao", ["negociar", "condicoes comerciais", "definir preco", "definir custo",
                    "definir valor de venda", "definir politica", "calcular margem e definir",
                    "revalidar valores", "cardapio", "definir cardapio", "proposta",
                    "condicoes de pagamento"]),
    ("contratacao", ["fechar contrato", "fechar contratacao", "fechar compra", "contratar",
                     "efetivar contratacao", "efetivar", "formalizar", "comprar", "compra de",
                     "enviar contrato", "cobrar assinatura", "receber contrato",
                     "assinar", "emitir documento", "registrar pagamento", "realizar pagamento",
                     "decisao final", "go / no-go", "go/no-go", "realizar pagamento final"]),
    ("pesquisa", ["pesquisar", "levantar", "cotar", "cotacao", "solicitar cotacao",
                  "solicitar disponibilidade", "solicitar orcamento", "verificar", "checar",
                  "avaliar estrutura", "avaliar experiencia", "avaliar potencial", "avaliar",
                  "identificar", "buscar", "calcular consumo", "calcular quantidade",
                  "calcular litros", "mapa de quartos", "preparar lista"]),
    ("confirmacao", ["confirmar", "reconfirmar", "revisar contrato", "revisar valores",
                     "validar", "agendar", "solicitar nota fiscal", "coletar", "registrar forma",
                     "aprovar material", "aprovar", "conferir pagamento", "conferir pendencia",
                     "conferir entrega", "conferir nota", "conferir checkout", "conferir amarracao",
                     "conferir uti", "conferir sobras", "conferir fornecedor", "conferir encerramento"]),
    ("execucao", ["receber", "montar", "executar", "servir", "realizar", "iniciar", "saida",
                  "chegada", "abrir", "liberar", "repor", "desmontar", "encerrar", "carregar",
                  "embarcar", "acompanhar", "preparar", "separar", "colocar", "cobrir",
                  "publicar", "produzir", "gravar", "editar", "roteirizar", "criar", "entregar",
                  "enviar", "definir", "responder"]),
]

def classificar(microtarefa):
    n = norm(microtarefa)
    for fase, chaves in REGRAS:
        for k in chaves:
            if k in n:
                return fase
    return "execucao"  # default: "produzir/entregar a coisa"

# ---------- leitura do xlsx (sem dependências externas) ----------
def ler_planilha(path):
    z = zipfile.ZipFile(path)
    NSM = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    NSR = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    ns = {"a": NSM[1:-1], "r": NSR[1:-1]}
    ss = []
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("a:si", ns):
        ss.append("".join(t.text or "" for t in si.iter(NSM + "t")))
    relmap = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    sheets = {}
    for sh in ET.fromstring(z.read("xl/workbook.xml")).find("a:sheets", ns):
        sheets[sh.get("name")] = "xl/" + relmap[sh.get(NSR + "id")]
    def colL(ref): return re.match(r"[A-Z]+", ref).group()
    def parse(p):
        sd = ET.fromstring(z.read(p)).find("a:sheetData", ns); out = []
        for row in sd.findall("a:row", ns):
            d = {}
            for c in row.findall("a:c", ns):
                ref = c.get("r"); t = c.get("t"); v = c.find("a:v", ns); isel = c.find("a:is", ns); val = ""
                if t == "s" and v is not None: val = ss[int(v.text)]
                elif t == "inlineStr" and isel is not None: val = "".join(x.text or "" for x in isel.iter(NSM + "t"))
                elif v is not None: val = v.text
                if val and val.strip(): d[colL(ref)] = val.strip()
            if d: out.append(d)
        return out
    return {nm: parse(p) for nm, p in sheets.items()}

def find_sheet(data, prefixo):
    for nm in data:
        if norm(nm).startswith(norm(prefixo)):
            return data[nm]
    raise KeyError(prefixo)

# ---------- SQL helpers ----------
def q(s): return "'" + str(s).replace("'", "''") + "'"
EV = "(SELECT id FROM eventos WHERE nome=%s)" % q(PLAYBOOK)

def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.expanduser("~"), "Downloads", "Levantamento_Tarefas_Expedicoes.xlsx")
    data = ler_planilha(path)

    # ---- monta a árvore de itens (etapas 1,2,3,5,7) ----
    itens = []  # cada item: dict(etapa, categoria, nome, micros=[(titulo, fase)])
    def novo_item(etapa, categoria, nome):
        it = {"etapa": etapa, "categoria": categoria, "nome": nome, "micros": []}
        itens.append(it); return it

    # Aba 1 → etapas Validação/Marketing/Vendas (Etapa|Categoria|Microtarefa, com merge)
    aba1 = find_sheet(data, "1. Valida")
    etapa_atual = categoria_atual = None; item_atual = None
    for r in aba1[1:]:  # pula cabeçalho
        A, B, C = r.get("A"), r.get("B"), r.get("C")
        if A and norm(A) in ("etapa",):  # linha de cabeçalho repetido
            continue
        if A: etapa_atual = A
        if B: categoria_atual = B
        if not C: continue
        slug = ETAPA_SLUG.get(etapa_atual)
        if not slug: continue
        if B:  # nova categoria = novo item
            item_atual = novo_item(slug, categoria_atual, categoria_atual)
        if item_atual is None:
            item_atual = novo_item(slug, categoria_atual or "Geral", categoria_atual or "Geral")
        item_atual["micros"].append((C, classificar(C)))

    # Abas 5 e 7 (Processo|Atividade|Microtarefa) → item = Processo (col A)
    for pref, slug in [("5. Evento", "pre_expedicao"), ("7. Fechamento", "fechamento")]:
        aba = find_sheet(data, pref)
        por_nome = {}
        for r in aba:
            A, B, C = r.get("A"), r.get("B"), r.get("C")
            if not A or not C: continue
            if norm(A) in ("processo",) or norm(A).startswith(norm(pref[:2])): continue
            if norm(C) in ("microtarefa",): continue
            if A not in por_nome:
                por_nome[A] = novo_item(slug, A, A)
            por_nome[A]["micros"].append((C, classificar(C)))

    # Aba 4 (Processo|Categoria|Atividade|Microtarefa) → item=Processo, fase=Atividade
    aba4 = find_sheet(data, "4. Planejamento")
    por_nome4 = {}
    for r in aba4:
        A, B, Cc, D = r.get("A"), r.get("B"), r.get("C"), r.get("D")
        if not A or not D: continue
        if norm(A) in ("processo",) or norm(A).startswith("4."): continue
        fase = ATIVIDADE_FASE.get(norm(Cc), None)
        if fase is None:
            fase = classificar(Cc or D)
        if A not in por_nome4:
            por_nome4[A] = novo_item("contratacoes", B or "", A)
        por_nome4[A]["micros"].append((D, fase))

    # numera ordem global (chave natural para o SQL)
    for i, it in enumerate(itens, 1):
        it["ordem"] = i

    # ---- Operação em Campo (aba 6) → dias/tarefas/subtarefas ----
    aba6 = find_sheet(data, "6. Opera")
    dias = []  # dict(rotulo, ordem, tarefas=[dict(nome, ordem, subs=[])])
    dpor = {}; tpor = {}; tord = 0
    for r in aba6:
        A, B, C = r.get("A"), r.get("B"), r.get("C")
        if not A or not C: continue
        if norm(A) in ("processo",) or norm(A).startswith("6."): continue
        if norm(C) in ("microtarefa",): continue
        if A not in dpor:
            d = {"rotulo": A, "ordem": len(dias) + 1, "tarefas": []}
            dias.append(d); dpor[A] = d
        d = dpor[A]
        chave = (A, B)
        if chave not in tpor:
            tord += 1
            t = {"nome": B or "Tarefa", "ordem": tord, "subs": []}
            d["tarefas"].append(t); tpor[chave] = t
        tpor[chave]["subs"].append(C)

    # ---------- emite o SQL ----------
    out = []
    p = out.append
    p("-- ============================================================")
    p("-- SEED · " + PLAYBOOK)
    p("-- Gerado por tools/gerar_seed_playbook.py a partir da planilha.")
    p("-- Re-executável: apaga o playbook anterior e recria (id-agnóstico).")
    p("-- Aplicar DEPOIS da migracao_v4_1.sql:")
    p("--   npx wrangler d1 execute eventos --remote --file=seed_playbook.sql")
    p("-- ============================================================")
    p("")
    # limpeza (filhos primeiro)
    p("DELETE FROM op_microtarefas WHERE fase_id IN (SELECT f.id FROM op_fases f JOIN op_itens i ON i.id=f.item_id WHERE i.evento_id IN (SELECT id FROM eventos WHERE nome=%s));" % q(PLAYBOOK))
    p("DELETE FROM op_fases WHERE item_id IN (SELECT id FROM op_itens WHERE evento_id IN (SELECT id FROM eventos WHERE nome=%s));" % q(PLAYBOOK))
    p("DELETE FROM op_itens WHERE evento_id IN (SELECT id FROM eventos WHERE nome=%s);" % q(PLAYBOOK))
    p("DELETE FROM campo_subtarefas WHERE tarefa_id IN (SELECT t.id FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id WHERE d.evento_id IN (SELECT id FROM eventos WHERE nome=%s));" % q(PLAYBOOK))
    p("DELETE FROM campo_tarefas WHERE dia_id IN (SELECT id FROM campo_dias WHERE evento_id IN (SELECT id FROM eventos WHERE nome=%s));" % q(PLAYBOOK))
    p("DELETE FROM campo_dias WHERE evento_id IN (SELECT id FROM eventos WHERE nome=%s);" % q(PLAYBOOK))
    p("DELETE FROM eventos WHERE nome=%s;" % q(PLAYBOOK))
    p("")
    p("INSERT INTO eventos (nome) VALUES (%s);" % q(PLAYBOOK))
    p("")

    # itens
    p("-- Itens (%d)" % len(itens))
    for it in itens:
        p("INSERT INTO op_itens (evento_id, etapa, categoria, nome, ordem) VALUES (%s, %s, %s, %s, %d);"
          % (EV, q(it["etapa"]), q(it["categoria"]), q(it["nome"]), it["ordem"]))
    p("")
    # as 6 fases fixas de cada item (um INSERT por fase — evita compound SELECT,
    # que o SQLite do D1/workerd limita a poucos termos)
    p("-- 6 fases fixas para cada item")
    for i, f in enumerate(FASES):
        p("INSERT INTO op_fases (item_id, tipo, ordem, status) "
          "SELECT id, %s, %d, 'afazer' FROM op_itens WHERE evento_id IN (SELECT id FROM eventos WHERE nome=%s);"
          % (q(f), i + 1, q(PLAYBOOK)))
    p("")
    # microtarefas (join pela ordem do item + tipo da fase)
    total_micro = 0
    p("-- Microtarefas")
    for it in itens:
        for j, (titulo, fase) in enumerate(it["micros"], 1):
            total_micro += 1
            p("INSERT INTO op_microtarefas (fase_id, titulo, ordem) SELECT f.id, %s, %d "
              "FROM op_fases f JOIN op_itens i ON i.id=f.item_id "
              "WHERE i.evento_id IN (SELECT id FROM eventos WHERE nome=%s) AND i.ordem=%d AND f.tipo=%s;"
              % (q(titulo), j, q(PLAYBOOK), it["ordem"], q(fase)))
    p("")

    # Operação em Campo
    p("-- Operação em Campo: %d dias" % len(dias))
    for d in dias:
        p("INSERT INTO campo_dias (evento_id, rotulo, ordem) VALUES (%s, %s, %d);"
          % (EV, q(d["rotulo"]), d["ordem"]))
    p("")
    ntar = nsub = 0
    for d in dias:
        for t in d["tarefas"]:
            ntar += 1
            p("INSERT INTO campo_tarefas (dia_id, nome, tipo, status, ordem) SELECT d.id, %s, 'ajustavel', 'afazer', %d "
              "FROM campo_dias d WHERE d.evento_id IN (SELECT id FROM eventos WHERE nome=%s) AND d.ordem=%d;"
              % (q(t["nome"]), t["ordem"], q(PLAYBOOK), d["ordem"]))
    p("")
    for d in dias:
        for t in d["tarefas"]:
            for k, sub in enumerate(t["subs"], 1):
                nsub += 1
                p("INSERT INTO campo_subtarefas (tarefa_id, titulo, ordem) SELECT t.id, %s, %d "
                  "FROM campo_tarefas t JOIN campo_dias d ON d.id=t.dia_id "
                  "WHERE d.evento_id IN (SELECT id FROM eventos WHERE nome=%s) AND t.ordem=%d;"
                  % (q(sub), k, q(PLAYBOOK), t["ordem"]))

    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(out))

    # resumo no stderr (não polui o SQL)
    from collections import Counter
    fasecount = Counter(f for it in itens for _, f in it["micros"])
    etapacount = Counter(it["etapa"] for it in itens)
    sys.stderr.write("== RESUMO ==\n")
    sys.stderr.write("Itens: %d | Microtarefas: %d\n" % (len(itens), total_micro))
    sys.stderr.write("Itens por etapa: %s\n" % dict(etapacount))
    sys.stderr.write("Microtarefas por fase: %s\n" % dict(fasecount))
    sys.stderr.write("Campo: %d dias, %d tarefas, %d subtarefas\n" % (len(dias), ntar, nsub))

if __name__ == "__main__":
    main()
