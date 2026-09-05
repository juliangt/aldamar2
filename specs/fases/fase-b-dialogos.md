# Fase B — Interacciones y diálogos

> **Objetivo:** el mundo habla: NPCs con diálogos del JSON, caja de texto
> táctil con typewriter, interpolación de textos, y recogida de objetos y
> monedas. Es la **Fase B de `specs/fases.md`** expandida.
> **Depende de:** Fase A. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- `DialogBox`: banda inferior, typewriter, paginación automática, avance con tap.
- NPCs: sprites con estado, burbuja «!», selección del interactuable más
  cercano y botón de acción contextual.
- Resolución de `lugar.npcs` → `dialogos`: arrays (secuencia por visita) o
  cadena única; interpolación `{trato}`/`{nombre}`.
- Pickups: `lugar.objetos` y `lugar.monedas` con toast «(Recibes: …)».
- Descripción del lugar al entrar (primera visita: descripción completa;
  siguientes: solo el rótulo breve de la Fase A).

## Tareas

- [ ] `ui/DialogBox.js`: rectángulo semitransparente + borde 1-bit, retrato
      opcional (inicialmente sin retrato), texto pixel, typewriter ~30 car./s
      (`time.addEvent`), indicador «▸ continuar». Tap 1: completa la página;
      tap 2: pasa página; fin: `resolve()` (basada en Promise para encadenar).
- [ ] `Texto.paginar`: parte por páginas que quepan en la caja (ancho/alto de
      fuente pixel real); respetar saltos de línea literales de los JSON.
- [ ] NPCs: sprite estático con animación idle (2 frames), paleta propia por
      NPC, `depth = y`; burbuja «!» flotando mientras el jugador está a rango.
- [ ] Detección de interactuable más cercano: radio ~28 px (o distancia al
      frente del jugador); prioridad NPC > objeto > salida > otro. El botón de
      acción muestra el verbo («Hablar», «Coger», «Entrar»).
- [ ] Resolución de diálogo: `lugar.npcs[npcId]` es clave en `dialogos`:
      - **array** (p. ej. `belthar_vegaverde`, `oldo_vegaverde`, `dorotea` en
        Sal): índice = `min(nº de conversaciones anteriores, longitud − 1)`;
        la última entrada se repite siempre. Contador en
        `GameState.npcVistos[clave]` (persiste en el save).
      - **cadena** (p. ej. `sylvana`, `torkan`): mismo texto siempre.
- [ ] Interpolación: `Texto.tpl(texto, {trato: personaje.trato, nombre})` en
      cada página renderizada.
- [ ] Reclutamiento: `Texto.extraerReclutar` detecta la línea
      `(Escribe  reclutar X …)`; el diálogo la oculta y al terminar muestra
      botones «Reclutar» / «Seguir solo» (la lógica de grupo completa llega en
      la Fase D; aquí se registra en `GameState.companeros` y se muestra un
      toast «X se une al grupo»).
- [ ] Pickups: `objetos`/`monedas` del mapa como sprites con brillo suave;
      tocar (o botón «Coger») → toast «(Recibes: {nombre del ítem}.)» /
      «(+N monedas)» (textos al estilo de los JSON), se añaden a
      `GameState.inventario`/`monedas` y se marcan en `GameState.recogidos`
      (una vez por partida).
- [ ] Descripción del lugar: primera visita → `DialogBox` con
      `lugar.descripcion` tras el fade-in; siguientes → solo rótulo breve.
- [ ] HUD: conectar PV/monedas reales de `GameState` (los pickups ya mutan
      monedas).

## Detalle técnico

- Diálogo como cola de páginas + Promise permite encadenar «evento → diálogo →
  decisión» sin callbacks anidados (lo aprovechan C, D y E).
- Los `dialogos` con array terminan con una entrada «recordatorio» (Belthar:
  «El camino al este sigue esperando…»): la mecánica de índice la gratis.
- Interacción también con tap directo sobre el NPC (además del botón acción):
  facilita el pulgar y no rompe el flujo d-pad.
- Silenciar el d-pad mientras la DialogBox está abierta (bloqueo modal de
  `MenuTactil`).

## Mapeo de datos (piloto: corazon_ceniza)

| Elemento | Dato |
|----------|------|
| Belthar en Vegaverde | `dialogos.belthar_vegaverde` (3 entradas: presentación del encargo, lore del escribano distraído, recordatorio) |
| Objetos de Vegaverde | `provisiones` y `capa_gris` (`lugar.objetos`), +6 monedas (`lugar.monedas`) |
| Molino | `provisiones` + 6 monedas |
| NPCs futuros ya validados por el cargador de mapas | sylvana (bosque), dorotea (rioclaro), aldric (valoria), torkan (minas) |

## Entregable jugable

En Vegaverde: hablar con Belthar tres veces (tres textos distintos, el tercero
se repite ya siempre), recoger provisiones y la capa gris, ver las monedas
subir al HUD; cruzar al Molino, recoger provisiones allí, y volver a hablar
con Belthar sin perder el contador de diálogos.

## Criterios de aceptación

- [ ] Todos los diálogos de `corazon_ceniza` (incluidos los más largos, p. ej.
      `belthar_vegaverde[1]`) se leen completos: paginación correcta, ningún
      texto cortado ni desbordado en 480×270.
- [ ] `{trato}` aparece resuelto («jardinero», «arquera», …) según el héroe
      del `GameState`.
- [ ] La línea `(Escribe  reclutar X …)` nunca se muestra tal cual; se ven los
      botones Reclutar / Seguir solo (probar con sylvana tras añadir su mapa en G).
- [ ] Objetos y monedas solo se recogen una vez por partida (re-entrar no los
      restaura) y se guardan en el autosave.
- [ ] Diálogo abierto ⇒ jugador parado; tap no atraviesa la caja al mundo.

## Fuera de alcance (van en...)

Inventario usable/equipar (Fase C) · combate (Fase D) · eventos de decisión y
narración (Fase E) · mapas con los NPCs restantes (Fase G).
