/* Faz o node entender `import X from "./algo.html"` — o Wrangler entende por padrão, o node
   não, e sem isto nenhum teste consegue importar o worker.js. Ver html-como-texto.mjs. */
import { readFile } from "node:fs/promises";

export async function load(url, context, next) {
  if (url.endsWith(".html")) {
    const texto = await readFile(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: `export default ${JSON.stringify(texto)};` };
  }
  return next(url, context);
}
