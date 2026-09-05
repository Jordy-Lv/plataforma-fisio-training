## Purpose

Define cómo una persona demuestra su identidad en la plataforma y qué puede ver y hacer
según su rol, con la autorización aplicada en la base de datos y no en la interfaz.

## ADDED Requirements

### Requirement: Autenticación con correo y contraseña

El sistema SHALL autenticar a las personas mediante correo y contraseña, y SHALL mantener
la sesión activa entre visitas mientras no se cierre explícitamente.

#### Scenario: Credenciales correctas

- **WHEN** una persona activa introduce su correo y contraseña correctos
- **THEN** el sistema inicia sesión y la redirige al panel de su rol

#### Scenario: Credenciales incorrectas

- **WHEN** el correo o la contraseña no coinciden
- **THEN** el sistema muestra un mensaje genérico en español que no revela si el correo
  existe

#### Scenario: Persona dada de baja

- **WHEN** una persona con `is_active = false` intenta iniciar sesión
- **THEN** el sistema rechaza el acceso y no crea sesión

#### Scenario: Sesión persistente en la PWA

- **WHEN** una persona con sesión iniciada cierra la aplicación y la vuelve a abrir desde
  el ícono del teléfono
- **THEN** sigue autenticada, sin volver a introducir credenciales

### Requirement: Modelo de roles

Cada persona SHALL tener exactamente uno de los roles `admin`, `professional` o `patient`.
Una persona con rol `professional` SHALL tener una especialidad (`training` o `physio`);
los demás roles NO SHALL tener especialidad.

#### Scenario: Profesional sin especialidad

- **WHEN** se intenta crear un perfil con `role = 'professional'` sin especialidad
- **THEN** la base de datos rechaza la operación

#### Scenario: Paciente con especialidad

- **WHEN** se intenta crear un perfil con `role = 'patient'` y una especialidad
- **THEN** la base de datos rechaza la operación

### Requirement: Redirección por rol

Tras iniciar sesión, el sistema SHALL llevar a cada persona al panel correspondiente a su
rol, y SHALL impedir el acceso a los paneles de otros roles.

#### Scenario: Cada rol a su panel

- **WHEN** inicia sesión un `admin`, un `professional` o un `patient`
- **THEN** llega a `/admin`, `/pro` o `/patient` respectivamente

#### Scenario: Acceso a panel ajeno

- **WHEN** un `patient` navega directamente a una ruta de `/admin`
- **THEN** el sistema lo redirige a su propio panel sin exponer ningún dato

### Requirement: Aislamiento de datos entre pacientes

El sistema SHALL impedir, a nivel de base de datos, que una persona acceda a datos de otra
persona a la que no tiene derecho, con independencia de qué muestre u oculte la interfaz.

#### Scenario: Paciente consulta datos de otro paciente

- **WHEN** un paciente consulta por API los datos de otro paciente
- **THEN** la respuesta es vacía o un error, nunca datos de esa persona

#### Scenario: Profesional consulta paciente no asignado

- **WHEN** un profesional consulta un paciente con el que no tiene una asignación vigente
  en `care_assignments`
- **THEN** la respuesta es vacía o un error

#### Scenario: Paciente intenta suplantar a otro al escribir

- **WHEN** un paciente intenta insertar una fila indicando el identificador de otro
  paciente
- **THEN** la base de datos rechaza la escritura

### Requirement: Origen del rol

El sistema SHALL determinar el rol de una persona exclusivamente a partir de la tabla
`profiles`, y NO SHALL confiar en valores enviados por el cliente ni en metadata del token
modificable por la persona.

#### Scenario: Rol manipulado desde el cliente

- **WHEN** una petición incluye un rol distinto al almacenado en `profiles`
- **THEN** el sistema aplica el rol almacenado e ignora el valor recibido
