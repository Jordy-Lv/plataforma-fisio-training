# 00 — Contexto y alcance

## El problema

Un negocio que combina entrenamiento físico y fisioterapia opera hoy con herramientas
sueltas: rutinas en Excel y Drive, seguimiento por WhatsApp, asistencia en papel y pagos
en efectivo sin registro centralizado.

De eso se derivan cuatro puntos ciegos que el negocio no puede responder de un vistazo:

1. **¿Quién está cumpliendo la rutina?** El seguimiento depende de que el cliente responda
   por WhatsApp.
2. **¿Quién reportó dolor?** Si alguien deja de hacer un ejercicio porque le duele la
   rodilla, esa información se pierde en un chat. Cuando el dolor persiste tres o cuatro
   sesiones, ya debería haber una evaluación en curso.
3. **¿Quién dejó de asistir?** Al final del mes hay reclamos por falta de resultados de
   personas que asistieron la mitad de las sesiones, y no hay registro para sustentarlo.
4. **¿A quién se le vence la mensualidad?** No hay control de fechas de ingreso ni de
   vencimiento, y nadie avisa al cliente antes de que caiga en mora.

El mismo cliente puede necesitar las dos áreas a la vez —alguien que entrena mientras se
recupera de una lesión—, y hoy eso implica dos registros paralelos que nadie cruza.

## Qué se construye

Una aplicación web instalable en el celular (PWA, sin pasar por tiendas de aplicaciones)
donde:

1. El cliente registra sus datos, su objetivo, su entorno de entrenamiento y sus
   condiciones o limitaciones.
2. El entrenador o fisioterapeuta a cargo **elige una plantilla** para el paciente.
3. La plataforma copia la plantilla a una rutina propia del paciente (**snapshot**). El
   profesional revisa y ajusta esa copia, y luego confirma la asignación; **la plantilla
   base no cambia**.
4. El cliente la ejecuta desde el celular: marca lo que completó, registra series,
   repeticiones y peso reales, y reporta esfuerzo, dolor y observaciones.
5. Todo queda registrado: cumplimiento, asistencia, dolor, tamizaje y vencimientos.

No son dos productos. Es una sola base de datos y una sola aplicación, con dos tipos de
rutina y dos tipos de profesional que pueden compartir un mismo cliente.

---

## Alcance de la Etapa 1 (la demo)

Esta es la lista completa. **Lo que no está aquí, no entra.**

### Identidad y personas
- Tres roles: `admin`, `professional` (especialidad `training` o `physio`) y `patient`.
- El admin da de alta y de baja al personal y a los clientes.
- Un mismo paciente puede tener entrenador y fisioterapeuta a la vez; cada uno ve las
  alertas que le corresponden.

### Registro del paciente
- Datos básicos, objetivo, nivel, entorno (casa o gimnasio) y equipamiento disponible.
- Condiciones y limitaciones (parte del cuerpo, severidad, notas).

### Asignación de rutinas
- El profesional responsable selecciona una plantilla del tipo que corresponde a su
  especialidad y la asigna al paciente.
- La plantilla se copia como snapshot; los cambios posteriores afectan solo a ese paciente.
- Los ejercicios contraindicados por una condición registrada quedan excluidos.
- Al terminar el registro, el paciente no recibe una rutina automáticamente: queda a la
  espera de que su profesional la asigne.

### Rutinas
- Plantillas base definidas por el equipo (`routine_templates`).
- Al asignarse, se copian a la rutina del paciente (**snapshot**). El profesional ajusta
  la copia; la plantilla queda intacta.

### Biblioteca de ejercicios
- Catálogo con imagen o GIF y descripción de ejecución.
- Se siembra con [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
  (~800 ejercicios, licencia MIT). El material propio del negocio lo reemplaza después
  sin cambios de esquema.

### Ejecución desde el celular
- Rutina en modo **checklist**: marcar hecho, saltado o modificado.
- Por ejercicio: series, repeticiones y peso reales, esfuerzo percibido,
  **nivel de dolor (0–10)**, ubicación del dolor y observaciones libres.

### Seguimiento
- Tamizaje periódico (peso, talla, IMC, medidas) con **gráfica de evolución** a partir del
  segundo registro.
- Control de asistencia por paciente, con historial.

### Negocio
- Vitrina de planes y servicios (estándar, nutrición, fisioterapia, artes marciales,
  talleres).
- Control de mensualidades: fecha de ingreso, fecha de vencimiento, estado y monto.
  **Registro de control, sin procesar el pago.**
- Aviso de vencimiento próximo, dentro de la aplicación y por correo.

### Panel de administración
- Alertas automáticas: dolor persistente, ejercicios saltados repetidamente y
  mensualidades por vencer.
- Panorama del negocio: clientes activos, cumplimiento y asistencia.

### Técnico
- PWA instalable en Android y iOS.
- RLS activo sobre todos los datos de personas.

---

## Fuera de alcance en la Etapa 1

Cada exclusión tiene una razón; ninguna es un olvido.

| Fuera | Por qué | Cuándo |
|---|---|---|
| **Pasarela de pagos (Wompi)** | Lo dijo el cliente en la reunión: por ahora los pagos no se ejecutan en la plataforma, solo se lleva el registro | Etapa 3 |
| **Notificaciones push nativas (FCM)** | Requiere service worker con push, permisos y backend de envío. El aviso de vencimiento se cubre en la demo con aviso in-app y correo | Etapa 2+ |
| **Actualización en tiempo real (Supabase Realtime)** | Nadie mira la pantalla mientras el paciente entrena. Añade complejidad de suscripciones sin beneficio observable en la demo | Cuando exista un caso de uso real |
| **Cloudflare R2 para videos** | En la demo se usa material genérico ya acordado con el cliente; no hay videos propios que alojar | Cuando llegue el material del negocio |
| **App nativa (Capacitor)** | La PWA se instala en el celular y se actualiza al instante, sin revisión de tiendas ni cuentas de desarrollador | Etapa 3, si el negocio lo decide |
| **Multi-tenant** | El producto es exclusivo para un negocio. Multi-tenant multiplicaría la complejidad de RLS sin cliente que lo pague | No previsto |
| **Nutrición y artes marciales como módulos** | En la demo aparecen como *servicios en la vitrina*, no como funcionalidad | Sin fecha |

> El documento de resumen entregado al cliente menciona tiempo real, Wompi, FCM y app
> nativa como parte del producto. Eso describe el **producto completo a lo largo de las
> tres etapas**, no la demo. Esta diferencia debe quedar confirmada por escrito con el
> cliente antes del día 3.

## Etapas

| Etapa | Qué es | Qué incluye |
|---|---|---|
| **1 — Demostración** | Versión funcional para probar y opinar | Todo lo listado arriba, con datos de ejemplo |
| **2 — Piloto** | La misma aplicación con clientes reales | Ajustes según uso real, push, respaldos |
| **3 — Operación** | La herramienta definitiva del negocio | Pagos con Wompi, respaldos permanentes, infraestructura de producción, evaluación del paso a tiendas |
