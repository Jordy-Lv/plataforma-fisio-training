import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "FormData", "getComputedStyle"])
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const require = createRequire(import.meta.url);
const sourceRoot = path.resolve(import.meta.dirname, "..");
const modules = new Map();
const actionError = "No se pudo guardar. Revisa los datos e inténtalo de nuevo.";

// Ejecuta los componentes reales con el mismo compilador que usa la suite de resiliencia.
function load(relative) {
  if (modules.has(relative)) return modules.get(relative).exports;
  const filename = path.join(sourceRoot, relative);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  modules.set(relative, loaded);
  function resolve(name) {
    if (name === "@/lib/auth/people-actions") {
      const reject = async () => ({ error: actionError });
      return { createPerson: reject, assignProfessional: reject, deactivatePerson: reject };
    }
    if (!name.startsWith("@/")) return require(name);
    const base = name.slice(2);
    const extension = [".ts", ".tsx"].find((ext) => existsSync(path.join(sourceRoot, base + ext)));
    return load(base + extension);
  }
  new Function("require", "module", "exports", compiled)(resolve, loaded, loaded.exports);
  return loaded.exports;
}

const { PeopleFilter } = load("components/auth/PeopleFilter.tsx");
const { DetailPanel } = load("components/ui/DetailDialog.tsx");
const { CreatePersonForm, AssignmentForm } = load("components/auth/PeopleForms.tsx");
const el = React.createElement;

async function mount(t, element) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  t.after(async () => {
    await React.act(async () => root.unmount());
    container.remove();
  });
  await React.act(async () => root.render(element));
  return { container, render: async (next) => React.act(async () => root.render(next)) };
}

function directory(people) {
  return el(PeopleFilter, { searchPlaceholder: "Buscar", specialties: [{ value: "training", label: "Entrenadores" }] },
    el("ul", null, people.map(([name, specialty]) => el("li", {
      key: name, "data-name": name, "data-specialty": specialty,
    }, name))),
  );
}

async function search(container, value) {
  await React.act(async () => {
    const input = container.querySelector("input");
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const visibleNames = (container) => [...container.querySelectorAll("li:not([hidden])")].map((item) => item.textContent);

test("Personas permite buscar un nombre sin escribir sus tildes", async (t) => {
  const { container } = await mount(t, directory([["María Pérez", "training"], ["Carla", "physio"]]));
  await search(container, "  MARIA perez ");
  assert.deepEqual(visibleNames(container), ["María Pérez"]);
});

test("Personas conserva la búsqueda y la especialidad cuando se actualiza la lista", async (t) => {
  const { container, render } = await mount(t, directory([["Ana", "training"]]));
  await search(container, "ana");
  await React.act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Entrenadores").click());
  await render(directory([["Ana", "training"], ["Ana Fisio", "physio"], ["Beto", "training"], ["Ana Nueva", "training"]]));
  assert.deepEqual(visibleNames(container), ["Ana", "Ana Nueva"]);
  await render(directory([["Beto", "training"]]));
  assert.deepEqual(visibleNames(container), []);
  assert.match(container.textContent, /Nadie coincide/);
});

test("Un directorio vacío no muestra además un error de búsqueda", async (t) => {
  const { container } = await mount(t, directory([]));
  assert.doesNotMatch(container.textContent, /Nadie coincide/);
  await search(container, "Ana");
  assert.match(container.textContent, /Nadie coincide/);
});

test("Actualizar un panel abierto conserva el foco y usa el cierre vigente", async (t) => {
  let closed = "";
  const panel = (version) => el(DetailPanel, {
    title: "Personas", open: true, onClose: () => { closed = version; },
  }, el("input", { "aria-label": "Buscar" }));
  const { container, render } = await mount(t, panel("anterior"));
  const input = container.querySelector("input");
  input.focus();
  await render(panel("actual"));
  assert.equal(document.activeElement, input);
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(closed, "actual");
});

test("El tabulador recorre el panel sin entrar en formularios plegados", async (t) => {
  const { container } = await mount(t, el(DetailPanel, { title: "Personas", open: true, onClose() {} },
    el("details", null, el("summary", null, "Dar de baja"), el("button", null, "Confirmar baja")),
  ));
  const panel = container.querySelector('[role="dialog"]');
  // JSDOM no calcula geometría; Chrome devuelve rectángulos incluso para el botón plegado.
  for (const control of panel.querySelectorAll("button, summary"))
    control.getClientRects = () => [{ width: 44, height: 44 }];
  panel.focus();
  panel.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, panel.querySelector("summary"));
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
  assert.equal(document.activeElement, panel.querySelector("button"));
});

for (const kind of ["create", "assign"]) {
  test(`${kind}: conserva los campos después de un rechazo del servidor`, async (t) => {
    const patientId = "00000000-0000-4000-a000-000000000004";
    const professionalId = "00000000-0000-4000-a000-000000000002";
    const values = kind === "create"
      ? { fullName: "María Pérez", email: "maria@demo.local", phone: "3001234567", password: "ClaveInicial123" }
      : { patientId, professionalId };
    const component = kind === "create"
      ? el(CreatePersonForm, { isAdmin: true })
      : el(AssignmentForm, { patients: [{ id: patientId, full_name: "María" }], professionals: [{ id: professionalId, full_name: "Beto", specialty: "training" }] });
    const { container } = await mount(t, component);
    await React.act(async () => {
      for (const [name, value] of Object.entries(values)) {
        const control = container.querySelector(`[name="${name}"]`);
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), "value").set.call(control, value);
        control.dispatchEvent(new Event(control.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      }
      container.querySelector('button[type="submit"]').click();
    });
    assert.equal(container.querySelector('[role="alert"]')?.textContent, actionError);
    for (const [name, value] of Object.entries(values))
      assert.equal(container.querySelector(`[name="${name}"]`).value, value);
  });
}
