# Spec de desarrollo — Aldamar (Phaser 4)

> **Versión:** 1.0 · **Fecha:** 2026-09-05 · **Estado:** planificado (sin implementar)
>
> **Fuentes:** `docs/historia.md`, `docs/aventuras/*.json` (4 aventuras),
> `docs/rasgos.json`, `docs/dificultades.json`, `specs/fases.md` (fases A–D originales).
>
> Este documento es la spec maestra. El detalle operativo de cada fase vive en
> `specs/fases/fase-*.md` (índice en §9). El código de `src/` es hoy la plantilla
> por defecto de Vite: la implementación no ha empezado.

---

## 1. Visión y alcance

**Aldamar** es un RPG top-down por turnos para **móvil** (web, táctil), basado en
el juego de texto original en Python y en el lore de `docs/`. Cuatro aventuras
independientes pero encadenadas por el **legado** (decisiones y fama heredadas,
nunca inventario, niveles ni monedas):

| # | Aventura | Tipo | Lugares | Héroes | Jefe final |
|---|----------|------|---------|--------|------------|
| 1 | El Corazón de Ceniza | campaña | 12 | 4 (Tilo, Ithel, Dagna, Ruy) | el Custodio Pálido |
| 2 | La Brasa de Vegaverde · Ascuas I | misión | 5 | 1 (Enebro) | el Espantapájaros Ahumado |
| 3 | La Sal y la Ceniza · Ascuas II | campaña | 9 | 3 (Bruna, Gala, Támara) | la Viuda de Sal |
| 4 | La Aguja sin Sombra · Ascuas III | saga | 13 | 3 (Renco, Vela, Bram) | Morvath, tejido de humo |

**Total: 39 lugares (39 mapas Tiled), 11 héroes, 9 compañeros, 23 definiciones
de enemigo, 7 tipos de evento, 3 dificultades, 4 secretos.**

Alcance del producto:

- Las 4 aventuras jugables de prólogo a epílogo, con todos sus eventos,
  decisiones, tiendas, compañeros, jefes y finales.
- Combate por turnos con habilidades, fases de jefe, veneno, refuerzos y
  comando especial por aventura (corazón / marea / eco).
- Sistema de **corrupción (grieta)** 0–100 con finales tentados y caída.
- **Legado persistente** entre aventuras (banderas juramento/grieta + fama).
- Presentación de marca: **sello ASCII + jingle 8-bit** al abrir y al cerrar.
- **Móvil-first**: todo con botones y toques, cero escritura obligatoria.

Fuera de alcance (por ahora): música con assets externos (el audio 8-bit se
sintetiza), idiomas distintos del español, partidas concurrentes múltiples,
servidor/backend (todo local).

---

## 2. Decisiones de diseño (y por qué)

| # | Decisión | Justificación |
|---|----------|---------------|
| D1 | **Móvil-first, todo táctil** | El juego se juega con los dedos: d-pad + botones grandes, diálogos que avanzan con tap, ninguna pantalla exige teclado. |
| D2 | **Un mapa Tiled por lugar** (39 mapas pequeños) | Encaja 1:1 con `lugares` del JSON; las `salidas` son zonas de borde/puerta; los portales con `requiere` se resuelven en la transición; construcción incremental. |
| D3 | **Arte: Kenney Tiny Dungeon (1-bit, 16×16)** con paletas de color por zona | Gratuito/CC0, tono sobrio acorde a la ceniza; héroes y biomas se diferencian por paleta sin arte nuevo. |
| D4 | **Los JSON de `docs/` son la única fuente de verdad de contenido** | El motor es genérico y data-driven: no hay contenido hard-codeado de aventura; añadir texto/balance es editar JSON, no código. |
| D5 | **Las claves de enemigos/ítems son por aventura** | `espectro` tiene stats distintos en `corazon_ceniza` y en `aguja_sin_sombra`: el motor siempre resuelve enemigos, ítems, tiendas y diálogos en el ámbito de la aventura activa. |
| D6 | **Secretos por toque oculto, no por teclado** | En móvil nadie escribe «cuervo»: cada secreto es un sprite raro tocable en mapas concretos; las «semillas» especiales se ligan al RNG de la partida. |
| D7 | **Audio 8-bit sintetizado (WebAudio)** | Jingle y SFX generados por osciladores: cero assets de audio, tamaño mínimo, estética coherente. |
| D8 | **Phaser 4.2.1 + Vite** ya instalados | Las APIs de `specs/fases.md` siguen válidas en Phaser 4 (§3.5). |

