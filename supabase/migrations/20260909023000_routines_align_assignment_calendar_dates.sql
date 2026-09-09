-- La vigencia de la rutina debe usar el mismo día civil que su calendario.
-- La zona se limita a esta función y se restaura al volver al llamador.
-- Conserva la implementación, los permisos y las políticas existentes.
alter function public.copy_routine_template(uuid, uuid)
  set timezone to 'America/Bogota';
