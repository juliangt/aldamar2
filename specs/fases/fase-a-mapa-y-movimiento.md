# Fase A — Mapa y movimiento top-down

> **Objetivo:** el mundo caminable: mapas Tiled por lugar, colisiones, jugador
> con cámara siguiéndole, controles táctiles y transiciones entre lugares con
> puertas por requisito. Es la **Fase A de `specs/fases.md`** expandida.
> **Depende de:** Fase 0. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- Tileset Kenney Tiny Dungeon integrado + **convención de mapas Tiled**
  definitiva (todas las fases siguientes la usan).
- `WorldScene` genérica: carga el mapa del lugar activo, colisiones, jugador,
  cámara, HUD básico y `MenuTactil` (d-pad + botón acción + botón menú).
- Transiciones entre lugares con `salidas` y validación de `requiere`.
- Mapas piloto: **vegaverde** y **molino** de `corazon_ceniza` (ida y vuelta).

## Convención de mapas Tiled (definitiva)

Archivo: `public/maps/<aventuraId>/<lugarId>.json` · Tiled orthogonal ·
tile **16×16** · tamaño recomendado **40×28** (máx. 48×32) · tileset único
`tiny_dungeon` (PNG en `public/tilesets/`, embebido en el JSON exportado).

| Capa / objetos | Tipo | Contenido | Propiedades |
|----------------|------|-----------|-------------|
| `suelo` | tiles | suelo transitable | — |
| `obstaculos` | tiles | paredes, árboles, agua, rocas | `colision: true` en cada tile usado |
| `decoracion` | tiles | detalle sin colisión (flores, alfombras) | — |
| `frente` | tiles | tiles que tapan al jugador (ramas, techos) | — |
| `spawns` | objetos punto | un punto por lado: `N`, `S`, `E`, `O` (y `centro` para inicio de aventura) | — |
| `npcs` | objetos rect | NPCs del `lugar.npcs` | `npc: <id>` |
| `enemigos` | objetos rect | uno por elemento de `lugar.enemigos` | `enemigo: <id>`, `idx` |
| `objetos` | objetos rect | recogibles de `lugar.objetos` | `item: <id>` |
| `monedas` | objetos rect | pickup de `lugar.monedas` | `cantidad` (por defecto, todo el montón en un punto) |
| `salidas` | objetos rect | zonas de borde/puerta | `hacia: <lugarId>`, `dir: N/S/E/O` |
| `eventos` | objetos rect | gatillos de `decision`/`final` | `evento: <id>` |

Reglas: los `id` de objetos deben existir en los datos del lugar (validar en
carga y avisar por consola si falta/sobra). Las capas `npcs`…`eventos` pueden
estar vacías en esta fase en los mapas piloto (salvo `salidas`).

## Tareas

- [ ] Descargar Kenney Tiny Dungeon; generar el PNG de tileset único y el
      `.tsx` con `colision` marcada en los tiles sólidos.
- [ ] Crear y exportar `vegaverde.json` y `molino.json` (bioma huerto/camino,
      paleta verde/ocre) con sus `salidas` según el JSON
      (vegaverde: `este → molino` · molino: `oeste → vegaverde`).
- [ ] `WorldScene.init(data)`: recibe `{aventura, lugar, entrada}` y hace
      `preload` del mapa (`this.load.tilemapTiledJSON(lugarId, ruta)`) y del
      tileset si no está cacheado.
- [ ] `create()`: crear capas (`createTilemap` + `createLayer`),
      `obstaculos.setCollisionByProperty({colision: true})` y límites del
      mundo al tamaño del mapa.
- [ ] Jugador: `this.physics.add.sprite` con `body` reducido a los pies
      (~12×10 px), velocidad ~110 px/s, animaciones 4 direcciones (paleta del
      héroe elegido — en esta fase, paleta fija), `depth = y` (orden por fila).
- [ ] Cámara: `this.cameras.main.startFollow(player, true, 0.5, 0.5)`,
      `setZoom(2)`, `setBounds` al mapa, fade de entrada.
- [ ] `MenuTactil` v1: d-pad 8-dir abajo-izquierda (mantener = andar),
      botón de acción contextual abajo-derecha (deshabilitado aquí),
      botón menú (solo pausa + «semitransparencia» en esta fase).
      Multitouch simultáneo d-pad + botones.
- [ ] Transición: overlap con zona `salidas` →
      1. resolver destino `hacia`; 2. si `Datos.lugar(destino).requiere`
      existe y no está en inventario → toast con `requiere_texto` y no cruzar
      (cooldown 1 s); 3. `camera.fadeOut(200)` → `scene.restart({lugar,
      entrada: ladoOpuesto(dir)})`.
- [ ] Entrada por lado: colocar al jugador en el spawn `N/S/E/O` correspondiente.
- [ ] HUD básico: PV del héroe (45/45) y monedas (sin lógica: valores de
      `GameState` que aún no mutan).
- [ ] Guardar lugar/entrada en `GameState` (autosave del stub).

## Detalle técnico

- Colisión jugador-obstáculos: `this.physics.add.collider(player, capaObstaculos)`.
- Zonas de salida: `this.add.rectangle(...)` con
  `this.physics.add.existing(rect, true)` (cuerpo estático) +
  `this.physics.add.overlap(player, rect, cb)`; incluir `dir` para calcular la
  entrada opuesta (E↔O, N↔S).
- Muerte por caída del mapa: no existe — el borde del mapa siempre tiene
  obstáculo o salida; cubrir el borde con colisión además de `setBounds`.
- En esta fase el jugador es un sprite provisional con paleta fija; la
  asignación de paleta por héroe llega con la selección real (Fase F).

## Mapeo de datos

| Campo del lugar | Uso |
|-----------------|-----|
| `salidas` | Valida las zonas `salidas` del mapa (`hacia` debe existir como lugar). |
| `requiere` / `requiere_texto` | Puerta en la transición (probable con un stub de inventario que contenga/no contenga `antorcha`). |
| `nombre` | Rótulo al entrar (banda breve, 1,5 s). |
| `descripcion`, `npcs`, `objetos`, `monedas`, `enemigos`, `tienda`, `descanso`, `eventos` | Se consumen en fases B–E; el validador de mapas ya los lee para avisar de huecos. |

## Entregable jugable

Pasear Vegaverde ↔ el Camino del Molino en el móvil: cámara que sigue,
colisiones con cercados/agua, fade entre lugares, d-pad y botones táctiles
cómodos.

## Criterios de aceptación

- [ ] Entrar y volver entre los dos lugares sin errores; el jugador aparece por
      el lado correcto de entrada.
- [ ] Ningún atajo fuera de mapa; obstáculos colisionan; el HUD no tapa al
      jugador con la cámara en zoom 2.
- [ ] El botón acción solo se enciende cerca de algo interactivo (aunque aquí
      no haya NPCs: dejar el gancho listo).
- [ ] Si el destino pidiera un ítem que no se tiene (probar con un flag de
      prueba), aparece `requiere_texto` y no se cruza.
- [ ] 60 fps en el móvil; el arrastre del canvas no hace scroll del navegador.

## Fuera de alcance (van en...)

NPCs/diálogos/pickups (Fase B) · inventario real y tiendas (Fase C) · enemigos
y combate (Fase D) · eventos de entrada al lugar (Fase E) · los 37 mapas
restantes (Fase G).
