# COLLISION-MAP — <branch> — <fecha>

> Emitido por el **Architecture Steward** tras ver TODOS los planes de TODOS los
> carriles, ANTES de que cualquier Ingeniero toque código.
> **Poka-yoke: prevenir colisiones, no detectarlas después.**

## Carriles en esta corrida

| Carril | Dominio | Alcance (archivos/contratos) | Plan aprobado |
|---|---|---|---|
| L1 | `<dominio>` | `<rutas>` | sí/no |
| L2 | `<dominio>` | `<rutas>` | sí/no |

## Archivos / contratos CALIENTES (tocados por >1 carril)

| Recurso | Carriles en conflicto | Tipo | Resolución |
|---|---|---|---|
| `docker-compose.yml` | L1, L2 | archivo compartido | lo administra el líder |
| `<contrato AMQP/REST>` | L1, L3 | contrato | secuenciar: L1 → L3 |
| `.env.example` | L2 | archivo compartido | lo administra el líder |

## Secuenciación impuesta

```
L1  ───────▶ (libera contrato X)
              L3 ──────▶
L2 (paralelo, sin colisión) ──────▶
```

- **Paralelo OK:** <carriles sin recursos compartidos>
- **Serializado:** <carril A> antes de <carril B> porque <recurso/contrato>
- **Administra el líder (no engineers):** <lista de archivos compartidos>

## Veredicto del Steward

- [ ] `APPROVE` — los planes no colisionan o quedan secuenciados
- [ ] `REJECT` (🚨 VETO) — motivo: `<razón>` → vuelve al Planificador

> Regla: ningún Ingeniero arranca hasta que este mapa exista y el veredicto sea
> `APPROVE`.
