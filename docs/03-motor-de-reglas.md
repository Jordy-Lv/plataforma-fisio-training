# 03 — Asignación de rutinas por el profesional

## Qué resuelve

El entrenador o fisioterapeuta decide qué rutina recibe cada paciente. La plataforma no
elige ni propone una plantilla al terminar el registro. El profesional revisa el perfil y
las condiciones del paciente, selecciona una plantilla adecuada, ajusta la copia para ese
caso y la asigna.

La plantilla original queda intacta. Cada asignación crea un **snapshot** en las tablas de
rutinas del paciente, de modo que los cambios individuales no afectan a otras personas ni
a la plantilla del equipo. → [ADR-0001](adr/0001-snapshot-de-rutinas.md) y
[ADR-0009](adr/0009-asignacion-manual-de-rutinas.md).

## Flujo de asignación

```
El paciente termina el registro
        │
        ▼
El entrenador o fisioterapeuta abre su ficha
        │
        ├─ revisa objetivo, nivel, entorno, equipamiento y condiciones
        └─ elige una plantilla de su especialidad
        │
        ▼
La plataforma copia la plantilla a la rutina del paciente (snapshot)
        │
        ▼
El profesional revisa y ajusta ejercicios, series y repeticiones
        │
        ▼
Confirma la asignación
        │
        ▼
El paciente ve su rutina desde el celular
```

Hasta que el profesional confirme una asignación, el paciente permanece sin rutina y ve
un estado que explica que su profesional debe asignarla. No se escoge una plantilla por
coincidencia de perfil ni se crea una asignación automática durante el onboarding.

## Condiciones y contraindicaciones

Las condiciones registradas por el paciente son información que el profesional revisa
antes de elegir y ajustar la rutina. Los ejercicios marcados como contraindicados para una
condición activa deben quedar excluidos de la rutina asignada.

El vocabulario compartido de `patient_conditions.body_part`,
`exercises.contraindications` y `session_logs.pain_location` está en
`lib/catalog/body-parts.ts`:

```
neck · shoulder · elbow · wrist · upper_back · lower_back
hip · knee · ankle · foot · core · other
```

## Plantillas

El equipo define las plantillas en `routine_templates`, `template_days` y `template_items`.
El profesional usa el catálogo para elegir una plantilla del tipo correcto, la revisa y
ajusta el snapshot del paciente. La plantilla base solo cambia mediante la gestión de
plantillas, no al editar una rutina ya asignada.

## Responsabilidades

- **Administrador:** mantiene el catálogo de ejercicios y las plantillas base.
- **Entrenador:** asigna rutinas de entrenamiento a sus pacientes vinculados.
- **Fisioterapeuta:** asigna rutinas de fisioterapia a sus pacientes vinculados.
- **Plataforma:** copia la plantilla, valida permisos y condiciones, y persiste la rutina
  individual; no decide qué plantilla corresponde al paciente.

## Estado de implementación

La aplicación todavía contiene el motor `assignment_rules` de la decisión anterior
([ADR-0003](adr/0003-motor-de-reglas-sin-ia.md)). Este documento y
[ADR-0009](adr/0009-asignacion-manual-de-rutinas.md) establecen el comportamiento deseado:
asignación elegida por el profesional. Retirar el motor del flujo y actualizar sus pruebas
y pantallas requiere un cambio de implementación separado; la documentación no afirma que
ese cambio de código ya esté hecho.

## Qué debe demostrarse

1. Un profesional ve solo a los pacientes que tiene asignados.
2. Puede elegir una plantilla de su especialidad y revisar la copia antes de confirmarla.
3. La rutina asignada no contiene ejercicios contraindicados por las condiciones activas.
4. Editar la rutina de una persona no modifica la plantilla ni las rutinas de otras personas.
5. Un paciente recién registrado no recibe una rutina hasta que su profesional la asigne.
