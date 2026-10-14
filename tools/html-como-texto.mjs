/* Registra o hook de .html para o processo inteiro.
   Uso:  node --import ./tools/html-como-texto.mjs tools/checar-travas.mjs
   Existe porque o worker.js faz `import UI_HTML from "./ui.html"`, que é do Wrangler: sem
   isto o node recusa o arquivo e nenhum teste alcança o worker. */
import { register } from "node:module";
register("./html-hooks.mjs", import.meta.url);
