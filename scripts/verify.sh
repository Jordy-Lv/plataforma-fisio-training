#!/usr/bin/env bash
# Verificación local: lo mismo que corre CI.
# Modo rápido (por defecto): openspec, typecheck, lint y build. Antes de cada commit.
# Modo completo (--full): lo anterior más las suites funcionales contra Supabase local. Antes de cada PR.
set -euo pipefail

modo="rapido"
for arg in "$@"; do
  case "$arg" in
    --full|-f|--completo)
      modo="completo"
      ;;
    --help|-h)
      echo "Uso: bash scripts/verify.sh [opciones]"
      echo ""
      echo "Opciones:"
      echo "  (sin opciones)    Modo rápido: valida specs, typecheck, lint y build."
      echo "  --full, -f        Modo completo: modo rápido + verificación de base de datos + suites funcionales."
      echo "  --help, -h        Muestra esta ayuda."
      exit 0
      ;;
    *)
      printf '\033[31mOpción desconocida: %s\033[0m\n' "$arg"
      echo "Usa --help para ver las opciones disponibles."
      exit 1
      ;;
  esac
done

fallos=0
paso() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
fallo() { printf '\033[31m✗ %s\033[0m\n' "$1"; fallos=$((fallos + 1)); }
ok()    { printf '\033[32m✓ %s\033[0m\n' "$1"; }

paso "Specs de OpenSpec"
if openspec validate --all --strict; then ok "specs válidas"; else fallo "specs inválidas"; fi

if [ ! -f package.json ]; then
  printf '\n\033[33mpackage.json aún no existe: se omiten typecheck, lint, build y pruebas funcionales.\033[0m\n'
else
  paso "Typecheck";  if npm run --silent typecheck; then ok "typecheck"; else fallo "typecheck"; fi
  paso "Lint";       if npm run --silent lint;      then ok "lint";      else fallo "lint"; fi
  paso "Build";      if npm run --silent build;     then ok "build";     else fallo "build"; fi

  if [ "$modo" = "completo" ]; then
    printf '\n\033[1;34m=== MODO COMPLETO: Requisitos y pruebas funcionales ===\033[0m\n'

    # 1. Comprobación de Docker y Supabase local
    paso "Requisito: Supabase local"
    if curl -sf -o /dev/null --connect-timeout 2 http://127.0.0.1:54321/rest/v1/; then
      ok "Supabase local encendido"
    else
      fallo "Docker no está corriendo o Supabase local no está encendido en http://127.0.0.1:54321. Ejecuta 'npm run db:start' antes de correr el modo completo."
    fi

    # 2. Comprobación de servidor de desarrollo en puerto 3000
    paso "Requisito: Servidor de desarrollo (puerto 3000)"
    if curl -sf -o /dev/null --connect-timeout 2 --max-time 5 http://127.0.0.1:3000; then
      ok "Servidor de desarrollo respondiendo en puerto 3000"
    else
      fallo "El servidor de desarrollo no responde en http://localhost:3000. Muchas suites ejercitan las pantallas reales por HTTP y fallarán sin él. Arranca 'npm run dev' en otra terminal antes de continuar."
    fi

    # 3. Comprobación de base limpia previa
    paso "Comprobación de base de datos limpia (pre-pruebas)"
    if node scripts/check-db-clean.mjs; then
      ok "Base de datos limpia antes de iniciar pruebas"
    else
      fallo "La base de datos contiene residuos o fixtures huérfanos. Ejecuta 'node scripts/check-db-clean.mjs --fix' antes de correr las pruebas para evitar falsos positivos."
    fi

    # Si los requisitos previos fallaron, advertir antes de lanzar las suites
    if [ "$fallos" -gt 0 ]; then
      printf '\n\033[33mHay requisitos previos que fallaron (%s fallo(s)). Las pruebas funcionales podrían dar falsos positivos.\033[0m\n' "$fallos"
    fi

    # 4. Derivar y ejecutar dinámicamente las suites test:* de package.json
    # Se obtienen en tiempo de ejecución desde package.json para no quedarse desactualizado
    # cuando se agreguen nuevas suites funcionales.
    suites=$(node -e '
      const fs = require("node:fs");
      const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const tests = Object.keys(pkg.scripts || {}).filter(k => k.startsWith("test:"));
      console.log(tests.join("\n"));
    ')

    if [ -z "$suites" ]; then
      printf '\n\033[33mNo se encontraron scripts test:* en package.json.\033[0m\n'
    else
      while IFS= read -r suite; do
        [ -z "$suite" ] && continue
        paso "Prueba funcional: $suite"
        if npm run --silent "$suite"; then
          ok "$suite"
        else
          fallo "$suite"
        fi
      done <<< "$suites"
    fi

    # 5. Comprobación de base limpia posterior
    paso "Comprobación de base de datos limpia (post-pruebas)"
    if node scripts/check-db-clean.mjs; then
      ok "Base de datos quedó limpia tras las pruebas"
    else
      fallo "Las pruebas funcionales dejaron basura en la base de datos (revisa qué prueba no limpió sus fixtures). Ejecuta 'node scripts/check-db-clean.mjs --fix' para sanearla."
    fi
  fi
fi

printf '\n'
if [ "$fallos" -gt 0 ]; then
  printf '\033[31m%s verificación(es) fallida(s). No abras el PR todavía.\033[0m\n' "$fallos"
  exit 1
fi
printf '\033[32mTodo en verde.\033[0m\n'
