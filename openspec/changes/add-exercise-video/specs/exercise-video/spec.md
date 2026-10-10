# Spec Delta

## Purpose

Cada ejercicio puede llevar un vídeo de YouTube que se reproduce dentro de la aplicación.

## ADDED Requirements

### Requirement: El equipo pone un vídeo de YouTube a un ejercicio

Quien puede editar un ejercicio SHALL poder guardarle un enlace de YouTube desde su ficha. El
enlace MUST normalizarse a `https://www.youtube.com/watch?v=<id>[&t=<n>s]` y la base MUST
rechazar cualquier otra URL aunque llegue sin pasar por la interfaz.

#### Scenario: Admin pega un enlace corto con minuto de inicio

- **WHEN** el admin guarda `https://youtu.be/<id>?t=45` en un ejercicio importado
- **THEN** queda guardado `https://www.youtube.com/watch?v=<id>&t=45s`

#### Scenario: Enlace que no es de YouTube

- **WHEN** alguien guarda `https://vimeo.com/123`
- **THEN** ve «Pega un enlace de YouTube…» y el ejercicio no cambia

#### Scenario: Profesional sobre un ejercicio importado

- **WHEN** un profesional abre la ficha de un ejercicio importado
- **THEN** ve el vídeo pero no el formulario, y una escritura directa no afecta a ninguna fila

#### Scenario: Quitar el vídeo

- **WHEN** se guarda el campo vacío
- **THEN** el ejercicio queda sin vídeo y vuelve a mostrar su imagen

### Requirement: El vídeo se ve dentro de la aplicación y sustituye a la imagen

Cuando un ejercicio tiene vídeo, su vista previa SHALL ser la miniatura del vídeo y el
reproductor SHALL ocupar el lugar de la imagen. El vídeo MUST reproducirse embebido desde
`youtube-nocookie.com`, sin enlaces que saquen a YouTube, y el reproductor MUST cargarse solo
cuando la persona pulsa.

#### Scenario: Paciente en la sesión

- **WHEN** el paciente abre «Ver cómo se hace» de un ejercicio con vídeo y pulsa reproducir
- **THEN** el vídeo se reproduce en la misma pantalla y no se pinta la imagen del catálogo

#### Scenario: Catálogo

- **WHEN** el equipo recorre `/exercises`
- **THEN** los ejercicios con vídeo muestran la miniatura del vídeo con el distintivo «Vídeo»
