## Purpose

Que el administrador pueda dejar lista una plantilla asignable con menos pasos, creándola
con su primer día en el mismo formulario.

## ADDED Requirements

### Requirement: Una plantilla puede nacer con su primer día

Al crear una plantilla, el administrador SHALL poder indicar el título de su primer día. Si
lo indica, la plantilla SHALL crearse con ese día 1; si no, SHALL crearse sin días. En los
dos casos la plantilla SHALL nacer inactiva. Un fallo al crear el día NO SHALL deshacer la
plantilla ni ocultarse: la ficha SHALL decir que el día no se creó.

#### Scenario: Con título del primer día

- **WHEN** el administrador crea una plantilla con «Título del primer día» relleno
- **THEN** llega a la ficha de la plantilla, que ya tiene su día 1 con ese título y solo
  le faltan ejercicios

#### Scenario: Sin título del primer día

- **WHEN** el administrador crea una plantilla dejando ese campo vacío
- **THEN** la plantilla se crea sin días, como antes
