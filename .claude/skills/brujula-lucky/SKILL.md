---
name: brujula-lucky
description: >-
  Brújula-Lucky — ancla la sesión al estado REAL del repo y el deploy para
  evitar alucinar contexto ya superado. Usar AL EMPEZAR a trabajar en un repo,
  al retomar una sesión, o cuando dudes en qué branch/estado estás
  ("¿dónde estoy?", "ubicame", "/brujula-lucky"). Lee 3 fuentes reales (git,
  docker, ADR/RUN-LEDGER) y devuelve un snapshot objetivo. REGLA DE ORO: si una
  fuente no se puede leer, dice "N/D" — JAMÁS infiere. Solo lectura, no modifica.
allowed-tools: Bash, Read, Glob, Grep
---

# Brújula-Lucky — ¿dónde estoy parado?

Antes de tocar nada, anclá la sesión a la **verdad del terreno**. El enemigo es
arrancar con suposiciones; esta skill las reemplaza por hechos.

**Ejes:** óptima (ataca la causa, no el síntoma) · compacta · dura (branch
inesperado = bandera roja) · sencilla (invocás y leés) · confiable (fail-closed).

## Uso

Ejecutá el script y mostrale al usuario su salida tal cual:

```bash
bash scripts/brujula.sh
```

## Las 3 fuentes (todas read-only)

1. **Repo** — branch actual, archivos sin commitear, adelanto/atraso vs remote, y
   el **branch de trabajo más reciente** (excluye `main`/`master`). Si hay una
   entrada `STATUS: ACTIVE` en el RUN-LEDGER, ese branch **manda** sobre la heurística.
2. **Deploy** — `docker ps` y, si hay compose en el repo, `docker compose ps`.
3. **Decisiones** — último ADR en `docs/decisions/` + si el Crisol está activo.

## Reglas duras

- **Branch inesperado / `main` / detached HEAD → bandera roja ARRIBA DE TODO.**
- **Fail-closed:** fuente ilegible (sin git, sin docker, sin ADRs) → `N/D`.
  Nunca rellena, nunca infiere. Esa es la diferencia entre ubicarse y alucinar.
- **Veredicto de branch binario:** coincide con el esperado, o no. Sin "casi".
- **No modifica nada:** es una brújula, no un timón.

Tras leer el snapshot, NO sigas con suposiciones sobre lo que muestre `N/D`:
pedí el dato o decláralo desconocido.
