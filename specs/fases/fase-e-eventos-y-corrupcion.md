# Fase E — Eventos, decisiones y corrupción

> **Objetivo:** el motor narrativo: los 7 tipos de evento con condiciones y
> flags, la grieta (corrupción 0–100) en el HUD con su dinámica completa, las
> emboscadas y las puertas por requisito.
> **Depende de:** Fases C y D. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- `EventEngine`: dispara eventos al entrar en el lugar y por gatillo,
  respetando `condicion`, `una_vez` y `grieta_desde`.
- `SelectorOpciones` táctil para `decision` (con efectos `item`/`flag`/
  `corrupcion`).
- Grieta: HUD, avisos, multiplicador por dificultad, caída a 100.
- Emboscadas (`emboscar`) conectadas a `BattleScene` como combate forzado.
- Puertas `requiere` operativas con inventario real.
- Mapas de `corazon_ceniza` restantes en **versión funcional greybox**
  (geometría y objetos correctos, decor mínima): minas, cienagas, refugio,
  valoria, yerma, aguja, umbak.

## Disparo de eventos (regla definitiva)

| Momento | Tipos | Condición |
|---------|-------|-----------|
| Al entrar en el lugar (tras fade-in, en el orden de `eventos[]`) | `narrar`, `emboscar`, `corrupcion`, `curar_grupo`, `otorgar` | `condicion` cierta (si existe) **y** `una_vez` no consumido |
| Al interactuar con el gatillo (objeto Tiled `eventos` o NPC indicado) | `decision`, `final` | `condicion` cierta; `final` requiere además lugar limpio (ver abajo) |

`final` (el tipo, no la fase) se dispara al tocar su gatillo cuando **todos
los enemigos del lugar han sido derrotados** en la visita actual (el jefe
custodia el objetivo: la Forja en umbak, el trono en aguja_cima, la ascua en
tejera/salina_vieja). La resolución de finales y epílogos es de la Fase F;
aquí el motor ya sabe lanzarlos.

## Tareas

- [x] `core/EventEngine.js`: dado `(aventura, lugar)`, procesa `eventos[]`:
      cola de «presentaciones» (diálogo/decisión/batalla) que se ejecuta
      secuencialmente con Promises; consume `una_vez` solo cuando se muestra.
- [x] Condiciones: `flag: X` (activa), `no_flag: X` (no activa). Las flags
      viven en `GameState.flags`; las activan las decisiones (campo `flag` o
      `clave` según el evento) y se persisten.
- [x] `narrar`: diálogo con `texto`; si `grieta_desde: N` y grieta ≥ N →
      `texto_grieta`. Casos piloto: `forja` (N=12) y `umbral` (N=40).
- [x] `decision`: `SelectorOpciones` (botones `titulo` + `detalle`, estilos
      1-bit); al elegir → diálogo con `texto` de la opción y aplicar efectos:
      `item` (añadir a inventario + toast), `flag`, `corrupcion` (± puntos ×
      Balance). El texto original `(Recibes: X.)` ya viene en `texto`: se
      muestra tal cual.
- [x] `emboscar`: diálogo con `texto` → `BattleScene` en modo forzado
      (sin huida si los enemigos la bloquean; sin retirar sprites del mundo:
      los enemigos del evento no existen en el mapa). Casos: `ceniza_sabe`
      (2 espectros, si `no_flag: alianza`), `coronado` (si `flag: coronado`).
- [x] `corrupcion`: diálogo breve con `aviso` + `puntos × Balance` a la
      grieta (cienagas 8). HUD de grieta: barra 0–100 junto a PV/monedas.
- [x] `curar_grupo`: cura total del grupo + `corrupcion` negativa × Balance
      (ritual −15). `una_vez`.
- [x] `otorgar`: entrega `item` + `texto` (campanilla en la saga; aquí se
      prueba con datos dev).
