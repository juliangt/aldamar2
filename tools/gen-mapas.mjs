// gen-mapas.mjs — genera los mapas Tiled piloto de la Fase A:
// public/maps/corazon_ceniza/{vegaverde,molino}.json (40×28, tiles 16×16).
// Ejecutar: node tools/gen-mapas.mjs

import fs from 'node:fs'
import path from 'node:path'

const W = 40
const H = 28

// gids del tileset tiny_dungeon (ver gen-tileset.mjs)
const G = {
  cesped: 1,
  cespedMata: 2,
  tierra: 3,
  tierraPiedras: 4,
  agua: 5,
  aguaBorde: 6,
  cercaH: 7,
  cercaV: 8,
  arbol: 9,
  roca: 10,
  flores: 11,
  arbusto: 12,
  muro: 13,
  tablon: 14,
  tejado: 15,
  pasarela: 16,
  hierbaAlta: 17,
  poste: 18,
}

// Tiles con colisión (propiedad `colision: true` en el .tsx exportado).
const COLISION = [
  G.agua,
  G.aguaBorde,
  G.cercaH,
  G.cercaV,
  G.arbol,
  G.roca,
  G.arbusto,
  G.muro,
  G.poste,
]

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function capaVacia(gid) {
  return new Array(W * H).fill(gid)
}

// Rectángulo relleno en una capa.
function relleno(capa, x0, y0, w, h, gid) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      if (x >= 0 && y >= 0 && x < W && y < H) capa[y * W + x] = gid
}

function bordesArboles(capa, huecos) {
  // huecos: [{x0,x1,lado:'E'|'O'|'N'|'S'}] tramos sin árboles en un borde.
  const enHueco = (x, y, lado) =>
    huecos.some((h) => {
      if (h.lado !== lado) return false
      const v = lado === 'E' || lado === 'O' ? y : x
      return v >= h.a && v < h.b
    })
  for (let x = 0; x < W; x++) {
    if (!enHueco(x, 0, 'N')) capa[x] = G.arbol
    if (!enHueco(x, H - 1, 'S')) capa[(H - 1) * W + x] = G.arbol
  }
  for (let y = 0; y < H; y++) {
    if (!enHueco(W - 1, y, 'E')) capa[y * W + W - 1] = G.arbol
    if (!enHueco(0, y, 'O')) capa[y * W] = G.arbol
  }
}

function capaTiles(nombre, data) {
  return {
    data,
    height: H,
    id: 0,
    name: nombre,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: W,
    x: 0,
    y: 0,
  }
}

let idObjeto = 1
function objPunto(cap, x, y, props = {}) {
  return {
    id: idObjeto++,
    name: '',
    point: true,
    height: 0,
    width: 0,
    rotation: 0,
    type: '',
    visible: true,
    x,
    y,
    ...(Object.keys(props).length && { properties: objProps(props) }),
    _capa: cap,
  }
}
function objRect(cap, x, y, w, h, props = {}) {
  return {
    id: idObjeto++,
    name: '',
    height: h,
    width: w,
    ellipse: false,
    rotation: 0,
    type: '',
    visible: true,
    x,
    y,
    ...(Object.keys(props).length && { properties: objProps(props) }),
    _capa: cap,
  }
}
function objProps(props) {
  return Object.entries(props).map(([name, value]) => ({
    name,
    type: typeof value === 'number' ? 'int' : 'string',
    value,
  }))
}
function capaObjetos(nombre, objetos) {
  const { _capa, ..._ } = {} // (los objetos llevan _capa; se quita abajo)
  return {
    draworder: 'topdown',
    id: 0,
    name: nombre,
    objects: objetos.map(({ _capa, ...o }) => o),
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  }
}

const tilesColision = COLISION.map((gid) => ({
  id: gid - 1,
  properties: [{ name: 'colision', type: 'bool', value: true }],
}))

