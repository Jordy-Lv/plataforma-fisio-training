#!/usr/bin/env bash
# Verificación local: lo mismo que corre CI.
# Úsalo antes de cada PR — y como red de seguridad mientras GitHub Actions
# no esté habilitado en la cuenta (ver docs/08-onboarding-equipo.md).
set -euo pipefail

fallos=0
paso() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
fallo() { printf '\033[31m✗ %s\033[0m\n' "$1"; fallos=$((fallos + 1)); }
ok()    { printf '\033[32m✓ %s\033[0m\n' "$1"; }

paso "Specs de OpenSpec"
if openspec validate --all --strict; then ok "specs válidas"; else fallo "specs inválidas"; fi

if [ ! -f package.json ]; then
  printf '\n\033[33mpackage.json aún no existe: se omiten typecheck, lint y build.\033[0m\n'
else
  paso "Typecheck";  if npm run --silent typecheck; then ok "typecheck"; else fallo "typecheck"; fi
  paso "Lint";       if npm run --silent lint;      then ok "lint";      else fallo "lint"; fi
  paso "Build";      if npm run --silent build;     then ok "build";     else fallo "build"; fi
fi

printf '\n'
if [ "$fallos" -gt 0 ]; then
  printf '\033[31m%s verificación(es) fallida(s). No abras el PR todavía.\033[0m\n' "$fallos"
  exit 1
fi
printf '\033[32mTodo en verde.\033[0m\n'
