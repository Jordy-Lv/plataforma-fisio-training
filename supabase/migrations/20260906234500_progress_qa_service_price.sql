-- =============================================================================
-- QA backend · BACK-011 — los servicios no tenían el precio que exige OpenSpec.
--
-- `plans-and-memberships/spec.md` pide que cada servicio adicional declare
-- descripción y precio, pero `public.services` no tenía la columna: la vitrina
-- no podía mostrarlo ni el administrador definirlo. Decisión D2: el precio
-- entra en el alcance de la demo.
--
--   * `services.price numeric(12,2) not null` con `check (price >= 0)`, mismo
--     tipo y semántica que `plans.price`.
--   * `default 0`: las filas anteriores a esta migración quedan en 0 y el
--     administrador debe fijar su precio real desde el panel. El seed de demo
--     ya aporta precios.
--
-- Estado de partida: el esquema tras aplicar las 11 migraciones anteriores.
-- =============================================================================

alter table public.services
  add column price numeric(12, 2) not null default 0
  constraint services_price_non_negative check (price >= 0);

comment on column public.services.price is
  'Precio del servicio adicional en COP (OpenSpec plans-and-memberships). Las filas anteriores a BACK-011 quedan en 0 hasta que el administrador las revise.';
