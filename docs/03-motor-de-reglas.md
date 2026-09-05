# 03 — Motor de asignación de rutinas

## Qué resuelve

Cuando un paciente termina su registro, la plataforma le propone una rutina base **sin
que un profesional tenga que armarla desde cero**. El profesional entra después a
ajustarla, que es donde su criterio aporta valor.

Esto no es inteligencia artificial. Fue una decisión explícita del cliente y es la
correcta: el criterio clínico lo define el equipo profesional una sola vez, en forma de
reglas, y el sistema lo aplica de manera consistente y auditable. Con un modelo de IA
nadie podría explicar por qué a un paciente con dolor de rodilla le tocó determinado
ejercicio. → [ADR-0003](adr/0003-motor-de-reglas-sin-ia.md)

## Cómo funciona

```
Paciente completa el registro
        │
        ├─ objetivo, nivel, entorno, equipamiento
        └─ condiciones activas (rodilla, lumbar, hombro…)
        │
        ▼
Se leen assignment_rules activas, ORDENADAS POR priority ASC
        │
        ▼
Para cada regla: ¿coincide con el perfil del paciente?
        │
        ├─ No  → siguiente regla
        └─ Sí  → GANA. Se detiene la evaluación.
                 │
                 ▼
        Se copia la plantilla (snapshot) a routines / routine_days / routine_items
                 │
                 ▼
        Se eliminan de la copia los ejercicios contraindicados
        por alguna condición activa del paciente
                 │
                 ▼
        Rutina en estado 'active'. Se notifica al profesional a cargo.
```

Si ninguna regla coincide, **no se inventa nada**: el paciente queda sin rutina, se genera
una alerta para el profesional y la vista del paciente muestra "Tu profesional está
preparando tu rutina". Es preferible a asignar algo inadecuado.

## Forma de una regla

`assignment_rules.conditions` es un `jsonb`. Todos los campos son opcionales; un campo
ausente significa "no me importa este criterio".

```json
{
  "goal": ["lose_weight", "general_health"],
  "level": ["beginner"],
  "environment": ["home"],
  "equipment_any_of": ["none", "bands"],
  "excludes_conditions": ["knee", "lower_back"],
  "age_range": { "min": 18, "max": 60 }
}
```

| Campo | Coincide cuando |
|---|---|
| `goal` | El objetivo del paciente está en la lista |
| `level` | Su nivel está en la lista |
| `environment` | Su entorno está en la lista |
| `equipment_any_of` | Tiene **al menos uno** de esos equipamientos |
| `equipment_all_of` | Tiene **todos** esos equipamientos |
| `excludes_conditions` | El paciente **no** tiene ninguna de esas condiciones activas. Si la tiene, la regla no aplica |
| `age_range` | Su edad cae en el rango |

Los campos presentes se combinan con **Y lógico**: todos deben cumplirse. Dentro de un
campo de lista, la lógica es **O**.

## Ejemplo de conjunto de reglas

| Prioridad | Nombre | Condiciones | Plantilla |
|---|---|---|---|
| 10 | Rehabilitación de rodilla | `goal: [rehab]`, cualquier nivel | Protocolo rodilla — fase 1 |
| 20 | Lumbalgia en casa | `goal: [rehab]`, `environment: [home]` | Protocolo lumbar — casa |
| 30 | Principiante en casa sin equipo | `level: [beginner]`, `environment: [home]`, `equipment_any_of: [none, bands]`, `excludes_conditions: [knee, lower_back]` | Full body casa — principiante |
| 40 | Principiante en gimnasio | `level: [beginner]`, `environment: [gym]` | Full body gym — principiante |
| 50 | Intermedio hipertrofia gimnasio | `goal: [gain_muscle]`, `level: [intermediate, advanced]`, `environment: [gym]` | Torso-pierna — intermedio |
| 99 | Genérico | *(sin condiciones)* | Acondicionamiento general |

**La prioridad importa más que las condiciones.** Las reglas de rehabilitación van
primero porque una condición clínica manda sobre cualquier objetivo estético. La regla 99
es la red de seguridad; el equipo decide si la quiere activa.

## Filtro de contraindicaciones

Es un segundo paso, independiente de la regla que haya ganado, y es el que protege al
paciente:

```
Para cada routine_item copiado:
  si algún exercises.contraindications ∩ condiciones_activas_del_paciente ≠ ∅
    → se elimina el ítem de la rutina
    → se registra en routine.notes qué se quitó y por qué
```

Si al terminar el filtro un día queda con menos de 3 ejercicios, se marca la rutina para
revisión del profesional y se genera una alerta. Nunca se entrega un día vacío.

## Vocabulario de partes del cuerpo

`patient_conditions.body_part`, `exercises.contraindications` y `session_logs.pain_location`
comparten este vocabulario cerrado. **Un valor fuera de la lista rompe el filtro en
silencio**, así que se valida con Zod en la entrada:

```
neck · shoulder · elbow · wrist · upper_back · lower_back
hip · knee · ankle · foot · core · other
```

Se define una sola vez en `lib/catalog/body-parts.ts` y todo el proyecto importa de ahí.

## Dónde vive el código

```
lib/catalog/
├── body-parts.ts        Vocabulario compartido
├── rules-schema.ts      Zod de conditions — valida lo que el admin escribe
├── evaluate-rules.ts    Función pura: (perfil, reglas) → template_id | null
└── assign-routine.ts    Server action: evalúa, copia el snapshot, filtra, persiste
```

`evaluate-rules.ts` es **una función pura sin acceso a base de datos**: recibe el perfil y
el arreglo de reglas, devuelve un `template_id` o `null`. Así se puede probar con una
tabla de casos sin levantar nada, que es justo lo que hay que verificar en la demo.

## Panel de administración

El equipo profesional edita las reglas sin tocar código:

- Lista de reglas ordenada por prioridad, con reordenamiento.
- Formulario por criterio (no un editor de JSON: el JSON es el almacenamiento, no la
  interfaz).
- **Simulador**: se introduce un perfil de paciente ficticio y se muestra qué regla
  ganaría y qué plantilla se asignaría. Es la funcionalidad que hace creíble el motor en
  la demostración; sin ella, el cliente tiene que confiar en nuestra palabra.

## Qué debe demostrarse

Del [plan de verificación](07-plan-de-verificacion.md), camino 2:

1. Un paciente con objetivo, entorno y condición determinados recibe una rutina coherente.
2. Ningún ejercicio de esa rutina está contraindicado para su condición.
3. Al **cambiar una regla en el panel**, el siguiente paciente con el mismo perfil recibe
   una plantilla distinta.

El punto 3 es el que prueba que el sistema está realmente parametrizado y no tiene la
lógica escrita a mano.
