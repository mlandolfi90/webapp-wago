# 0029 - Dominios menores: Comunidades, Etiquetas, Newsletters, Utilidades

- Estado: aceptado
- Fecha: 2026-05-17
- Corrida Crisol: webui-rest-001 (tier completo)

## Contexto y problema

Quedaban sin exponer en la webui los endpoints de Comunidades (3),
Etiquetas (6, incl. unlabel), Newsletters (6), Polls (1) y Llamadas (1).
Son dominios chicos; el helper `_shared/tabbedForms.js` (ADR 0028) ya
provee la orquestación. El riesgo era inflar la tarjeta de instancia con
demasiados botones (Polls y Llamadas son de 1 endpoint c/u).

## Decisión

Cuatro dominios, cada uno con su **catálogo declarativo cohesivo** +
modal fino sobre `openTabbedForms` (mismo molde que Mensajes):

- `community/` — crear, agregar grupos, quitar grupos.
- `labels/` — listar (result), etiquetar/quitar chat, etiquetar/quitar
  mensaje, crear/editar (incl. eliminar).
- `newsletters/` — crear, listar (result), info (result), invitación
  (result), suscribir, mensajes (result).
- `utils/` — **agrupa Polls + Llamadas** (1 endpoint c/u): resultados de
  encuesta (result) y rechazar llamada. Se unen bajo "Utilidades" para
  no crear dos botones de una sola acción (decisión de UX, no se mezcla
  lógica: cada uno es una entrada independiente del catálogo).

`core/api.js`: 16 funciones finas nuevas, instance-scoped. `pollResults`
usa **path param** (`/polls/{id}/results`), por eso su firma es
`(token, id)` y el catálogo la adapta:
`api: (token, body) => pollResults(token, body.pollMessageId)`.
Bodies conformes a swagger; `jid`/`callCreator` (tipo proto `JID`) se
envían como string (el backend los parsea).

Cuatro botones nuevos en `instanceCard.js`: Comunidades, Etiquetas,
Newsletters, Utilidades.

## Alternativas consideradas

- **Un botón por endpoint suelto (Polls, Llamadas)**: descartado; dos
  botones de una acción inflan la tarjeta. Se agrupan en "Utilidades".
- **Un único botón "Más" con todos los dominios mezclados**: descartado;
  ~18 pestañas en un solo `seg` es ruido y rompe la cohesión por
  dominio (ADR 0020).
- **Botón por dominio (5 botones)**: se redujo a 4 fusionando
  Polls+Llamadas; balance entre claridad y densidad de la tarjeta.

## Consecuencias

- Positivas: webui cubre **todos** los dominios útiles de la API
  (salvo los marcados *not working*: `/chat/*`, `/group/myall`); cada
  dominio es un módulo cohesivo; el helper de ADR 0028 se reusa 4 veces
  más (valida la consolidación); sin tocar backend.
- Negativas: la tarjeta de instancia ahora tiene muchos botones; a
  futuro convendría un menú/agrupador (anotado como mejora UX, no
  bloqueante).
- Neutras: "Utilidades" es un cajón consciente y acotado (2 acciones
  no-relacionadas que no justifican dominio propio); documentado para
  que no crezca como cajón de sastre.
