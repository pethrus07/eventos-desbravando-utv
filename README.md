# Controle de Eventos · Desbravando UTV

![status](https://img.shields.io/badge/status-em%20produção-6FCF97)
![runtime](https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020)
![banco](https://img.shields.io/badge/banco-D1%20(SQLite)-003B57)
![front](https://img.shields.io/badge/front-SPA%20sem%20framework-F7DF1E)
![deps](https://img.shields.io/badge/dependências-0-brightgreen)

> Sistema de gestão para uma operação **real** de expedições de UTV: substituiu um emaranhado de planilhas por um app único que a equipe abre **no celular, em campo**. Roda inteiro em um **Cloudflare Worker + D1** (SQLite serverless), no plano gratuito — nada de servidor pra manter.

---

## 1. Visão Geral e a Dor

A operação vende expedições, monta o checklist de logística, cobra pacotes em parcelas, aloca gente em quartos e simula o custo de cada trilha. Isso vivia espalhado em abas de planilha — "controle geral", "cadastro de clientes", "simulador de custos" — que **ninguém conseguia editar ao mesmo tempo** sem quebrar fórmula ou sobrescrever o colega.

**O que está sendo resolvido?**
Juntar todo o ciclo de uma expedição (venda → logística → financeiro → hospedagem → pós) em um só lugar, que funcione bem no celular e aguente 2–5 pessoas mexendo juntas.

**Quem sofre com o problema?**
Uma equipe pequena tocando várias expedições em paralelo, no campo, sem TI dedicada e sem orçamento pra ferramenta paga por assento.

**Por que importa pro negócio?**
Informação perdida ou desencontrada é dinheiro perdido: pacote não cobrado, custo esquecido, participante sem contrato. Centralizar isso é o que deixa a operação escalar sem virar caos.

---

## 2. Arquitetura e Decisões Técnicas

| Camada | Escolha | Por que escolhi isso? | Alternativa considerada | Nota de impacto |
|---|---|---|---|---|
| **Runtime** | Cloudflare Workers | Escala a zero, deploy num comando, plano gratuito e edge global; zero servidor pra manter | VPS + Node, Vercel Functions | Custo zero, zero-ops |
| **Banco** | D1 (SQLite serverless) | SQL relacional no mesmo edge do Worker, transacional, sobra no volume da operação | Postgres gerenciado, KV/DO | Consistência sem infra |
| **Front** | SPA de arquivo único, **sem build e sem framework** | HTML+CSS+JS puro servido como texto pelo próprio Worker; carrega rápido no 4G do campo, sem toolchain | React/Vue + Vite | Simplicidade, 0 dependências |
| **Auth** | Chave em 2 níveis no header `x-app-key` | Operação de 2–5 pessoas não precisa de cadastro; a chave é *secret* do Wrangler e nunca vai no HTML | OAuth, conta por usuário | Menos atrito e menos superfície de ataque |
| **Concorrência** | Gravação **por campo** (PATCH pequeno) + poll leve | Várias pessoas editam ao mesmo tempo sem "salvar a tela inteira" e sobrescrever o outro | Salvar formulário inteiro; WebSocket/CRDT | Edição simultânea segura, sem backend de tempo real |

**Fluxo:**

```
Navegador (SPA)  ──►  Worker  /api/*  ──►  D1 (SQLite)
  x-app-key            roteia + valida       eventos · itens · clientes
  rotas por hash       papel admin/equipe    custos · quartos · CRM · tarefas
```

**Módulos:** Checklist de logística · Participantes + Financeiro · Simulador de custos · Hospedagem · Custos + Fornecedores · Tarefas gerais · Mini-CRM. Dois papéis: `APP_KEY` (admin — tudo) e `TEAM_KEY` (equipe — checklist, hospedagem e tarefas, sem CPF/financeiro/CRM).

---

## 3. Destaque de Engenharia / "The Hard Part"

**Edição simultânea sem backend de tempo real.** O jeito óbvio — cada tela salva o formulário inteiro — faz duas pessoas na mesma expedição sobrescreverem o trabalho uma da outra. Em vez disso, cada alteração é um `PATCH` cirúrgico de um campo só, e o `UPDATE` é montado dinamicamente a partir do objeto já saneado:

```js
// monta "SET col=?" só com os campos que vieram, e faz bind na ordem
async function upd(db, tabela, id, campos, extra = "") {
  const chaves = Object.keys(campos);
  if (!chaves.length) return false;
  const sets = chaves.map(k => `${k}=?`).join(", ");
  await db.prepare(`UPDATE ${tabela} SET ${sets}${extra} WHERE id=?`)
    .bind(...chaves.map(k => campos[k]), id).run();
  return true;
}
```

Somado a um *poll* leve nas telas (que pausa quando o campo está em foco, pra não atropelar quem digita), isso dá a sensação de colaborativo **sem WebSocket, sem CRDT e sem sair do plano gratuito**. O mesmo princípio aparece no financeiro: o status de um custo (`pago`/`parcial`/`pendente`) é **derivado** do quanto já foi pago, em vez de ser um campo que alguém precisa lembrar de mudar.

---

## 4. API

Autenticação: header `x-app-key`. Papel "ambos" = admin e equipe; "admin" = só a chave admin.

| Rota | Método | Papel | Faz |
| --- | --- | --- | --- |
| `/api/me` | GET | ambos | Retorna o papel da chave |
| `/api/eventos` | GET | ambos | Lista eventos com progresso e custo total |
| `/api/eventos` | POST | admin | Cria evento; `{copiar_de, limpar_valores}` duplica outro como modelo |
| `/api/eventos/:id` | PATCH / DELETE | admin | Renomeia/arquiva · exclui tudo do evento |
| `/api/eventos/:id/itens` | GET / POST | ambos | Checklist: lista · adiciona |
| `/api/itens/:id` | PATCH / DELETE | ambos | Atualiza · exclui item |
| `/api/eventos/:id/clientes` | GET / POST | admin | Participantes (com soma de pagos) · adiciona |
| `/api/clientes/:id` | GET / PATCH / DELETE | admin | Ficha + pagamentos · atualiza · exclui |
| `/api/clientes/:id/pagamentos` | POST | admin | Registra pagamento `{valor, data, forma}` |
| `/api/pagamentos/:id` | DELETE | admin | Remove pagamento |
| `/api/clientes/:id/notas` | POST | admin | Anotação livre na ficha do participante |
| `/api/cliente-notas/:id` | DELETE | admin | Remove anotação |
| `/api/eventos/:id/cenarios` | GET / POST | admin | Cenários do simulador + linhas · cria (padrão ou `copiar_de`) |
| `/api/cenarios/modelos` | GET | admin | Cenários marcados como modelo, reusáveis entre expedições |
| `/api/cenarios/:id` | PATCH / DELETE | admin | Parâmetros · exclui |
| `/api/cenarios/:id/linhas` | POST | admin | Nova linha de custo |
| `/api/linhas/:id` | PATCH / DELETE | admin | Edita · remove linha |
| `/api/eventos/:id/custos` | GET / POST | admin | Custos reais da expedição (+ lista de staff) · adiciona |
| `/api/eventos/:id/custos/importar` | POST | admin | Gera itens de custo a partir de um cenário do simulador |
| `/api/eventos/:id/custos/reordenar` | POST | admin | Salva a nova ordem (drag & drop) |
| `/api/custos/:id` | PATCH / DELETE | admin | Edita (valor, pago, parcelas, forma, status) · exclui |
| `/api/fornecedores` | GET / POST | admin | Fornecedores globais (com nº de itens e total) · adiciona |
| `/api/fornecedores/:id` | PATCH / DELETE | admin | Edita · exclui (desamarra os custos) |
| `/api/eventos/:id/quartos` | GET / POST | GET ambos / POST admin | Quartos + alocações · cria quarto |
| `/api/quartos/:id` | PATCH / DELETE | admin | Edita · exclui quarto |
| `/api/quartos/:id/alocacoes` | POST | ambos | Aloca `{cliente_id}` (admin) ou `{nome_livre}` |
| `/api/alocacoes/:id` | PATCH / DELETE | ambos | Situação do hóspede · remove do quarto |
| `/api/tarefas` | GET / POST | ambos | Tarefas gerais: lista · adiciona |
| `/api/tarefas/:id` | PATCH / DELETE | ambos | Atualiza · exclui tarefa |
| `/api/crm` | GET / POST | admin | Contatos do CRM · adiciona |
| `/api/crm/:id` | GET / PATCH / DELETE | admin | Ficha + interações + expedições vinculadas · atualiza · exclui |
| `/api/crm/:id/interacoes` | POST | admin | Registra interação `{data, canal, resumo}` |
| `/api/crm-interacoes/:id` | DELETE | admin | Remove interação |

**Cálculo do simulador** (mesma lógica da planilha original): linha `pessoa` = média × preço × multiplicador (nenhum / diárias / dias de trilha / refeições / eventos), somado por pessoa; linha `fixo` = valor × multiplicador, rateado entre as pessoas.

---

## 5. Rodando / publicando

```bash
npx wrangler login                                    # se ainda não estiver logado
npx wrangler d1 create eventos                        # 1) cria o banco
#   → cole o database_id impresso no wrangler.toml
npx wrangler d1 execute eventos --remote --file=schema.sql   # 2) estrutura
npx wrangler secret put APP_KEY                       # 3) chave admin
npx wrangler secret put TEAM_KEY                      #    chave equipe (opcional)
npx wrangler deploy                                   # 4) publica
```

A URL final (`https://eventos.SEU-USUARIO.workers.dev`) é o app completo. Desenvolvimento local: `npx wrangler dev` (chaves num `.dev.vars`, fora do git).

| Arquivo | O que é |
| --- | --- |
| `worker.js` | API (`/api/*`) + entrega da interface |
| `ui.html` | Interface completa (SPA de arquivo único) |
| `schema.sql` | Estrutura do banco |
| `migracao_v3_*.sql` | Migrações incrementais |
| `wrangler.toml` | Configuração do Worker/D1 |

---

## 6. Privacidade (LGPD)

- Os dados pessoais reais (CPF, telefone, financeiro, CRM) **nunca entram no git**: ficam num seed ignorado (`seed_dados_reais.sql`) e num banco privado — este repositório é só o código.
- As chaves de acesso são *secrets* do Wrangler, não vão no código nem no HTML; trocar é um comando e desloga quem usava a antiga.
- CPF/telefone e todo o financeiro só aparecem com a chave admin; a equipe opera checklist, hospedagem e tarefas sem ver dado pessoal.