---

## 3. Arquitectura técnica

### 3.1 Estructura de carpetas (propuesta)

```
src/
  main.js                 # arranque: new Phaser.Game(config)
  config.js               # escala, pixelArt, lista de escenas
  core/
    Datos.js              # importa docs/*.json y expone acceso por aventura
    GameState.js          # estado vivo de la partida actual
    Balance.js            # dificultades: multiplicadores y redondeos
    Legacy.js             # legado persistente entre aventuras (localStorage)
    Rng.js                # RNG determinista por semilla (mulberry32 o similar)
    Texto.js              # interpolación {trato} {nombre} {efectivo} {nombres}
  scenes/
    BootScene.js          # precarga mínima + desbloqueo de audio
    SelloScene.js         # sello ASCII + jingle (inicio y cierre)
    MenuScene.js          # título, aventuras, continuar, legado
    HeroeScene.js         # héroe, nombre (opcional), dificultad
    PrologoScene.js       # prologo_base + prologo_extra del héroe
    WorldScene.js         # un lugar = una ejecución de esta escena
    BattleScene.js        # combate por turnos
    EpilogoScene.js       # finales, muerte, caída, jingle, legado
  ui/
    HUD.js                # vida, monedas, grieta, grupo
    DialogBox.js          # caja de texto con typewriter + tap
    MenuTactil.js         # d-pad + botón acción + botón menú
    SelectorOpciones.js   # botones de decisión (eventos/finales)
    InventarioUI.js       # usar / equipar / inspeccionar
    TiendaUI.js           # comprar
  assets/                 # sprites, paletas, tilesets, fuentes
public/
  maps/<aventura>/<lugar>.json   # mapas Tiled exportados
  tilesets/tiny_dungeon.png
```

Los JSON de contenido se importan directamente desde `docs/` (están dentro de
la raíz del proyecto, Vite los sirve sin configuración extra); los mapas Tiled
se cargan en caliente por clave de lugar con `this.load.tilemapTiledJSON`.

### 3.2 Flujo de escenas

```
BootScene → SelloScene → MenuScene ⇄ HeroeScene → PrologoScene → WorldScene
                              │                        ↑              │
                              │                        │ (sleep)      │ colisión enemigo /
                              └── Continuar (guardado) ┘               │ evento final
                                                                       ▼
            MenuScene ← SelloScene ← EpilogoScene ←──┬─────────── BattleScene
                                                     └── WorldScene (resume)
```

- `WorldScene` se **reinicia con datos** en cada cambio de lugar:
  `scene.restart({ aventura, lugar, entrada })`.
- Al entrar en combate: `scene.sleep('World')` + `scene.launch('Battle', datos)`;
  al terminar, `scene.stop('Battle')` + `scene.wake('World', resultado)`.

### 3.3 Clases core

| Clase | Responsabilidad |
|-------|-----------------|
| `Datos` | Carga las 4 aventuras + `rasgos` + `dificultades`. API: `aventura(id)`, `lugar(av, id)`, `enemigo(av, id)`, `item(av, id)`, `evento(av, id)`, `rasgo(id)`, `dificultad(id)`. |
| `GameState` | Partida activa: héroe (stats, nivel, XP, grieta), inventario, equipo, monedas, flags `{}`, vistos `una_vez`, compañeros, lugar actual, semilla. Se serializa a localStorage (§8). |
| `Balance` | Aplica multiplicadores de dificultad (§5.7) a stats iniciales, enemigos, corrupción, curación y XP. |
| `Legacy` | Lee/escribe el legado global: `{juramento, grieta, heroes[], finales{}}`. |
| `Rng` | RNG determinista sembrado al empezar la partida (para secretos con semilla y reproducibilidad de tests). |
| `Texto` | `tpl(cadena, ctx)` sustituye `{trato} {nombre} {efectivo} {nombres}` y recorta los `(Escribe  reclutar X …)` de los diálogos (§4.4). |

