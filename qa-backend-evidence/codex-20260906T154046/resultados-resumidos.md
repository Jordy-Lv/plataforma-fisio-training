# Evidencia resumida — `qa-backend-20260906t154046`

- Base auditada: `3f2eeb591a8e3ded85bfdbb9c19fb21e31092126` (HEAD separado).
- API/DB/App aisladas: `55431` / `55432` / `3107`.
- Prefijo exclusivo: `qa-backend-20260906t154046`.
- PostgreSQL: 17.6; Node: 26.6.0; Supabase CLI: 2.116.0.
- Migraciones aplicadas: 7 de 7.
- Tipos: `lib/db/types.ts` idéntico a `supabase gen types typescript --local --schema public`.

## Puertas de calidad

| Puerta | Resultado |
|---|---|
| `npm run typecheck` | aprobado |
| `npm run lint` | aprobado; 1 advertencia preexistente por variable sin uso |
| `openspec validate --all --strict` | 4 cambios aprobados |
| `npm run build` | aprobado |
| `npm run test:rules` | 35/35 |
| `npm run test:auth:resilience` | 16/16 |
| `npm run test:design` | 4/4 |

## Baterías aisladas

| Archivo reproducible | Resultado |
|---|---|
| `verify-p0-access.mjs` | 26/26 por pasada; 2 pasadas; reprodujo BACK-001 a BACK-005 |
| `verify-http-auth-cron.mjs` | 21 observaciones por pasada; 2 pasadas; reprodujo BACK-010 |
| `verify-storage-catalog.mjs` | 14/14 por pasada; 2 pasadas; reprodujo BACK-001, BACK-006 a BACK-008 |
| `verify-sessions-alerts.mjs` | 30/30 por pasada; 2 pasadas; sin fallo nuevo |
| `verify-membership-mail.mjs` | 15/15 por pasada; 2 pasadas; reprodujo BACK-009 |
| `verify-auth-lifecycle.mjs` | 12/12; sin fallo nuevo |
| `verify-service-contract.mjs` | 1/1; reprodujo BACK-011 |

## Evidencia de limpieza

Consulta final en la base aislada:

```text
auth.users=0; profiles=0; person_registrations=0; care_assignments=0
custom exercises=0; routines=0; sessions=0; session_logs=0
screenings=0; attendance=0; alerts=0; plans=0; services=0
memberships=0; membership_notices=0; storage.objects(exercise-media)=0
QA triggers=0; Mailpit messages=0
alert_settings={pain_occurrences:3,pain_window_days:14,low_attendance_pct:50,
skipped_occurrences:3,pain_level_threshold:7,membership_expiring_days:4}
cron=review-membership-expiry | 0 13 * * * | active
```

## Incidente controlado de una suite heredada

`npm run test:routines` se intentó una vez. Su helper usa la API configurada en la copia, pero fija por código el contenedor SQL compartido. Falló en el primer `INSERT` por FK antes de crear filas compartidas. Se verificó `0` para el UUID implicado en `profiles` del contenedor compartido. Los cinco usuarios que GoTrue alcanzó a crear en el entorno aislado se registraron por UUID en `fixtures-manifest.json`, se eliminaron exactamente (`DELETE 5`) y se verificó conteo `0`. No se volvió a ejecutar ninguna suite heredada con ese patrón.
