/**
 * Verifica el motor de asignación completo sin levantar nada: el esquema de las
 * condiciones, la evaluación por prioridad y el filtro de contraindicaciones.
 *
 * Las tres piezas son funciones puras justamente para poder comprobarlas con
 * una tabla de casos, que es lo que exige el camino 2 del plan de verificación.
 * No hace falta Supabase ni la app en marcha.
 *
 * Uso:  npm run test:rules
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isCatchAll,
  parseRuleConditions,
  safeParseRuleConditions,
} from "@/lib/catalog/rules-schema";
import {
  evaluateRules,
  explainEvaluation,
  failedChecks,
} from "@/lib/catalog/evaluate-rules";
import {
  MIN_ITEMS_PER_DAY,
  filterContraindicated,
} from "@/lib/catalog/filter-contraindications";

// --- 3.1 Esquema de condiciones ---------------------------------------------

test("el esquema acepta una regla con todos los criterios", () => {
  const conditions = parseRuleConditions({
    goal: ["rehab", "general_health"],
    level: ["beginner"],
    environment: ["home"],
    equipment_any_of: ["none", "bands"],
    equipment_all_of: ["none"],
    excludes_conditions: ["knee", "lower_back"],
    age_range: { min: 18, max: 60 },
  });
  assert.deepEqual(conditions.goal, ["rehab", "general_health"]);
  assert.equal(isCatchAll(conditions), false);
});

test("una regla sin criterios es la red de seguridad", () => {
  assert.equal(isCatchAll(parseRuleConditions({})), true);
  // `conditions` puede llegar nula desde un `jsonb` viejo.
  assert.equal(isCatchAll(parseRuleConditions(null)), true);
});

const invalidas = [
  {
    nombre: "un objetivo que no está en el vocabulario",
    value: { goal: ["ponerse_fuerte"] },
    esperado: /objetivo que no está en la lista/,
  },
  {
    nombre: "una parte del cuerpo inventada",
    value: { excludes_conditions: ["rodilla"] },
    esperado: /condición que no está en la lista/,
  },
  {
    nombre: "un criterio que no existe",
    value: { goal: ["rehab"], mood: ["happy"] },
    esperado: /criterios que ya no existen: mood/,
  },
  {
    nombre: "una lista vacía",
    value: { level: [] },
    esperado: /Selecciona al menos un valor de nivel/,
  },
  {
    nombre: "valores repetidos",
    value: { environment: ["home", "home"] },
    esperado: /No repitas valores de entorno/,
  },
  {
    nombre: "un rango de edad invertido",
    value: { age_range: { min: 60, max: 18 } },
    esperado: /edad mínima no puede ser mayor/,
  },
  {
    nombre: "un rango de edad vacío",
    value: { age_range: {} },
    esperado: /Indica al menos una edad/,
  },
  {
    nombre: "una edad con decimales",
    value: { age_range: { min: 18.5 } },
    esperado: /número entero de años/,
  },
  {
    nombre: "unas condiciones que no son un objeto",
    value: "beginner",
    esperado: /no son un objeto válido/,
  },
];

for (const caso of invalidas)
  test(`el esquema rechaza ${caso.nombre}`, () => {
    const result = safeParseRuleConditions(caso.value);
    assert.equal(result.ok, false, "se esperaba un rechazo");
    assert.match(result.issues.join(" "), caso.esperado);
    assert.throws(() => parseRuleConditions(caso.value), caso.esperado);
  });

// --- 3.2 Evaluación por prioridad -------------------------------------------

const perfil = (overrides = {}) => ({
  goal: "general_health",
  level: "beginner",
  environment: "home",
  equipment: ["none"],
  conditions: [],
  age: 30,
  ...overrides,
});

const regla = (id, priority, conditions, overrides = {}) => ({
  id,
  name: `Regla ${id}`,
  priority,
  template_id: `plantilla-${id}`,
  is_active: true,
  conditions,
  ...overrides,
});

/** El conjunto de ejemplo de docs/03-motor-de-reglas.md. */
const reglas = [
  regla("rodilla", 10, { goal: ["rehab"] }),
  regla("lumbar", 20, { goal: ["rehab"], environment: ["home"] }),
  regla("casa", 30, {
    level: ["beginner"],
    environment: ["home"],
    equipment_any_of: ["none", "bands"],
    excludes_conditions: ["knee", "lower_back"],
  }),
  regla("gym", 40, { level: ["beginner"], environment: ["gym"] }),
  regla("hipertrofia", 50, {
    goal: ["gain_muscle"],
    level: ["intermediate", "advanced"],
    environment: ["gym"],
  }),
];