### 3.4 Config de juego y escala móvil

- Vista lógica **adaptativa a la orientación** (`core/resolucion.js`):
  **270×480 en vertical** (móvil en mano) u **480×270 en horizontal**
  (móvil girado / escritorio), `Phaser.Scale.FIT` + `CENTER_BOTH`,
  `pixelArt: true`, `roundPixels: true`; cámara del mundo con **zoom 2**
  (visible ≈ 8×15 tiles verticales / 15×8 horizontales de 16 px).
- Al girar el dispositivo (`resize`/`orientationchange`) `reajustarRes`
  redimensiona el canvas, re-encuadra las cámaras y emite `vista-relayout`:
  cada escena/ui re-posiciona su contenido en caliente (el combate
  re-organiza héroes/enemigos/botones, los diálogos re-paginan el texto
  pendiente) sin perder estado.
- **Escritorio:** pantalla completa nativa al primer gesto del usuario
  (Fullscreen API; tecla `F` y botón en el menú de pausa para alternar).
- `input.addPointer(3)` (d-pad y botones a la vez), bloquear scroll/zoom del
  navegador, `user-select: none`, `viewport-fit=cover` + `100dvh` (safe
  areas iOS y barras dinámicas).
- Objetivo: **60 fps** en un móvil de gama media; mapas ≤ 48×32 tiles.

### 3.5 Notas de Phaser 4 (4.2.1 instalado)

- Phaser 4 mantiene la mayor parte de la API pública de Phaser 3: las APIs de
  `specs/fases.md` (`tilemapTiledJSON`, `physics.add.sprite`,
  `cameras.main.startFollow`, `add.rectangle/text`) siguen válidas.
- Cambios relevantes: renderer nuevo (Render Nodes), sistema de tints y
  filtros reescrito. Nada crítico para esta spec; si algo falla, consultar la
  guía oficial de migración v3→v4 y `labs.phaser.io`.
- `TilemapGPULayer` existe como optimización futura; no se usa en v1 (mapas
  pequeños, capas estáticas normales sobran).

---

## 4. Contrato de datos (docs → motor)

### 4.1 Reglas generales

1. El motor **no conoce ninguna aventura concreta**: todo contenido sale de
   `docs/aventuras/<id>.json` + `rasgos.json` + `dificultades.json`.
2. Enemigos, ítems, tiendas y diálogos se resuelven **siempre en el ámbito de
   la aventura activa** (D5).
3. Textos interpolables: `{trato}`, `{nombre}`, `{efectivo}`, `{nombres}`.
4. Textos largos: la `DialogBox` pagina automáticamente.

### 4.2 Lugares → mapas Tiled (convención)

Cada clave de `lugares` es un mapa `public/maps/<aventura>/<lugar>.json`
(orthogonal, tiles 16×16, recomendado 40×28). Convención completa de capas y
objetos: ver [fase-a-mapa-y-movimiento.md](fases/fase-a-mapa-y-movimiento.md).

Semántica de campos del lugar:

- `salidas`: cada dirección (+ alias) apunta a otra clave de lugar; el mapa
  Tiled decide dónde está físicamente la zona de salida.
- `requiere` / `requiere_texto`: al intentar cruzar hacia el lugar que exige
  ítem, si no está en inventario se muestra `requiere_texto` y no se cruza
  (ej.: `antorcha` en minas, `estandarte` en yerma, `farol_sal` en
  salina_vieja, `campanilla` en aguja_pies).
- `tienda: true` + `tiendas[lugar]` → NPC de tienda (Fase C).
- `descanso: true` → botón «Descansar» (curación total gratuita del grupo).
- `objetos` y `monedas`: pickup **una vez por partida** (flag interno).
- `enemigos`: un combate por sprite; al re-entrar en el lugar reaparecen
  (permite ganar XP), salvo lugares con evento `final` ya resuelto
  *(interpretación — Apéndice A)*.

### 4.3 Enemigos, habilidades y fases

