/**
 * Permite que las pruebas de Node importen módulos de `lib/` con el alias `@/`
 * que usa el proyecto. Next y TypeScript lo resuelven por configuración; Node,
 * que ejecuta estas pruebas directamente, no sabe nada de él.
 *
 * Se carga con `node --import ./scripts/helpers/alias-hook.mjs`. Solo toca los
 * especificadores que empiezan por `@/`; el resto sigue su camino normal.
 */
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const target = path.join(root, specifier.slice(2));
    const file = path.extname(target) ? target : `${target}.ts`;
    return { url: pathToFileURL(file).href, shortCircuit: true };
  },
});
