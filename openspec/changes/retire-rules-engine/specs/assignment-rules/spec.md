## REMOVED Requirements

### Requirement: Evaluación por prioridad

**Reason**: ADR-0009 decide que la rutina la elige el profesional; el sistema no elige ni
propone una plantilla por perfil. Desde `manual-routine-assignment` ninguna pantalla ni el
registro del paciente evalúan reglas, y este change retira la tabla y las funciones del
motor.

**Migration**: La elección la hace el profesional en `/pro/routines/[patientId]` (capacidad
`routine-assignment`, requisito «El profesional elige la plantilla»). El caso «Ninguna regla
coincide» desaparece con el motor: el listado de `/pro/routines` ya distingue a quien no
tiene rutina activa.

### Requirement: Criterios de coincidencia

**Reason**: Sin motor no hay criterios que evaluar contra el perfil del paciente (ADR-0009).

**Migration**: Los datos del perfil —objetivo, nivel, entorno, equipamiento y condiciones—
los consulta el profesional en la ficha breve del paciente y en los filtros de plantillas
(`routine-assignment`, «El profesional elige la plantilla»).

### Requirement: Filtro de contraindicaciones

**Reason**: Aplicaba a la regla ganadora, que deja de existir.

**Migration**: La exclusión la hace la base al crear el borrador (`routine-assignment`, «Los
ejercicios contraindicados se excluyen al crear el borrador»). El día vacío lo bloquea la
confirmación y los días cortos solo avisan («Confirmar publica la rutina»).

### Requirement: Parametrización sin desplegar código

**Reason**: Se retira el panel `/rules` y la tabla que editaba; no queda nada que
parametrizar (ADR-0009).

**Migration**: El equipo sigue sin desplegar código para cambiar qué se asigna: mantiene
plantillas (`routine-templates`) y el profesional elige entre las activas de su
especialidad.

### Requirement: Simulador de asignación

**Reason**: Simulaba el motor que se retira; ADR-0009 lo saca del flujo requerido.

**Migration**: Ninguna. La vista previa de lo que recibirá el paciente es el borrador, que
el paciente no ve hasta que se confirma (`routine-assignment`, «Elegir una plantilla crea un
borrador invisible para el paciente»).

### Requirement: Las reglas se buscan y se filtran sin alterar su orden

**Reason**: Se retira el listado de reglas.

**Migration**: Ninguna.

### Requirement: Reordenar solo se ofrece cuando el orden mostrado es el real

**Reason**: Sin reglas no hay orden de evaluación que proteger.

**Migration**: Ninguna.

### Requirement: Un fallo al reordenar se ve

**Reason**: Se retiran los controles de mover reglas.

**Migration**: Ninguna.