```jsonc
{
  "vida": 26, "ataque": 8, "defensa": 1,          // stats base (Balance multiplica)
  "sin_huida": true,                               // jefe: no se puede huir
  "experiencia": 28,                               // XP al derrotarlo
  "habilidades": [ ... ],                          // IA por peso y condiciones
  "fases": [ { "vida_menor_que": 45, ... } ]       // cambio de fase por % de vida
}
```

| Habilidad | Comportamiento (interpretación, §Apéndice A) |
|-----------|----------------------------------------------|
| `veneno` | Se activa `cada_n_turnos` del enemigo (en lugar de atacar): aplica DoT de `dano` por turno durante `turnos` al objetivo. |
| `golpe_fuerte` | En el turno que cumple `cada_n_turnos`, muestra `texto_aviso` (telegraph, gasta el turno); el siguiente golpe lleva `dano_extra`. `texto_golpe` interpola `{efectivo}`. |
| `curarse` | Elegible solo si se cumple su condición (p. ej. vida < X%); se cura `puntos`; respeta `cada_n_turnos`. |
| `refuerzo` | Añade `enemigo` al combate, hasta `veces` veces por combate. |

Selección de acción enemiga: entre habilidades elegibles (condición + cadencia)
se sortea por `peso`; si ninguna aplica, ataque normal.

`fases`: al bajar de `vida_menor_que` **%** de la vida máxima → `texto`
(narración), `nombre` nuevo, `ataque` nuevo y `habilidades` reemplazadas.
Custodio (<45%) y Morvath (<50%) son los dos jefes con fase.

### 4.4 Eventos (7 tipos)

Los eventos se resuelven en `eventos[lugar.eventos[]]`. Disparo:

- **Al entrar en el lugar** (tras el fade-in, en orden): `narrar`, `emboscar`,
  `corrupcion`, `curar_grupo`, `otorgar` — si cumplen `condicion` y no se han
  disparado ya (`una_vez`).
- **Al interactuar con su gatillo** (objeto Tiled `eventos` o NPC asociado):
  `decision` y `final`.

| Tipo | Comportamiento |
|------|----------------|
| `narrar` | Caja de texto. `una_vez`. Si `grieta_desde: N` y grieta ≥ N → se usa `texto_grieta` en vez de `texto`. |
| `decision` | `SelectorOpciones` con `titulo` + `detalle` por opción; al elegir: `texto` de consecuencia, opcional `item` (se recibe), `flag` (se activa), `corrupcion` (se suma). |
| `emboscar` | `texto` y salta a `BattleScene` con `enemigos` (combate forzado). `condicion` opcional (p. ej. `no_flag: alianza`). |
| `corrupcion` | `aviso` en caja de texto + `puntos` × multiplicador de dificultad a la grieta. |
| `curar_grupo` | Cura total del grupo y ajusta `corrupcion` (negativa). `una_vez`. |
| `otorgar` | Entrega `item` con `texto`. `una_vez`. |
| `final` | Ver §5.6. |

Los diálogos de reclutamiento contienen la línea `(Escribe  reclutar X …)`:
`Texto` la detecta y la sustituye por botones táctiles **«Reclutar» / «Seguir
solo»** que equivalen a aceptar/rechazar al compañero (reclutado → se une al
grupo con sus stats de `reclutas`).

### 4.5 Legado (entre aventuras)

| Aventura | importa | exporta |
|----------|---------|---------|
| El Corazón de Ceniza | — | `juramento` ← flag `alianza` · `grieta` ← flag `coronado` |
| La Brasa de Vegaverde | juramento, grieta | `juramento` ← flag `bruna` |
| La Sal y la Ceniza | juramento, grieta | `juramento` ← flag `faro_encendido` · `grieta` ← flag `faro_robado` |
| La Aguja sin Sombra | juramento, grieta | `juramento` ← flag `consejo` · `grieta` ← flag `guardia` |

- Se exportan las banderas al terminar la aventura sin morir ni caer
  *(interpretación — Apéndice A)*.
- Al importar: los eventos «de cadena» de la aventura siguiente se activan
  (`casa_llena`/`agua_que_cuenta` en Brasa; `cadena_en_el_vado`/`hilo_gris`
  en Sal; `cadena_en_el_molino`/`hilos_en_el_agua` en Aguja), y el prólogo
  añade `texto_fama` («Tu fama te precede…»).
