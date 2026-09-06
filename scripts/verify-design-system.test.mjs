/*
  Auditoría estática del sistema de diseño. No levanta la aplicación ni la base
  de datos: lee los archivos y comprueba las reglas que CLAUDE.md da por
  sentadas y que ninguna otra suite vigila.

  Existe porque las tres cosas que rompen la identidad visual —un color escrito
  a mano, una tipografía escrita a mano y una pantalla sin sus estados— no fallan
  en `typecheck` ni en `lint`: se ven semanas después, cuando cambiar un token ya
  no cambia toda la aplicación.
*/
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

const root = new URL("..", import.meta.url).pathname;

// Los únicos dos sitios donde un color literal es correcto: la definición de los
// tokens y los colores que el navegador necesita antes de cargar el CSS (barra
// de estado de la PWA y fondo del manifest).
const COLOR_SOURCES = ["app/globals.css", "lib/pwa/theme.ts"];

const TAILWIND_PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (/\.(tsx?|css)$/.test(entry)) files.push(full);
  }
  return files;
}

const sources = ["app", "components", "lib"]
  .flatMap((dir) => walk(join(root, dir)))
  .map((file) => ({
    path: relative(root, file),
    text: readFileSync(file, "utf8"),
  }))
  .filter(({ path }) => !COLOR_SOURCES.includes(path));

function offenders(pattern) {
  const found = [];
  for (const { path, text } of sources) {
    for (const [index, line] of text.split("\n").entries()) {
      // Una URL con almohadilla no es un color.
      if (/https?:\/\//.test(line)) continue;
      const match = line.match(pattern);
      if (match) found.push(`${path}:${index + 1} → ${match[0].trim()}`);
    }
  }
  return found;
}

test("ningún color literal fuera de los tokens", () => {
  const literals = offenders(
    new RegExp(
      [
        "#[0-9a-fA-F]{3,8}\\b", // #146c5b
        "\\b(?:rgba?|hsla?|oklch)\\([^)]*\\)", // rgb(20 108 91)
        "-\\[#[0-9a-fA-F]{3,8}\\]", // bg-[#146c5b]
        `\\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|accent|decoration|shadow)-(?:${TAILWIND_PALETTE})-\\d{2,3}\\b`, // text-blue-500
        "\\b(?:bg|text|border)-(?:white|black)\\b",
      ].join("|"),
    ),
  );
  assert.deepEqual(
    literals,
    [],
    `La identidad visual se cambia moviendo tokens en app/globals.css; un color escrito a mano no cambiaría:\n${literals.join("\n")}`,
  );
});

test("ninguna tipografía escrita a mano", () => {
  const fonts = offenders(/font-family\s*:|font-\['/);
  assert.deepEqual(
    fonts,
    [],
    `La tipografía sale de \`--font-sans\`, que \`next/font\` autoaloja:\n${fonts.join("\n")}`,
  );
});

test("el campo de formulario se define una sola vez", () => {
  const duplicates = sources
    .filter(
      ({ path, text }) =>
        path !== "components/ui/Field.tsx" &&
        /const\s+inputClass\s*=/.test(text),
    )
    .map(({ path }) => path);
  assert.deepEqual(
    duplicates,
    [],
    `\`inputClass\` vive en components/ui/Field.tsx; una copia se queda atrás en el próximo ajuste:\n${duplicates.join("\n")}`,
  );
});

test("cada grupo de rutas define sus estados de carga y de error", () => {
  // `(dev)` solo existe en desarrollo y no recibe visitas reales.
  const groups = readdirSync(join(root, "app")).filter(
    (entry) =>
      entry.startsWith("(") && entry.endsWith(")") && entry !== "(dev)",
  );
  assert.ok(groups.length > 0, "No se encontró ningún grupo de rutas");
  const missing = groups.flatMap((group) => {
    const files = readdirSync(join(root, "app", group));
    return ["loading.tsx", "error.tsx"]
      .filter((file) => !files.includes(file))
      .map((file) => `app/${group}/${file}`);
  });
  assert.deepEqual(
    missing,
    [],
    `Toda vista que carga datos define cargando, vacío y error:\n${missing.join("\n")}`,
  );
});
