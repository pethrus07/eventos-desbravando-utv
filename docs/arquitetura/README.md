# Arquitetura

Diagramas de 2 sistemas ligados a este repositório. Cada um tem três vistas, cada vista numa notação padrão.

| Vista | Notação | Responde |
|---|---|---|
| 1. Casos de uso | UML | Quem usa e para quê |
| 2. Processo | BPMN 2.0 | Como o trabalho anda, com uma raia para cada quem executa |
| 3. Arquitetura | C4, nível 2 | De que partes o sistema é feito e com quem conversa |

## Desbravando UTV · as plataformas do cliente

Guarda-chuva das ferramentas que o Pedro mantém para a Desbravando UTV, operação de expedições de UTV: controle das expedições, formulário público, acervo de arquivos, estúdio de briefing e o site na Wix.

### 1. Quem usa e para quê

![Casos de uso de Desbravando UTV](./desbravando-utv-1-casos-de-uso.svg)

### 2. Da expedição fechada à página no site

![Processo de Desbravando UTV](./desbravando-utv-2-processo.svg)

### 3. Arquitetura

![Arquitetura de Desbravando UTV](./desbravando-utv-3-arquitetura.svg)

Para editar: [desbravando-utv.excalidraw](./desbravando-utv.excalidraw), que abre em [excalidraw.com](https://excalidraw.com) ou na extensão Excalidraw do VS Code.

## Controle de Eventos · gestão das expedições

Sistema em produção que a equipe da Desbravando UTV usa no celular, em campo: checklist, ciclo operacional, participantes, financeiro, hospedagem e formulários públicos. O Claude do dono opera o mesmo sistema pelo conector MCP.

### 1. Quem usa e para quê

![Casos de uso de Controle de Eventos](./controle-de-eventos-1-casos-de-uso.svg)

### 2. Da expedição criada à operação pronta

![Processo de Controle de Eventos](./controle-de-eventos-2-processo.svg)

### 3. Arquitetura

![Arquitetura de Controle de Eventos](./controle-de-eventos-3-arquitetura.svg)

Para editar: [controle-de-eventos.excalidraw](./controle-de-eventos.excalidraw), que abre em [excalidraw.com](https://excalidraw.com) ou na extensão Excalidraw do VS Code.

## De onde vêm

Os diagramas são gerados a partir do Sinapse, o vault onde o Pedro organiza notas e projetos. Mudança feita direto aqui some na próxima publicação: o lugar de mudar é a especificação no Sinapse.