- Nunca se heredan inventario, niveles ni monedas.

### 4.6 Secretos y semillas

Cada aventura define un secreto (`cuervo`, `abejas`, `gaviota`, `campanilla`)
con: 3 `textos` rotatorios, `texto_combate`, `alias` y `semillas`
(seed 42 / 20 / 40 / 100 → texto único).

En el juego gráfico (D6):

- Cada secreto aparece como **sprite raro y tocable** en mapas concretos
  (cuervo en exteriores, abejas cerca del colmenar, gaviota en la costa,
  campanilla tras obtenerla). Probabilidad de aparición por visita según `Rng`.
- Tocarlo muestra `textos[i]` (i avanza por toque). En combate, un botón
  pequeño y discreto lo invoca y muestra `texto_combate`.
- Si la semilla de la partida coincide con una `semilla`, el texto mostrado es
  el especial. La semilla se muestra en el menú de pausa.

---

## 5. Sistemas de juego (reglas)

### 5.1 Héroes y rasgos

- Stats por héroe (del JSON): `vida`, `ataque`, `monedas`, `inventario`,
  `rasgos`, `trato`, `quien`, `prologo_extra`, `presentacion`.
- Ataque efectivo = `ataque` + bono del **arma equipada**; defensa = bono de la
  **armadura** equipada (una de cada; las no equipadas siguen en inventario).
- Rasgos (`docs/rasgos.json`):
  - **Ojo de halcón**: +1 de daño mientras el enemigo conserve > 50% de su vida.
  - **Piel de piedra**: −1 a cada golpe recibido.
  - **Lengua de mercado**: −1 moneda en cada compra.
- Compañeros (`reclutas`): vida/ataque/defensa propios; atacan
  automáticamente tras el héroe; reciben golpes y **pueden caer** (a 0 PV se
  retiran del combate; se levantan con 1 PV al ganar *(interpretación)*).

### 5.2 Combate (resumen — detalle en [fase-d-combate.md](fases/fase-d-combate.md))

- Máquina de estados: `INTRO → MENÚ JUGADOR (Atacar/Objeto/Especial/Cuerno/Huida) →
  RESOLUCIÓN → ALIADOS → ENEMIGOS (IA) → …`.
- Daño físico = ataque − defensa del objetivo, mínimo 1 (determinista, como el
  original de texto *(interpretación)*).
- Huida: posible solo si ningún enemigo tiene `sin_huida`; prob. 0.5; al
  fallar, turno del enemigo *(interpretación)*.
- **Comando especial** (corazón / marea / eco; Brasa no tiene): daño
  `dano_base + dano_por_corrupcion × ⌊grieta/10⌋` y **cuesta** grieta
  (`corrupcion_coste`). *(Fórmula a validar — Apéndice A.)*
- **Cuerno de Valoria**: un uso; derrota al instante a los enemigos «menores»
  (sin `sin_huida`); contra un jefe no hace nada y no se consume
  *(interpretación)*.
- Recompensa: XP (`experiencia` × mult. de dificultad) — las monedas del mundo
  son pickups de lugar, no drops.

### 5.3 Corrupción (grieta)

- Métrica 0–100, visible en HUD. Fuentes: eventos `corrupcion` (5–8 pts),
  decisiones con `corrupcion` (corona +6, faro robado +8), comando especial
  (+12/+15 por uso). Sumideros: `ritual` −15, `fragua` −10.
- Todo lo que suma se multiplica por `corrupcion` de la dificultad.
- **Grieta ≥ 100 → caída inmediata**: epílogo `caida` (el Corazón/ascua te
  lleva), fin de la partida sin legado.
- En los `final`: grieta ≥ `umbral_tentado` → final *tentado*; si no, *puro*.

### 5.4 Economía, tiendas y descanso

- Monedas: pickups de lugar + iniciales del héroe, multiplicadas por la
  dificultad al empezar.
- Tiendas (`tienda: true` + lista `tiendas[lugar]`): solo compra; precio
  efectivo = `precio` − 1 con Lengua de mercado (mín. 0 *(interpretación)*).