const casos = [
  {
    nombre: "coincidencia por varios criterios",
    profile: perfil(),
    rules: reglas,
    gana: "casa",
  },
  {
    nombre: "un criterio no se cumple: el mismo perfil en gimnasio",
    profile: perfil({ environment: "gym" }),
    rules: reglas,
    gana: "gym",
  },
  {
    nombre: "la prioridad manda sobre lo específico",
    profile: perfil({ goal: "rehab" }),
    rules: reglas,
    gana: "rodilla",
  },
  {
    nombre: "exclusión por condición activa",
    profile: perfil({ conditions: ["knee"] }),
    rules: reglas,
    gana: null,
  },
  {
    nombre: "ninguna regla coincide",
    profile: perfil({ level: "advanced", environment: "gym", goal: "performance" }),
    rules: reglas,
    gana: null,
  },
  {
    nombre: "la regla genérica recoge lo que nadie recoge",
    profile: perfil({ level: "advanced", environment: "gym", goal: "performance" }),
    rules: [...reglas, regla("generica", 99, {})],
    gana: "generica",
  },
  {
    nombre: "una regla inactiva no participa aunque tenga la prioridad más alta",
    profile: perfil(),
    rules: [regla("inactiva", 1, {}, { is_active: false }), ...reglas],
    gana: "casa",
  },
  {
    nombre: "empate de prioridad: gana la que llega primero",
    profile: perfil(),
    rules: [regla("primera", 10, {}), regla("segunda", 10, {})],
    gana: "primera",
  },
  {
    nombre: "el orden de llegada no altera el de prioridad",
    profile: perfil(),
    rules: [...reglas].reverse(),
    gana: "casa",
  },
  {
    nombre: "una regla con condiciones rotas se ignora y sigue la siguiente",
    profile: perfil(),
    rules: [regla("rota", 5, { goal: ["ponerse_fuerte"] }), ...reglas],
    gana: "casa",
  },
  {
    nombre: "equipment_any_of: basta con tener uno",
    profile: perfil({ equipment: ["bands", "ball"] }),
    rules: [regla("bandas", 10, { equipment_any_of: ["none", "bands"] })],
    gana: "bandas",
  },
  {
    nombre: "equipment_all_of: hacen falta todos",
    profile: perfil({ equipment: ["dumbbells"] }),
    rules: [regla("completo", 10, { equipment_all_of: ["dumbbells", "bands"] })],
    gana: null,
  },
  {
    nombre: "age_range: la edad cae dentro",
    profile: perfil({ age: 45 }),
    rules: [regla("adultos", 10, { age_range: { min: 18, max: 60 } })],
    gana: "adultos",
  },
  {
    nombre: "age_range: la edad queda fuera",
    profile: perfil({ age: 70 }),
    rules: [regla("adultos", 10, { age_range: { min: 18, max: 60 } })],
    gana: null,
  },
  {
    nombre: "age_range: sin fecha de nacimiento no se da por cumplido",
    profile: perfil({ age: null }),
    rules: [regla("adultos", 10, { age_range: { min: 18 } })],
    gana: null,
  },
];

for (const caso of casos)
  test(`evaluación: ${caso.nombre}`, () => {
    const match = evaluateRules(caso.profile, caso.rules);
    assert.equal(
      match?.rule.id ?? null,
      caso.gana,
      `ganó ${match?.rule.id ?? "ninguna"} y se esperaba ${caso.gana ?? "ninguna"}`,
    );
    if (caso.gana)
      assert.equal(match.rule.template_id, `plantilla-${caso.gana}`);
  });

test("la evaluación explica qué pasó con cada regla", () => {
  const rules = [
    regla("rota", 5, { level: ["experto"] }),
    regla("inactiva", 8, {}, { is_active: false }),
    ...reglas,
  ];
  const { match, rules: evaluadas } = explainEvaluation(perfil(), rules);
  assert.equal(match.rule.id, "casa");

  const porId = Object.fromEntries(evaluadas.map((e) => [e.rule.id, e]));
  assert.equal(porId.rota.status, "invalid");
  assert.match(porId.rota.issues.join(" "), /nivel que no está en la lista/);
  assert.equal(porId.inactiva.status, "inactive");
  assert.equal(porId.lumbar.status, "no_match");
  assert.equal(porId.casa.status, "match");
  // Después de la ganadora ya no se evalúa nada más.
  assert.equal(porId.gym.status, "not_evaluated");

  // El fallo se explica por criterio, que es lo que pinta el simulador.
  const fallo = failedChecks(porId.lumbar);
  assert.equal(fallo.length, 1);
  assert.equal(fallo[0].criterion, "goal");
  assert.match(fallo[0].expected, /Rehabilitación/);
  assert.match(fallo[0].actual, /Salud general/);

  // Y la ganadora explica por qué ganó: todos sus criterios se cumplieron.
  assert.ok(porId.casa.checks.length >= 4);
  assert.ok(porId.casa.checks.every((check) => check.ok));
});

