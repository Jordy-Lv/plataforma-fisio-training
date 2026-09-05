# ADR-0005 — free-exercise-db auto-hospedada

**Estado:** Aceptada · **Fecha:** 2026-09-05

## Contexto

La biblioteca necesita cientos de ejercicios con imagen y descripción para que la demo sea
creíble. El material propio del negocio —videos grabados por el equipo— no estará listo a
tiempo, y en la reunión quedó acordado que para la demostración se usaría material
genérico.

## Decisión

Sembrar la tabla `exercises` desde
[free-exercise-db](https://github.com/yuhonas/free-exercise-db): ~800 ejercicios con
imágenes, licencia MIT, distribuidos como JSON estático. El script
`scripts/seed-exercises.ts` importa los datos a Postgres y sube las imágenes a Supabase
Storage.

## Alternativas consideradas

**ExerciseDB u otra API de terceros.** Requiere clave, tiene límites de uso y precio, y
—lo decisivo— introduce una **dependencia externa en tiempo de ejecución durante la
demostración**. Si esa API falla o agota su cuota mientras el cliente prueba la
aplicación, la biblioteca aparece vacía.

**Cargar 30 ejercicios a mano.** Suficiente para las pantallas, insuficiente para que el
motor de reglas sea demostrable: con pocos ejercicios no se puede mostrar filtrado por
equipamiento, entorno y contraindicaciones.

**Esperar el material del cliente.** No llega a tiempo, y ya está acordado que no bloquea.

## Consecuencias

**A favor:**
- Sin costo, sin clave, sin límites de uso, sin dependencia externa en ejecución.
- Licencia MIT, compatible con uso comercial.
- Los datos son nuestros: se pueden editar, traducir y etiquetar con
  `contraindications` propias, que es justo lo que el motor de reglas necesita.

**En contra:**
- Los ejercicios vienen en inglés y sin las contraindicaciones que necesitamos. El equipo
  profesional debe traducir y etiquetar los que realmente use — **no los 800**, solo los
  que entren en las plantillas.
- Las imágenes son genéricas, sin el sello del negocio.

## Camino al material propio

`exercises.media_url` es una URL y `exercises.is_custom` distingue el origen. Cuando llegue
el material del negocio, se crean ejercicios propios o se actualiza la URL de los
existentes: **sin migración de esquema y sin tocar las rutinas ya asignadas**.