- `descanso: true`: curación total gratuita del grupo + texto del posadero.

### 5.5 Progresión (XP) — propuesta a calibrar

- Nivel n → n+1: `30 × n` XP acumulables. Al subir: **+5 PV máx (y +5
  actuales), +1 ataque en niveles pares**. *(No existe en los JSON; se calibra
  en Fase H con las XP totales disponibles de cada aventura.)*

### 5.6 Finales

Resolución del evento `final`:

1. Se muestran las opciones cuya `requiere_flag` (si existe) está activa.
2. Opción especial (p. ej. brindar con el tercio, devolver la ascua al faro,
   cantar la Alianza) → epílogo propio (`estilo: epico/aviso`) y nombre de
   final propio.
3. Opción base → según grieta vs `umbral_tentado`:
   - < umbral → `epilogo_puro` / `final_puro`
   - ≥ umbral → `epilogo_tentado` / `final_tentado` (la grieta queda)
4. Se añade `texto_companeros` con `{nombres}` de los compañeros vivos.
5. Muerte en combate → `epilogos.muerte`; grieta 100 → `epilogos.caida`.

La campaña 1 completa sus **seis finales**: victoria pura, victoria
compartida (promesa + brindis), victoria con cicatriz (tentado), la Sombra
nueva (reclamar el Corazón), la caída y la muerte.

### 5.7 Dificultades (`docs/dificultades.json`)

| Multiplicador | Paseo por el huerto | El camino (defecto) | Yermos de Ceniza |
|---------------|--------------------:|--------------------:|-----------------:|
| vida_jugador  | ×1.30 | ×1.00 | ×0.80 |
| ataque_jugador | ×1.15 | ×1.00 | — |
| monedas       | ×1.40 | ×1.00 | ×0.80 |
| vida_enemigos | ×0.75 | ×1.00 | ×1.35 |
| ataque_enemigos | ×0.70 | ×1.00 | ×1.25 |
| corrupcion    | ×0.60 | ×1.00 | ×1.25 |
| curacion      | ×1.25 | ×1.00 | ×0.85 |
| experiencia   | ×1.25 | ×1.00 | ×0.85 |

`Balance` aplica los multiplicadores al crear la partida (stats iniciales,
redondeo entero) y en cada cálculo runtime (enemigos, corrupción, curación,
XP). «El camino» es la identidad: se juega el balance con el que se escribió.

---

## 6. UI y controles móviles

- **D-pad** (8 direcciones) abajo-izquierda; **botón de acción contextual**
  abajo-derecha («Hablar», «Coger», «Entrar», «Descansar»…) que se ilumina
  cuando hay algo al alcance; **botón menú** (pausa: inventario, opciones,
  salir, semilla).
- Tamaño mínimo de botón ≈ 48 px CSS; safe areas respetadas.
- **Diálogos**: banda inferior ~64 px de alto, typewriter (~30 car./s); un tap
  completa la página, el siguiente la avanza; sin texto tecleable.
- **Decisiones**: botones apilados con `titulo` (negrita) + `detalle`.
- **Nombre del héroe**: por defecto el canónico; «Cambiar nombre» opcional con
  teclado táctil propio (rejilla A–Z), máx. 12 letras. El prompt del JSON
  (`texto_nombre`) se muestra como texto de sabor.
- **HUD**: PV (numérico), monedas, grieta (barra 0–100), compañeros (retratos
  mini con PV).

---

## 7. Plan de assets

| Recurso | Fuente | Notas |
|---------|--------|-------|
| Tileset base 16×16 | Kenney **Tiny Dungeon** (CC0) | Un solo PNG compartido; colisiones por propiedad de tile. |
| Paletas por bioma | Propias (recolor del 1-bit) | Huerto/verde, camino/ocre, bosque, mina/azul, ciénaga, yermos/gris, aguja, costa/azul-sal. |
| Héroes (11) | Tiny Dungeon chars + paleta por héroe | Nombre flotante bajo el sprite. |
| NPCs / compañeros (9) | Tiny Dungeon chars + paleta | Burbuja «!» cuando hay diálogo. |
| Enemigos (23 defs.) | Tiny Dungeon monsters + paleta | Jefes con sprite mayor (×2). |
| Mapas (39) | Tiled (mapeditor.org) | Convención en [fase-a](fases/fase-a-mapa-y-movimiento.md); plantillas por bioma para acelerar la Fase G. |
| Jingle + SFX | Sintetizados WebAudio (D7) | Sin archivos de audio. |
| Fuente | Pixel font web libre (p. ej. estilo «Press Start 2P») | Múltiplos de 8 px. |

