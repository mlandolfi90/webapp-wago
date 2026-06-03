# RUN-LEDGER — El Crisol

> Memoria del proceso + llave del enforcement. El hook `crisol-enforcer` lee
> este archivo: **sin una entrada `STATUS: ACTIVE` para el branch actual, todo
> cambio de código fuente queda bloqueado.**
> El líder abre la entrada al orquestar y la cierra al terminar. Append-only:
> las entradas no se borran, se cierran.

---

## Plantilla de entrada

```
### <id-corrida> — <branch>
- STATUS: ACTIVE | CLOSED | ESCALATED | BOOTSTRAP
- Fecha apertura: <ISO>
- Fecha cierre: <ISO o ->
- Tier: completo | fast-path
- Alcance: <qué se toca: contratos / archivos / arquitectura>
- Carriles: L1 <dominio>, L2 <dominio>, ...
- Veredictos:
    - Steward (Arquitecto): APPROVE | REJECT
    - Verificador por carril: L1 PASS|FAIL, L2 ...
    - Integración (si hubo paralelo): PASS | FAIL | n/a
- Iteraciones Plan↔REJECT/FAIL: <n> / 3
- Escalaciones: <ninguna | a Lucky-Admin: motivo>
- Commit: <hash o ->
```

---

## Entradas

### 0000-bootstrap — main
- STATUS: BOOTSTRAP
- Fecha apertura: <ISO>
- Fecha cierre: <ISO>
- Tier: n/a (meta-implementación del propio Crisol)
- Alcance: creación del loop; no podía dogfoodearse a sí mismo
- Carriles: revisión directa con Lucky-Admin + team-lead
- Veredictos: n/a
- Iteraciones: n/a
- Escalaciones: ninguna
- Commit: <hash>

<!-- nuevas corridas se appendan debajo, más recientes arriba -->