const tileset = {
  columns: 8,
  firstgid: 1,
  image: '../../tilesets/tiny_dungeon.png',
  imagewidth: 128,
  imageheight: 48,
  margin: 0,
  name: 'tiny_dungeon',
  spacing: 0,
  tilecount: 24,
  tilewidth: 16,
  tileheight: 16,
  tiles: tilesColision,
}

function exportar(ruta, capas) {
  const mapa = {
    version: 1,
    tiledversion: '1.10.2',
    type: 'map',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tilewidth: 16,
    tileheight: 16,
    infinite: false,
    width: W,
    height: H,
    tilesets: [tileset],
    layers: capas,
    nextlayerid: capas.length + 1,
    nextobjectid: idObjeto,
  }
  fs.mkdirSync(path.dirname(ruta), { recursive: true })
  fs.writeFileSync(ruta, JSON.stringify(mapa))
  console.log(`mapa → ${ruta}`)
}

// ---------------------------------------------------------------------------
// VEGAVERDE: huertos con cercados, estanque al norte, camino al este.
// ---------------------------------------------------------------------------

function vegaverde() {
  const rng = mulberry32(1001)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.18 ? G.cespedMata : G.cesped

  // camino central que cruza de oeste a este (salida este → molino)
  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(suelo, 0, 12, W, 1, G.tierraPiedras)
  relleno(suelo, 0, 15, W, 1, G.tierraPiedras)

  // estanque al norte (agua con borde superior)
  relleno(obstaculos, 5, 4, 9, 5, G.agua)
  relleno(obstaculos, 5, 3, 9, 1, G.aguaBorde)

  // huertos cercados (dos parcelas)
  relleno(obstaculos, 4, 11, 12, 1, G.cercaH) // cerca sur del huerto norte… el camino pasa por 12; ajustamos
  // parcela noroeste: cercado alrededor de 4..15 × 8..11
  relleno(obstaculos, 16, 8, 1, 4, G.cercaV)
  relleno(obstaculos, 4, 8, 12, 1, G.cercaH)
  relleno(obstaculos, 4, 11, 12, 1, G.cercaH)
  relleno(obstaculos, 4, 8, 1, 4, G.cercaV)
  // parcela sureste
  relleno(obstaculos, 22, 18, 13, 1, G.cercaH)
  relleno(obstaculos, 22, 24, 13, 1, G.cercaH)
  relleno(obstaculos, 22, 18, 1, 7, G.cercaV)
  relleno(obstaculos, 34, 18, 1, 7, G.cercaV)

  // arbolado disperso
  for (const [x, y] of [
    [3, 20],
    [3, 23],
    [18, 5],
    [21, 5],
    [24, 5],
    [27, 5],
    [30, 8],
    [36, 14],
    [36, 22],
    [10, 24],
    [14, 22],
    [17, 24],
  ])
    obstaculos[y * W + x] = G.arbol
  // rocas y arbustos
  obstaculos[9 * W + 20] = G.roca
  obstaculos[9 * W + 21] = G.roca
  obstaculos[19 * W + 6] = G.arbusto
  obstaculos[19 * W + 7] = G.arbusto
  obstaculos[8 * W + 33] = G.arbusto

  // poste indicador junto al camino
  obstaculos[11 * W + 30] = G.poste

  // decoración: flores e hierba alta
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
      decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
  }
  // flores dentro de las parcelas (huerto cuidado)
  for (const [x, y] of [
    [6, 9],
    [9, 10],
    [12, 9],
    [25, 19],
    [28, 20],
    [31, 19],
    [33, 22],
  ])
    decoracion[y * W + x] = G.flores

  bordesArboles(obstaculos, [
    { lado: 'E', a: 12, b: 16 }, // hueco de salida al este (filas 12–15)
  ])

  const spawns = capaObjetos('spawns', [
    objPunto('spawns', (W / 2) * 16, (H / 2) * 16, { nombre: 'centro' }),
    objPunto('spawns', (W / 2) * 16, 1.5 * 16),
    objPunto('spawns', (W / 2) * 16, (H - 1.5) * 16),
    objPunto('spawns', (W - 1.5) * 16, 14 * 16),
    objPunto('spawns', 1.5 * 16, 14 * 16),
  ])

  // salida: borde este en el camino (hacia molino)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, {
      hacia: 'molino',
      dir: 'E',
    }),
  ])

  exportar('public/maps/corazon_ceniza/vegaverde.json', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    capaObjetos('enemigos', []),
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// MOLINO: camino oeste→este, molino con tejado (frente), río al sur.
// ---------------------------------------------------------------------------

function molino() {
  const rng = mulberry32(2002)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.18 ? G.cespedMata : G.cesped

  // camino oeste→este
  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(suelo, 0, 12, W, 1, G.tierraPiedras)
  relleno(suelo, 0, 15, W, 1, G.tierraPiedras)
  // ramal al norte hacia el molino
  relleno(suelo, 18, 8, 3, 4, G.tierra)

  // río Plata al sur con pasarela
  relleno(obstaculos, 0, 22, W, 4, G.agua)
  relleno(obstaculos, 0, 21, W, 1, G.aguaBorde)
  relleno(obstaculos, 12, 21, 3, 5, G.pasarela)

  // edificio del molino (muro + tejado en «frente» + suelo de tablones)
  relleno(suelo, 15, 4, 9, 5, G.tablon)
  relleno(obstaculos, 15, 4, 9, 1, G.muro)
  relleno(obstaculos, 15, 4, 1, 5, G.muro)
  relleno(obstaculos, 23, 4, 1, 5, G.muro)
  relleno(obstaculos, 15, 6, 2, 1, G.muro) // pared interior parcial
  relleno(obstaculos, 21, 6, 2, 1, G.muro)
  relleno(frente, 15, 2, 9, 2, G.tejado) // tejado que sobresale y tapa
  relleno(frente, 14, 3, 1, 1, G.tejado)
  relleno(frente, 24, 3, 1, 1, G.tejado)

  // rocas dispersas
  for (const [x, y] of [
    [6, 8],
    [7, 8],
    [30, 6],
    [31, 6],
    [33, 17],
    [8, 18],
    [27, 18],
  ])
    obstaculos[y * W + x] = G.roca
  obstaculos[10 * W + 26] = G.arbusto
  obstaculos[10 * W + 27] = G.arbusto
  obstaculos[9 * W + 5] = G.arbol
  obstaculos[9 * W + 34] = G.arbol
  obstaculos[17 * W + 3] = G.arbol
  obstaculos[17 * W + 35] = G.arbol

  for (let i = 0; i < 22; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
      decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
  }

  bordesArboles(obstaculos, [
    { lado: 'O', a: 12, b: 16 }, // hueco de salida al oeste (filas 12–15)
    { lado: 'E', a: 12, b: 16 }, // hueco de salida al este (hacia puente)
  ])

  const spawns = capaObjetos('spawns', [
    objPunto('spawns', (W / 2) * 16, 20 * 16),
    objPunto('spawns', (W / 2) * 16, 1.5 * 16),
    objPunto('spawns', (W / 2) * 16, (H - 6) * 16),
    objPunto('spawns', (W - 1.5) * 16, 14 * 16),
    objPunto('spawns', 1.5 * 16, 14 * 16),
  ])

  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'vegaverde', dir: 'O' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, {
      hacia: 'puente',
      dir: 'E',
    }),
  ])

  exportar('public/maps/corazon_ceniza/molino.json', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    capaObjetos('enemigos', []),
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// PUENTE: el Río Plata baja en vertical; el puente de piedra cruza de
// oeste a este. Salidas: oeste → molino, sur → rioclaro (el norte al bosque
// se estrena en Fases E/G, así que su borde queda cerrado).
// ---------------------------------------------------------------------------

function puente() {
  const rng = mulberry32(3003)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.18 ? G.cespedMata : G.cesped

  // río vertical en el centro-este, con puente de piedra a la altura del camino
  const X_RIO = 24
  relleno(obstaculos, X_RIO, 0, 4, H, G.agua)
  relleno(obstaculos, X_RIO - 1, 0, 1, H, G.aguaBorde)
  // orillas de tierra a ambos lados
  relleno(suelo, X_RIO - 2, 0, 1, H, G.tierraPiedras)
  relleno(suelo, X_RIO + 4, 0, 1, H, G.tierraPiedras)
  // camino oeste→este y puente (piedra: tablon a lo ancho)
  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(suelo, 0, 12, W, 1, G.tierraPiedras)
  relleno(suelo, 0, 15, W, 1, G.tierraPiedras)
  relleno(obstaculos, X_RIO - 1, 12, 6, 4, G.tablon) // el puente pisa el río
  // ramal del camino hacia el sur (a Ríoclaro), a la vera oriental
  relleno(suelo, X_RIO + 5, 12, 3, H - 12, G.tierra)
  relleno(suelo, X_RIO + 7, 13, 1, H - 13, G.tierraPiedras)

  // pilares del puente (decoración) y sauces
  for (const [x, y] of [
    [2, 5],
    [6, 7],
    [10, 4],
    [14, 8],
    [18, 5],
    [21, 9],
    [5, 18],
    [13, 19],
    [17, 24],
    [20, 21],
  ])
    obstaculos[y * W + x] = G.arbol
  obstaculos[8 * W + X_RIO + 7] = G.roca
  obstaculos[8 * W + X_RIO + 8] = G.roca
  obstaculos[20 * W + 8] = G.arbusto
  obstaculos[20 * W + 9] = G.arbusto
  // poste indicador en el cruce
  obstaculos[11 * W + (X_RIO + 6)] = G.poste

  for (let i = 0; i < 20; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
      decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
  }

  bordesArboles(obstaculos, [
    { lado: 'O', a: 12, b: 16 }, // hacia molino
    { lado: 'S', a: X_RIO + 5, b: X_RIO + 8 }, // hacia rioclaro
  ])

  const spawns = capaObjetos('spawns', [
    objPunto('spawns', (W / 2) * 16, 20 * 16),
    objPunto('spawns', (W / 2) * 16, 1.5 * 16),
    objPunto('spawns', (W / 2) * 16, (H - 1.5) * 16),
    objPunto('spawns', (W - 1.5) * 16, 14 * 16),
    objPunto('spawns', 1.5 * 16, 14 * 16),
  ])

  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'molino', dir: 'O' }),
    objRect('salidas', (X_RIO + 5) * 16, (H - 1) * 16, 3 * 16, 16, {
      hacia: 'rioclaro',
      dir: 'S',
    }),
  ])

  exportar('public/maps/corazon_ceniza/puente.json', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    capaObjetos('enemigos', []),
    capaObjetos('objetos', []),
    capaObjetos('monedas', [
      ...Array.from({ length: 8 }, (_, i) =>
        objPunto('monedas', (3 + (i % 4) + Math.floor(i / 4) * 5) * 16, (16 + (i % 3) * 3) * 16, { valor: 1 })
      ),
    ]),
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// RIOCLARO: aldea de piedra junto al vado. Posada de Dorotea (tejado en
// «frente», cama en capa «descanso»), salida norte → puente.
// ---------------------------------------------------------------------------

function rioclaro() {
  const rng = mulberry32(4004)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.18 ? G.cespedMata : G.cesped

  // camino real: del norte (puente) a la plaza y hacia el sur (Valoria, G)
  relleno(suelo, 18, 0, 4, H, G.tierra)
  relleno(suelo, 18, 0, 1, H, G.tierraPiedras)
  relleno(suelo, 21, 0, 1, H, G.tierraPiedras)

  // la posada: edificio con tejado (frente) y suelo de tablones; Dorotea dentro
  relleno(suelo, 24, 6, 10, 6, G.tablon)
  relleno(obstaculos, 24, 6, 10, 1, G.muro)
  relleno(obstaculos, 24, 6, 1, 6, G.muro)
  relleno(obstaculos, 33, 6, 1, 6, G.muro)
  relleno(frente, 23, 3, 12, 3, G.tejado)
  relleno(frente, 22, 4, 1, 2, G.tejado)
  relleno(frente, 35, 4, 1, 2, G.tejado)

  // casitas de piedra al oeste
  relleno(suelo, 6, 14, 7, 5, G.tablon)
  relleno(obstaculos, 6, 14, 7, 1, G.muro)
  relleno(obstaculos, 6, 14, 1, 5, G.muro)
  relleno(obstaculos, 12, 14, 1, 5, G.muro)
  relleno(frente, 5, 11, 9, 3, G.tejado)
  relleno(suelo, 8, 21, 6, 4, G.tablon)
  relleno(obstaculos, 8, 21, 6, 1, G.muro)
  relleno(obstaculos, 8, 21, 1, 4, G.muro)
  relleno(obstaculos, 13, 21, 1, 4, G.muro)
  relleno(frente, 7, 18, 8, 3, G.tejado)

  // gallinas opinando: cercado con hierba alta dentro
  relleno(obstaculos, 27, 16, 8, 1, G.cercaH)
  relleno(obstaculos, 27, 21, 8, 1, G.cercaH)
  relleno(obstaculos, 27, 16, 1, 6, G.cercaV)
  relleno(obstaculos, 34, 16, 1, 6, G.cercaV)
  decoracion[18 * W + 29] = G.hierbaAlta
  decoracion[19 * W + 31] = G.hierbaAlta
  decoracion[20 * W + 28] = G.hierbaAlta

  for (const [x, y] of [
    [4, 6],
    [7, 8],
    [3, 24],
    [16, 8],
    [37, 12],
    [36, 24],
    [30, 24],
    [22, 17],
  ])
    obstaculos[y * W + x] = G.arbol
  obstaculos[5 * W + 14] = G.arbusto
  obstaculos[5 * W + 15] = G.arbusto
  obstaculos[24 * W + 20] = G.roca
  obstaculos[9 * W + 34] = G.poste

  for (let i = 0; i < 24; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
      decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
  }

  bordesArboles(obstaculos, [
    { lado: 'N', a: 18, b: 22 }, // hacia puente
  ])

  const spawns = capaObjetos('spawns', [
    objPunto('spawns', (W / 2) * 16, (H / 2) * 16),
    objPunto('spawns', 20 * 16, 1.5 * 16),
    objPunto('spawns', 20 * 16, (H - 1.5) * 16),
    objPunto('spawns', (W - 1.5) * 16, 14 * 16),
    objPunto('spawns', 1.5 * 16, 14 * 16),
  ])

  const salidas = capaObjetos('salidas', [
    objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: 'puente', dir: 'N' }),
  ])

  // Dorotea espera dentro de la posada; la cama, en la esquina noroeste.
  const puntoDorotea = objPunto('npcs', 31 * 16, 11 * 16)
  puntoDorotea.name = 'dorotea'
  const npcs = capaObjetos('npcs', [puntoDorotea])
  const descanso = capaObjetos('descanso', [objPunto('descanso', 26 * 16, 10 * 16)])

  exportar('public/maps/corazon_ceniza/rioclaro.json', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    npcs,
    descanso,
    capaObjetos('enemigos', []),
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    capaObjetos('eventos', []),
  ])
}

idObjeto = 1
vegaverde()
idObjeto = 1
molino()
idObjeto = 1
puente()
idObjeto = 1
rioclaro()