---

## 8. Persistencia y guardado

Todo en `localStorage`:

- **Partida** (una por aventura, autosave en cada transición/evento/compra/
  combate): `aldamar:save:<aventura>` → `{heroe, nombre, dificultad, stats,
  nivel, xp, grieta, monedas, inventario, equipo, companeros, flags, vistos,
  recogidos, lugar, entrada, semilla}`.
- **Legado global**: `aldamar:legado` → `{juramento, grieta, heroes[],
  finales{aventura: nombreFinal}}`.
- «Continuar» en el menú restaura `WorldScene` en `lugar` + `entrada`.
- Al terminar (cualquier final): se borra el save de esa aventura, se escribe
  el legado y se marca la aventura completada con el final obtenido.

---

## 9. Fases de desarrollo (índice)

`specs/fases.md` definió las fases A–D; esta spec las expande y añade la 0 y
la E–H. Cada fase tiene su documento detallado:

| Fase | Documento | Depende de | Entregable jugable |
|------|-----------|------------|--------------------|
| 0 — Cimientos | [fase-0-cimientos.md](fases/fase-0-cimientos.md) | — | La app abre en el móvil: sello + menú vacío, datos cargados. |
| A — Mapa y movimiento | [fase-a-mapa-y-movimiento.md](fases/fase-a-mapa-y-movimiento.md) | 0 | Pasear Vegaverde ↔ Molino con cámara, colisiones y d-pad. |
| B — Interacciones y diálogos | [fase-b-dialogos.md](fases/fase-b-dialogos.md) | A | Hablar con Belthar, recoger objetos y monedas. |
| C — Inventario y economía | [fase-c-inventario-y-economia.md](fases/fase-c-inventario-y-economia.md) | B | Comprar en Ríoclaro, usar consumibles, equipar, descansar. |
| D — Combate por turnos | [fase-d-combate.md](fases/fase-d-combate.md) | B | Combate completo (habilidades, jefes, XP) en el mundo. |
| E — Eventos y corrupción | [fase-e-eventos-y-corrupcion.md](fases/fase-e-eventos-y-corrupcion.md) | C, D | Decisiones, emboscadas, grieta, puertas con requisito. |
| F — Meta-juego | [fase-f-metajuego.md](fases/fase-f-metajuego.md) | E | Campaña 1 de menú a sus 6 finales, con guardado y legado. |
| G — Contenido de las 4 aventuras | [fase-g-contenido.md](fases/fase-g-contenido.md) | F | Las 4 aventuras completas jugables. |
| H — Pulido, audio y balance | [fase-h-pulido.md](fases/fase-h-pulido.md) | G | RC optimizada en dispositivo real, dificultades calibradas. |

El **hito vertical** es el final de la Fase F: *El Corazón de Ceniza* completa
en móvil. Las fases 0–F usan la campaña 1 como contenido piloto; la Fase G
produce el resto del contenido con el motor ya cerrado.

---

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Phaser 4 es reciente (ecosistema/API en evolución) | Versión fijada (^4.2.1); verificar cada API nueva contra `labs.phaser.io`; guía de migración v3→v4 a mano. |
| Rendimiento en móviles modestos | Mapas pequeños, un tileset, zoom de cámara, sin efectos de partículas complejos; presupuesto: 60 fps gama media. |
| Alcance de contenido (39 mapas) | Plantillas Tiled por bioma + colocación sistemática (Fase G dedicada); el motor no cambia al añadir mapas. |
| Interpretaciones del JSON que no cuadran con el Python original | Apéndice A lista cada supuesto; se validan en Fases D/E contra el juego original. |
| Textos largos en pantalla pequeña | Paginación automática y prueba temprana de la caja de diálogo con los textos más largos reales. |
| Audio bloqueado en móvil hasta el primer toque | El AudioContext se desbloquea en el primer tap (BootScene). |
| Safe areas / gestos del navegador | `viewport-fit=cover`, `touch-action: none`, botones ≥ 48 px, pruebas en dispositivo real desde la Fase 0. |

