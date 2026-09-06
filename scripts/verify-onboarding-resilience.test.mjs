import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import ts from "typescript";

// React y los componentes reales se ejecutan en un DOM; solo se sustituyen
// Supabase y los adaptadores de Next. No se toca ninguna base de datos.
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "MouseEvent", "FormData"])
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const sourceRoot = process.env.FISIO_AUTH_SOURCE_ROOT ?? root;
const patientId = "00000000-0000-4000-a000-000000000004";
const message = "No pudimos verificar tu sesión. Vuelve a intentarlo.";
const redirect = (url) => { throw Object.assign(new Error(`Redirección: ${url}`), { destination: url }); };

function scenario({ authThrows = 0, failedTable, failures = 0, throws = false, patientDetails = null } = {}) {
  const calls = { auth: 0, profiles: 0, patient_details: 0, writes: [] };
  let details = patientDetails;
  const client = {
    auth: { async getUser() {
      calls.auth++;
      if (calls.auth <= authThrows) throw new TypeError("Fallo de red inyectado");
      return { data: { user: { id: patientId } }, error: null };
    } },
    from(table) {
      let values;
      const query = {
        select() { return query; }, eq() { return query; },
        async maybeSingle() {
          calls[table]++;
          if (table === failedTable && calls[table] <= failures) {
            if (throws) throw new TypeError("Fallo de red inyectado");
            return { data: null, error: { message: "Backend temporalmente inaccesible" } };
          }
          return { data: table === "profiles" ? { id: patientId, role: "patient", full_name: "Paciente de prueba", is_active: true } : details, error: null };
        },
        async upsert(input) { calls.writes.push(input); details = input; return { error: null }; },
        update(input) { values = input; return query; },
        insert(input) { values = input; return query; },
        async single() { calls.writes.push(values); return { data: { id: patientId, profile_id: patientId }, error: null }; },
      };
      return query;
    },
  };
  const cache = new Map();
  function load(relative) {
    if (cache.has(relative)) return cache.get(relative).exports;
    const candidate = path.join(sourceRoot, relative);
    const filename = existsSync(candidate) ? candidate : path.join(root, relative);
    const source = readFileSync(filename, "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText;
    const loadedModule = { exports: {} };
    cache.set(relative, loadedModule);
    const native = (tag) => function Native({ children, ...props }) { return React.createElement(tag, props, children); };
    function resolve(name) {
      if (name === "server-only") return {};
      if (name === "@/lib/supabase/server") return { createClient: async () => client };
      if (name === "next/navigation") return { redirect };
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "next/link") return { __esModule: true, default: native("a") };
      if (name === "@/components/ui/button") return { Button: (props) => { const nativeProps = { ...props }; delete nativeProps.variant; return React.createElement("button", nativeProps); } };
      if (name === "@/components/auth/Workspace") return { Workspace: ({ children }) => React.createElement("main", null, children) };
      if (name.startsWith("@/")) {
        const base = name.slice(2);
        const extension = [".ts", ".tsx"].find((ext) => existsSync(path.join(root, base + ext)));
        return load(base + extension);
      }
      return require(name);
    }
    new Function("require", "module", "exports", compiled)(resolve, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return { calls, load };
}

class Boundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? React.createElement("p", { "data-boundary": true }, "Error boundary") : this.props.children; }
}
async function mount(t, element) {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  t.after(async () => { await React.act(async () => root.unmount()); container.remove(); });
  await React.act(async () => root.render(React.createElement(Boundary, null, element)));
  return { container, root };
}
async function submit(container) {
  await React.act(async () => {
    container.querySelector('button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve, 700));
  });
}
const formData = (values) => { const form = new FormData(); for (const [key, value] of Object.entries(values)) form.set(key, value); return form; };

test("getUser que lanza se convierte en sesión ausente", async () => {
  const s = scenario({ authThrows: 1 });
  assert.equal(await s.load("lib/auth/session.ts").getActiveProfile(), null);
  assert.equal(s.calls.profiles, 0);
});

for (const throws of [false, true]) {
  test(`profiles reintenta una sola vez ante ${throws ? "excepción" : "respuesta de error"}`, async () => {
    const s = scenario({ failedTable: "profiles", failures: 1, throws });
    const started = performance.now();
    assert.equal((await s.load("lib/auth/session.ts").getActiveProfile()).id, patientId);
    assert.equal(s.calls.profiles, 2);
    assert.ok(performance.now() - started >= 290, "El segundo intento debe esperar el backoff");
  });
  test(`patient_details recupera el render después de ${throws ? "excepción" : "respuesta de error"}`, async () => {
    const s = scenario({ failedTable: "patient_details", failures: 1, throws });
    const page = await s.load("app/(patient)/patient/onboarding/page.tsx").default({ searchParams: Promise.resolve({}) });
    assert.ok(React.isValidElement(page));
    assert.equal(s.calls.patient_details, 2);
  });
}

for (const table of ["profiles", "patient_details"]) {
  test(`${table} propaga el error al agotar dos intentos`, async () => {
    const s = scenario({ failedTable: table, failures: 10 });
    await assert.rejects(s.load("app/(patient)/patient/onboarding/page.tsx").default({ searchParams: Promise.resolve({}) }), /No se pudo/);
    assert.equal(s.calls[table], 2);
  });
}

for (const failure of [{ authThrows: 1 }, { failedTable: "profiles", failures: 2 }]) {
  test(`Paso 1 conserva objetivo y nivel sin error boundary: ${JSON.stringify(failure)}`, async (t) => {
    const s = scenario(failure);
    const { OnboardingForm } = s.load("components/auth/OnboardingForm.tsx");
    const { container } = await mount(t, React.createElement(OnboardingForm, { step: 1, details: null }));
    await React.act(async () => {
      container.querySelector('[name="goal"][value="rehab"]').click();
      container.querySelector('[name="level"][value="intermediate"]').click();
    });
    await submit(container);
    assert.equal(container.querySelector("[data-boundary]"), null, "Un fallo de sesión no debe desmontar el formulario");
    assert.equal(container.querySelector('[role="alert"]')?.textContent, message);
    assert.equal(container.querySelector('[name="goal"]:checked')?.value, "rehab");
    assert.equal(container.querySelector('[name="level"]:checked')?.value, "intermediate");
    assert.equal(s.calls.writes.length, 0);
    const values = new FormData(container.querySelector("form"));
    await assert.rejects(s.load("lib/auth/onboarding-actions.ts").saveOnboardingStep({}, values), (error) => error.destination === "/patient/onboarding");
    assert.equal(s.calls.writes[0].goal, "rehab");
    assert.equal(s.calls.writes[0].level, "intermediate");
  });
}

test("Paso 1 supera un primer error de profiles y guarda antes del render del paso 2", async () => {
  const s = scenario({ failedTable: "profiles", failures: 1 });
  await assert.rejects(s.load("lib/auth/onboarding-actions.ts").saveOnboardingStep({}, formData({ step: "1", goal: "rehab", level: "beginner" })), (error) => error.destination === "/patient/onboarding");
  assert.equal(s.calls.profiles, 2);
  assert.equal(s.calls.writes[0].onboarding_step, 1);
  assert.ok(await s.load("app/(patient)/patient/onboarding/page.tsx").default({ searchParams: Promise.resolve({}) }));
});

for (const action of ["updatePatientProfile", "saveCondition"]) {
  test(`${action} devuelve error de sesión sin escribir`, async () => {
    const s = scenario({ authThrows: 1 });
    const input = action === "saveCondition" ? { patientId, body_part: "knee", severity: "moderate", notes: "Conservar observación", is_active: "on" } : { patientId, goal: "rehab", level: "beginner", environment: "home", equipment: "bands" };
    assert.deepEqual(await s.load("lib/auth/onboarding-actions.ts")[action]({}, formData(input)), { error: message });
    assert.equal(s.calls.writes.length, 0);
  });
}

test("Condición conserva el texto y la selección tras un fallo de sesión", async (t) => {
  const s = scenario({ authThrows: 1 });
  const { ConditionForm } = s.load("components/auth/PatientProfileForms.tsx");
  const { container } = await mount(t, React.createElement(ConditionForm, { patientId }));
  await React.act(async () => {
    for (const [name, value] of [["body_part", "knee"], ["severity", "moderate"], ["notes", "Conservar esta observación"]]) {
      const input = container.querySelector(`[name="${name}"]`);
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set.call(input, value);
      input.dispatchEvent(new dom.window.Event(name === "notes" ? "input" : "change", { bubbles: true }));
    }
  });
  await submit(container);
  assert.equal(container.querySelector("[data-boundary]"), null);
  assert.equal(container.querySelector('[role="alert"]')?.textContent, message);
  assert.equal(container.querySelector('[name="notes"]').value, "Conservar esta observación");
  assert.equal(container.querySelector('[name="body_part"]').value, "knee");
});

test("requireRole reintenta el avance del onboarding en cada página normal del paciente", async () => {
  const s = scenario({ failedTable: "patient_details", failures: 1, patientDetails: { onboarding_step: 3 } });
  const profile = await s.load("lib/auth/session.ts").requireRole("patient");
  assert.equal(profile.id, patientId);
  assert.equal(s.calls.patient_details, 2, "debe reintentar antes de rendirse, igual que en el onboarding");
});

test("requireRole propaga el error del avance tras agotar los reintentos", async () => {
  const s = scenario({ failedTable: "patient_details", failures: 10, patientDetails: { onboarding_step: 3 } });
  await assert.rejects(s.load("lib/auth/session.ts").requireRole("patient"), /No se pudo consultar el avance/);
  assert.equal(s.calls.patient_details, 2);
});

test("Error boundary hace un único reintento automático incluso en StrictMode", async (t) => {
  const ErrorView = scenario().load("app/(patient)/error.tsx").default;
  let resets = 0;
  const { root } = await mount(t, React.createElement(React.StrictMode, null, React.createElement(ErrorView, { reset: () => resets++ })));
  assert.equal(resets, 1);
  await React.act(async () => root.render(React.createElement(Boundary, null, React.createElement(React.StrictMode, null, React.createElement(ErrorView, { reset: () => resets++ })))));
  assert.equal(resets, 1);
});