test("evaluar no toca el arreglo de reglas que recibe", () => {
  const rules = [regla("b", 20, {}), regla("a", 10, {})];
  const copia = JSON.parse(JSON.stringify(rules));
  evaluateRules(perfil(), rules);
  assert.deepEqual(rules, copia);
});

// --- 3.3 y 3.4 Filtro de contraindicaciones ---------------------------------

const ejercicio = (id, name, contraindications = []) => ({
  id,
  name,
  contraindications,
});

const dia = (day_number, items) => ({
  day_number,
  title: `Día ${day_number}`,
  items: items.map((exercise, index) => ({
    id: `${day_number}-${index}`,
    position: index + 1,
    sets: 3,
    exercise,
  })),
});

const plan = () => [
  dia(1, [
    ejercicio("sentadilla", "Sentadilla", ["knee"]),
    ejercicio("plancha", "Plancha"),
    ejercicio("remo", "Remo con banda"),
    ejercicio("zancada", "Zancada", ["knee", "hip"]),
  ]),
  dia(2, [
    ejercicio("peso-muerto", "Peso muerto", ["lower_back"]),
    ejercicio("press", "Press de hombro"),
    ejercicio("curl", "Curl de bíceps"),
  ]),
];

test("el filtro elimina los ejercicios contraindicados y deja el rastro", () => {
  const result = filterContraindicated(plan(), ["knee"]);

  assert.deepEqual(
    result.days[0].items.map((item) => item.exercise.id),
    ["plancha", "remo"],
  );
  assert.equal(result.days[1].items.length, 3, "el día 2 no se toca");
  assert.deepEqual(
    result.removed.map((item) => item.exercise_id),
    ["sentadilla", "zancada"],
  );
  assert.deepEqual(result.removed[1].reasons, ["knee"]);
  assert.match(result.notes, /se quitó «Sentadilla», contraindicado para Rodilla/);
  // Se conserva lo que traía cada ítem: el filtro quita, no reescribe.
  assert.equal(result.days[0].items[0].sets, 3);
  assert.equal(result.days[0].title, "Día 1");
});

test("sin condiciones activas no se quita nada", () => {
  const result = filterContraindicated(plan(), []);
  assert.equal(result.removed.length, 0);
  assert.equal(result.needsReview, false);
  assert.equal(result.notes, "");
});

test("varias condiciones se acumulan y cada una queda justificada", () => {
  const result = filterContraindicated(plan(), ["knee", "hip", "lower_back"]);
  assert.deepEqual(
    result.removed.map((item) => item.exercise_id),
    ["sentadilla", "zancada", "peso-muerto"],
  );
  assert.deepEqual(result.removed[1].reasons, ["knee", "hip"]);
  assert.match(result.notes, /contraindicado para Rodilla y Cadera/);
});

test("un día que queda corto marca la rutina para revisión", () => {
  const result = filterContraindicated(plan(), ["knee"]);
  assert.deepEqual(result.shortDays, [1]);
  assert.deepEqual(result.emptyDays, []);
  assert.equal(result.needsReview, true);
  assert.match(result.alerts.join(" "), /menos de 3 ejercicios/);
  assert.equal(result.days[0].items.length < MIN_ITEMS_PER_DAY, true);
});

test("nunca se entrega un día vacío", () => {
  const dias = [
    dia(1, [
      ejercicio("sentadilla", "Sentadilla", ["knee"]),
      ejercicio("zancada", "Zancada", ["knee"]),
    ]),
    dia(2, [ejercicio("plancha", "Plancha"), ejercicio("remo", "Remo")]),
  ];
  const result = filterContraindicated(dias, ["knee"]);

  assert.equal(result.days[0].items.length, 0);
  assert.deepEqual(result.emptyDays, [1]);
  assert.deepEqual(result.shortDays, [1, 2]);
  assert.equal(result.needsReview, true, "la rutina no se puede entregar así");
  assert.match(result.alerts.join(" "), /Sin ejercicios en el día 1/);
  assert.match(result.alerts.join(" "), /El día 2 queda con menos de 3/);
  assert.match(result.notes, /hay que rehacerlo antes de entregar la rutina/);
});

test("una plantilla ya corta se señala aunque no haya condiciones", () => {
  const result = filterContraindicated([dia(1, [ejercicio("plancha", "Plancha")])], []);
  assert.equal(result.needsReview, true);
  assert.deepEqual(result.shortDays, [1]);
});

test("el filtro no muta los días que recibe", () => {
  const dias = plan();
  const copia = JSON.parse(JSON.stringify(dias));
  filterContraindicated(dias, ["knee", "lower_back"]);
  assert.deepEqual(dias, copia);
});