---

## 11. Definición de terminado

1. Las 4 aventuras se juegan de prólogo a epílogo en un móvil real, sin
   errores de consola, a 60 fps estables.
2. Los 7 tipos de evento, los 6 finales de la campaña 1, el legado y los
   secretos funcionan según esta spec.
3. Las 3 dificultades se sienten distintas en playtesting (protocolo a crear
   en Fase H, `docs/playtesting.md`).
4. Sello + jingle al abrir y al cerrar; guardado/continuar operativos;
   build de producción (`vite build`) desplegable en hosting estático.

---

## Apéndice A — Interpretaciones a validar contra el original en Python

Los JSON describen el contenido pero no todas las reglas. Supuestos de esta
spec (revisar con el código Python original durante las Fases D y E):

1. Fórmula del comando especial: `dano_base + dano_por_corrupcion × ⌊grieta/10⌋`,
   coste de grieta `corrupcion_coste`. ¿Correcto divisor (¿/10? ¿cada punto?)?
2. Semántica exacta de `cada_n_turnos` (¿del enemigo? ¿del combate?) y del
   telegraph de `golpe_fuerte` (aviso → golpe siguiente).
3. Ticks de `veneno` (`dano`/`turnos`): ¿sobre el héroe, sobre compañeros, cuándo?
4. Tabla de XP/niveles (§5.5 es propuesta propia: no existe en los datos).
5. Probabilidad y reglas de huida (0.5 propuesto); comportamiento al huir.
6. Efecto y consumo del `cuerno_valoria` (§5.2).
7. Recuperación de compañeros caídos tras el combate (1 PV propuesto).
8. Enemigos: ¿respawnean al re-entrar en un lugar? (propuesto: sí, salvo
   final resuelto). ¿Monedas/objetos de lugar: una vez? (propuesto: sí).
9. Objetivo enemigo cuando hay compañeros (propuesto: aleatorio entre vivos).
10. Legado: ¿se exporta también con finales oscuros (la Sombra nueva)?
    (propuesto: sí, salvo muerte/caída).
11. Precio mínimo con Lengua de mercado (propuesto: puede llegar a 0).
12. Variación de daño (propuesto: determinista, sin dados).

## Apéndice B — Datos de referencia rápidos

- **Lugares por aventura**: Corazón (12): vegaverde, molino, puente, bosque,
  rioclaro, valoria, minas, cienagas, refugio, yerma, aguja, umbak · Brasa
  (5): vegaverde, ejido, tejera, lavadero, colmenar · Sal (9): rioclaro, vado,
  calzada, faro, esteros, cauce, salinas, casa_sal, salina_vieja · Aguja (13):
  vegaverde, molino, encrucijada, rioclaro, valoria, bosque, puente, refugio,
  barrok, cienagas, yerma, aguja_pies, aguja_cima.
- **Puertas con `requiere`**: minas (antorcha), yerma (estandarte),
  salina_vieja (farol_sal), aguja_pies (campanilla).
- **Tiendas**: rioclaro y valoria (Corazón) · ninguna (Brasa) · rioclaro y
  casa_sal (Sal) · rioclaro y barrok (Aguja).
- **Descanso**: vegaverde, rioclaro, valoria, refugio (Corazón) · vegaverde
  (Brasa) · rioclaro (Sal) · vegaverde, rioclaro, valoria, refugio (Aguja).
- **Comandos especiales**: `corazon` (base 12, +3 por tramo de grieta, coste
  15) · Brasa: ninguno · `marea` (base 10, +3, coste 12) · `eco` (base 12,
  +3, coste 12).
- **Umbrales tentados**: Corazón 60 · Brasa 50 · Sal 55 · Aguja 60.
- **Secretos y semillas**: cuervo (42) · abejas (20) · gaviota (40) ·
  campanilla (100).