- [x] Grieta ≥ 100 (por cualquier vía, incluido el comando `corazon` en
      combate): transición inmediata a `EpilogoScene(caida)`.
- [x] Puertas `requiere` con inventario real: al cruzar hacia minas
      (`antorcha`), yerma (`estandarte`), etc. → si falta, `requiere_texto`.
- [x] Greybox de los 7 mapas restantes de `corazon_ceniza` con sus objetos
      (enemigos, NPCs, gatillos, salidas) según los JSON.
- [x] Validador de coherencia mapa↔JSON en carga (consola dev): avisa de
      NPC/enemigo/evento definido en JSON sin objeto en el mapa y viceversa.

## Detalle técnico

- Orden de la cola de entrada: los `eventos[]` del lugar se procesan en el
  orden del JSON; si un `emboscar` pierde... no aplica: derrota = muerte,
  caída = caída (los combates de emboscada no son evitables salvo victoria).
- `casa_llena` (Brasa), `cadena_en_el_vado` (Sal)… son `narrar` con
  `condicion {flag}` que solo puede activarse por **legado** (Fase F): el
  motor ya los soporta; quedan latentes hasta F.
- La decisión del `consejo` entrega `estandarte` con flag `alianza` o
  `deposito`: ambos entregan el ítem (dos textos distintos, un mismo ítem) —
  el motor no debe duplicar ítems si se re-dispara (no ocurre: `decision` en
  gatillo se consume con `una_vez` implícito por gatillo → marcarlo).
- Los gatillos de `decision` se consumen al usarse (una sola vez por partida):
  añadir su clave a `GameState.vistos` con prefijo `evt:`.

## Mapeo de datos (piloto: corazon_ceniza completo)

| Evento | Tipo | Prueba |
|--------|------|--------|
| `encargo` (rioclaro) | decision | Prometer → `tercio` + flag `promesa`; Esquivar → nada. |
| `consejo` (valoria) | decision | Jurar (`estandarte`+`alianza`) o depósito (`estandarte`+`deposito`). |
| `forja` (minas) | narrar | Texto alternativo con grieta ≥ 12. |
| `corrupcion` (cienagas) | corrupcion | +8 grieta (× dificultad), aviso. |
| `entrega` (refugio) | narrar | Solo con flag `promesa`. |
| `ritual` (refugio) | curar_grupo | Cura total, −15 grieta, una vez. |
| `umbral` (yerma) | narrar | Variante grieta ≥ 40. |
| `corona` (aguja) | decision | Tomarla → `corona_plata` + flag `coronado` + 6 grieta. |
| `ceniza_sabe` (aguja) | emboscar | 2 espectros si `no_flag: alianza`. |
| `coronado` (yerma) | emboscar | 2 espectros si `flag: coronado`. |
| `final` (umbak) | final | Gatillo listo; resolución en Fase F. |

## Entregable jugable

La campaña 1 entera jugable en greybox: de Vegaverde al Umbak con el encargo
de Dorotea, el juramento (o depósito) en Valoria, la antorcha abriendo minas,
la ciénaga sumando grieta, la Torre curándola, la corona tentando, los Yermos
exigiendo estandarte, y la puerta al final lista para la Fase F.

## Criterios de aceptación

- [x] Cada evento de la tabla se comporta según su tipo y condición (probar
      ambas ramas de cada decisión y los textos con/sin grieta).
- [x] Ninguna decisión re-entrega ítems ni se repite al re-entrar.
- [x] La grieta sube/baja multiplicada por dificultad y a 100 dispara la caída.
- [x] Las puertas `requiere` funcionan en los dos sentidos (con y sin ítem).
- [x] El validador no reporta descoordinación JSON↔mapa en los 12 lugares.

## Fuera de alcance (van en...)

Finales/epílogos y pantallas meta (Fase F) · decorado final de mapas y las
otras 3 aventuras (Fase G) · calibración de la fórmula del comando especial (Fase H).
