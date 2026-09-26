## ADDED Requirements

### Requirement: Ninguna vía asigna rutinas por reglas

El sistema NO SHALL ofrecer ninguna vía, ni en la interfaz ni en la API, que elija, proponga
o asigne una rutina evaluando reglas contra el perfil del paciente. La única forma de que un
paciente reciba una rutina SHALL ser que un profesional autorizado o el administrador la
prepare y la confirme.

#### Scenario: La API del motor ya no existe

- **WHEN** un administrador o un profesional a cargo llama directamente a la antigua
  asignación por reglas o a la consulta de su contexto
- **THEN** la operación no existe y no se crea ninguna rutina, borrador, evento ni alerta

#### Scenario: Sin panel de reglas ni simulador

- **WHEN** el administrador abre la dirección del antiguo panel de reglas o del simulador
- **THEN** no encuentra ningún panel de reglas ni ningún simulador

#### Scenario: La asignación manual sigue igual

- **WHEN** el profesional elige una plantilla, ajusta el borrador y lo confirma, después de
  retirado el motor
- **THEN** el paciente recibe la rutina exactamente como antes, sin los ejercicios
  contraindicados y con su asignación registrada
