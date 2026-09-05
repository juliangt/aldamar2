// gen-mapas.mjs — genera los 12 mapas Tiled de El Corazón de Ceniza (Fase E):
// 40×28 tiles de 16×16.
// Exporta a public/maps/corazon_ceniza/ y dist/maps/corazon_ceniza/
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

function relleno(capa, x0, y0, w, h, gid) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++)
      if (x >= 0 && y >= 0 && x < W && y < H) capa[y * W + x] = gid
}

function bordes(capa, huecos, gidBorde = G.arbol) {
  const enHueco = (x, y, lado) =>
    huecos.some((h) => {
      if (h.lado !== lado) return false
      const v = lado === 'E' || lado === 'O' ? y : x
      return v >= h.a && v < h.b
    })
  for (let x = 0; x < W; x++) {
    if (!enHueco(x, 0, 'N')) capa[x] = gidBorde
    if (!enHueco(x, H - 1, 'S')) capa[(H - 1) * W + x] = gidBorde
  }
  for (let y = 0; y < H; y++) {
    if (!enHueco(W - 1, y, 'E')) capa[y * W + W - 1] = gidBorde
    if (!enHueco(0, y, 'O')) capa[y * W] = gidBorde
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

function exportar(id, capas) {
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
  const contenido = JSON.stringify(mapa)
  for (const dir of ['public', 'dist']) {
    const ruta = `${dir}/maps/corazon_ceniza/${id}.json`
    fs.mkdirSync(path.dirname(ruta), { recursive: true })
    fs.writeFileSync(ruta, contenido)
  }
  console.log(`mapa guardado → corazon_ceniza/${id}.json`)
}

function spawnsEstandar(cx = W / 2, cy = H / 2) {
  return capaObjetos('spawns', [
    objPunto('spawns', cx * 16, cy * 16, { nombre: 'centro' }),
    objPunto('spawns', (W / 2) * 16, 1.5 * 16),
    objPunto('spawns', (W / 2) * 16, (H - 1.5) * 16),
    objPunto('spawns', (W - 1.5) * 16, (H / 2) * 16),
    objPunto('spawns', 1.5 * 16, (H / 2) * 16),
  ])
}

// ---------------------------------------------------------------------------
// 1. VEGAVERDE: huertos, estanque, Belthar, provisiones, capa_gris, 6 monedas, descanso
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

  // camino central de oeste a este
  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(suelo, 0, 12, W, 1, G.tierraPiedras)
  relleno(suelo, 0, 15, W, 1, G.tierraPiedras)

  // estanque al norte
  relleno(obstaculos, 5, 4, 9, 5, G.agua)
  relleno(obstaculos, 5, 3, 9, 1, G.aguaBorde)

  // casa-redil de Oldo al sur (suelo de tablones, descanso dentro)
  relleno(suelo, 6, 18, 10, 6, G.tablon)
  relleno(obstaculos, 6, 18, 10, 1, G.muro)
  relleno(obstaculos, 6, 18, 1, 6, G.muro)
  relleno(obstaculos, 15, 18, 1, 6, G.muro)
  relleno(frente, 5, 15, 12, 3, G.tejado)

  // huerto cercado al este
  relleno(obstaculos, 22, 17, 13, 1, G.cercaH)
  relleno(obstaculos, 22, 24, 13, 1, G.cercaH)
  relleno(obstaculos, 22, 17, 1, 8, G.cercaV)
  relleno(obstaculos, 34, 17, 1, 8, G.cercaV)

  // flores y decoracion
  for (let i = 0; i < 26; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
      decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
  }

  bordes(obstaculos, [{ lado: 'E', a: 12, b: 16 }], G.arbol)

  const spawns = spawnsEstandar(W / 2, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'molino', dir: 'E' }),
  ])

  // NPC: Belthar
  const pBelthar = objPunto('npcs', 10 * 16, 14 * 16)
  pBelthar.name = 'belthar'
  const npcs = capaObjetos('npcs', [pBelthar])

  // Descanso en la casa
  const descanso = capaObjetos('descanso', [objPunto('descanso', 8 * 16, 20 * 16)])

  // Objetos: provisiones y capa_gris
  const pProv = objPunto('objetos', 13 * 16, 20 * 16)
  pProv.name = 'provisiones'
  const pCapa = objPunto('objetos', 13 * 16, 22 * 16)
  pCapa.name = 'capa_gris'
  const objetos = capaObjetos('objetos', [pProv, pCapa])

  // Monedas: 6
  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 6 }, (_, i) =>
      objPunto('monedas', (24 + (i % 3) * 3) * 16, (19 + Math.floor(i / 3) * 3) * 16, { valor: 1 })
    ),
  ])

  exportar('vegaverde', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    npcs,
    descanso,
    capaObjetos('enemigos', []),
    objetos,
    monedas,
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 2. MOLINO: camino O<->E, molino, río al sur, provisiones, 6 monedas
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

  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(suelo, 0, 12, W, 1, G.tierraPiedras)
  relleno(suelo, 0, 15, W, 1, G.tierraPiedras)
  relleno(suelo, 18, 8, 3, 4, G.tierra)

  relleno(obstaculos, 0, 22, W, 4, G.agua)
  relleno(obstaculos, 0, 21, W, 1, G.aguaBorde)
  relleno(obstaculos, 12, 21, 3, 5, G.pasarela)

  // Molino
  relleno(suelo, 15, 4, 9, 5, G.tablon)
  relleno(obstaculos, 15, 4, 9, 1, G.muro)
  relleno(obstaculos, 15, 4, 1, 5, G.muro)
  relleno(obstaculos, 23, 4, 1, 5, G.muro)
  relleno(frente, 15, 2, 9, 2, G.tejado)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 },
    { lado: 'E', a: 12, b: 16 },
  ], G.arbol)

  const spawns = spawnsEstandar(W / 2, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'vegaverde', dir: 'O' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'puente', dir: 'E' }),
  ])

  const pProv = objPunto('objetos', 19 * 16, 6 * 16)
  pProv.name = 'provisiones'
  const objetos = capaObjetos('objetos', [pProv])

  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 6 }, (_, i) =>
      objPunto('monedas', (6 + (i % 3) * 3) * 16, (6 + Math.floor(i / 3) * 3) * 16, { valor: 1 })
    ),
  ])

  exportar('molino', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    capaObjetos('enemigos', []),
    objetos,
    monedas,
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 3. PUENTE: río vertical, puente O-E, salidas O (molino), N (bosque), S (rioclaro), lobo, 8 monedas
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

  const X_RIO = 24
  relleno(obstaculos, X_RIO, 0, 4, H, G.agua)
  relleno(obstaculos, X_RIO - 1, 0, 1, H, G.aguaBorde)
  relleno(suelo, X_RIO - 2, 0, 1, H, G.tierraPiedras)
  relleno(suelo, X_RIO + 4, 0, 1, H, G.tierraPiedras)

  relleno(suelo, 0, 12, W, 4, G.tierra)
  relleno(obstaculos, X_RIO - 1, 12, 6, 4, G.tablon)

  // ramal hacia el sur (rioclaro)
  relleno(suelo, X_RIO + 5, 12, 3, H - 12, G.tierra)
  // ramal hacia el norte (bosque)
  relleno(suelo, X_RIO + 5, 0, 3, 12, G.tierra)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 },
    { lado: 'N', a: X_RIO + 5, b: X_RIO + 8 },
    { lado: 'S', a: X_RIO + 5, b: X_RIO + 8 },
  ], G.arbol)

  const spawns = spawnsEstandar(X_RIO + 6, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'molino', dir: 'O' }),
    objRect('salidas', (X_RIO + 5) * 16, 0, 3 * 16, 16, { hacia: 'bosque', dir: 'N' }),
    objRect('salidas', (X_RIO + 5) * 16, (H - 1) * 16, 3 * 16, 16, { hacia: 'rioclaro', dir: 'S' }),
  ])

  const pLobo = objPunto('enemigos', 14 * 16, 14 * 16)
  pLobo.name = 'lobo'
  const enemigos = capaObjetos('enemigos', [pLobo])

  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 8 }, (_, i) =>
      objPunto('monedas', (4 + (i % 4) * 3) * 16, (18 + Math.floor(i / 4) * 3) * 16, { valor: 1 })
    ),
  ])

  exportar('puente', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    enemigos,
    capaObjetos('objetos', []),
    monedas,
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 4. BOSQUE: faroles, Sylvana, espectro, hierbas, antorcha, 6 monedas, salidas S (puente), E (valoria)
// ---------------------------------------------------------------------------
function bosque() {
  const rng = mulberry32(4001)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.25 ? G.cespedMata : G.cesped

  // sendero de S (puente) a E (valoria)
  relleno(suelo, 18, 12, 4, H - 12, G.tierra)
  relleno(suelo, 18, 12, W - 18, 4, G.tierra)

  // arboleda densa
  for (let i = 0; i < 40; i++) {
    const x = 2 + Math.floor(rng() * (W - 4))
    const y = 2 + Math.floor(rng() * (H - 4))
    if (suelo[y * W + x] !== G.tierra) obstaculos[y * W + x] = G.arbol
  }

  bordes(obstaculos, [
    { lado: 'S', a: 18, b: 22 },
    { lado: 'E', a: 12, b: 16 },
  ], G.arbol)

  const spawns = spawnsEstandar(20, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 18 * 16, (H - 1) * 16, 4 * 16, 16, { hacia: 'puente', dir: 'S' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'valoria', dir: 'E' }),
  ])

  const pSylvana = objPunto('npcs', 14 * 16, 10 * 16)
  pSylvana.name = 'sylvana'
  const npcs = capaObjetos('npcs', [pSylvana])

  const pEspectro = objPunto('enemigos', 26 * 16, 18 * 16)
  pEspectro.name = 'espectro'
  const enemigos = capaObjetos('enemigos', [pEspectro])

  const pHierbas = objPunto('objetos', 10 * 16, 8 * 16)
  pHierbas.name = 'hierbas'
  const pAntorcha = objPunto('objetos', 28 * 16, 6 * 16)
  pAntorcha.name = 'antorcha'
  const objetos = capaObjetos('objetos', [pHierbas, pAntorcha])

  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 6 }, (_, i) =>
      objPunto('monedas', (6 + (i % 3) * 4) * 16, (18 + Math.floor(i / 3) * 4) * 16, { valor: 1 })
    ),
  ])

  exportar('bosque', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    npcs,
    enemigos,
    objetos,
    monedas,
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 5. RIOCLARO: Dorotea, posada, descanso, gatillo encargo, salidas N (puente), S (valoria)
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

  // camino real de N (puente) a S (valoria)
  relleno(suelo, 18, 0, 4, H, G.tierra)
  relleno(suelo, 18, 0, 1, H, G.tierraPiedras)
  relleno(suelo, 21, 0, 1, H, G.tierraPiedras)

  // posada de Dorotea
  relleno(suelo, 24, 6, 10, 6, G.tablon)
  relleno(obstaculos, 24, 6, 10, 1, G.muro)
  relleno(obstaculos, 24, 6, 1, 6, G.muro)
  relleno(obstaculos, 33, 6, 1, 6, G.muro)
  relleno(frente, 23, 3, 12, 3, G.tejado)

  bordes(obstaculos, [
    { lado: 'N', a: 18, b: 22 },
    { lado: 'S', a: 18, b: 22 },
  ], G.arbol)

  const spawns = spawnsEstandar(20, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: 'puente', dir: 'N' }),
    objRect('salidas', 18 * 16, (H - 1) * 16, 4 * 16, 16, { hacia: 'valoria', dir: 'S' }),
  ])

  const pDorotea = objPunto('npcs', 31 * 16, 11 * 16)
  pDorotea.name = 'dorotea'
  const npcs = capaObjetos('npcs', [pDorotea])

  const descanso = capaObjetos('descanso', [objPunto('descanso', 26 * 16, 10 * 16)])

  const pEncargo = objPunto('eventos', 29 * 16, 11 * 16, { evento: 'encargo' })
  pEncargo.name = 'encargo'
  const eventos = capaObjetos('eventos', [pEncargo])

  exportar('rioclaro', [
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
    eventos,
  ])
}

// ---------------------------------------------------------------------------
// 6. VALORIA: Ciudad Dorada, Aldric, descanso, gatillo consejo, salidas O (bosque), N (rioclaro), E (minas)
// ---------------------------------------------------------------------------
function valoria() {
  const rng = mulberry32(6006)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // Plaza de piedra / tablón blanco
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.2 ? G.tierraPiedras : G.tierra

  // Gran Sala del Consejo del Sol al norte
  relleno(suelo, 12, 3, 16, 8, G.tablon)
  relleno(obstaculos, 12, 3, 16, 1, G.muro)
  relleno(obstaculos, 12, 3, 1, 8, G.muro)
  relleno(obstaculos, 27, 3, 1, 8, G.muro)
  relleno(frente, 11, 1, 18, 2, G.tejado)

  // Albergue / descanso al suroeste
  relleno(suelo, 4, 18, 8, 6, G.tablon)
  relleno(obstaculos, 4, 18, 8, 1, G.muro)
  relleno(obstaculos, 4, 18, 1, 6, G.muro)
  relleno(obstaculos, 11, 18, 1, 6, G.muro)
  relleno(frente, 3, 16, 10, 2, G.tejado)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 }, // a bosque
    { lado: 'N', a: 18, b: 22 }, // a rioclaro
    { lado: 'E', a: 12, b: 16 }, // a minas
  ], G.muro)

  const spawns = spawnsEstandar(20, 16)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'bosque', dir: 'O' }),
    objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: 'rioclaro', dir: 'N' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'minas', dir: 'E' }),
  ])

  const pAldric = objPunto('npcs', 17 * 16, 7 * 16)
  pAldric.name = 'aldric'
  const npcs = capaObjetos('npcs', [pAldric])

  const descanso = capaObjetos('descanso', [objPunto('descanso', 6 * 16, 21 * 16)])

  const pConsejo = objPunto('eventos', 22 * 16, 7 * 16, { evento: 'consejo' })
  pConsejo.name = 'consejo'
  const eventos = capaObjetos('eventos', [pConsejo])

  exportar('valoria', [
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
    eventos,
  ])
}

// ---------------------------------------------------------------------------
// 7. MINAS: Barrok, Torkan, hacha_goran, 2 trasgos, 12 monedas, salidas O (valoria), E (cienagas)
// ---------------------------------------------------------------------------
function minas() {
  const rng = mulberry32(7007)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // galerías de roca
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.3 ? G.tierraPiedras : G.tierra

  // columnas y muros de mina
  relleno(obstaculos, 10, 6, 2, 4, G.roca)
  relleno(obstaculos, 26, 6, 2, 4, G.roca)
  relleno(obstaculos, 10, 18, 2, 4, G.roca)
  relleno(obstaculos, 26, 18, 2, 4, G.roca)

  // fragua de Torkan al norte
  relleno(suelo, 16, 4, 8, 6, G.tablon)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 },
    { lado: 'E', a: 12, b: 16 },
  ], G.roca)

  const spawns = spawnsEstandar(W / 2, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'valoria', dir: 'O' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'cienagas', dir: 'E' }),
  ])

  const pTorkan = objPunto('npcs', 18 * 16, 7 * 16)
  pTorkan.name = 'torkan'
  const npcs = capaObjetos('npcs', [pTorkan])

  const pHacha = objPunto('objetos', 22 * 16, 7 * 16)
  pHacha.name = 'hacha_goran'
  const objetos = capaObjetos('objetos', [pHacha])

  const pT1 = objPunto('enemigos', 15 * 16, 15 * 16)
  pT1.name = 'trasgo'
  const pT2 = objPunto('enemigos', 30 * 16, 15 * 16)
  pT2.name = 'trasgo'
  const enemigos = capaObjetos('enemigos', [pT1, pT2])

  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 12 }, (_, i) =>
      objPunto('monedas', (6 + (i % 6) * 4) * 16, (20 + Math.floor(i / 6) * 3) * 16, { valor: 1 })
    ),
  ])

  exportar('minas', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    npcs,
    enemigos,
    objetos,
    monedas,
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 8. CIENAGAS: fango, 2 espectros, salidas O (minas), N (refugio), E (yerma)
// ---------------------------------------------------------------------------
function cienagas() {
  const rng = mulberry32(8008)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.3 ? G.tierraPiedras : G.tierra

  // pantanos y charcos
  relleno(obstaculos, 6, 5, 10, 5, G.agua)
  relleno(obstaculos, 24, 18, 10, 5, G.agua)
  relleno(obstaculos, 8, 17, 6, 4, G.agua)

  // pasarela de madera
  relleno(suelo, 0, 12, W, 4, G.tablon)
  relleno(suelo, 18, 0, 4, H, G.tablon)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 },
    { lado: 'N', a: 18, b: 22 },
    { lado: 'E', a: 12, b: 16 },
  ], G.arbol)

  const spawns = spawnsEstandar(20, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'minas', dir: 'O' }),
    objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: 'refugio', dir: 'N' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'yerma', dir: 'E' }),
  ])

  const pE1 = objPunto('enemigos', 12 * 16, 10 * 16)
  pE1.name = 'espectro'
  const pE2 = objPunto('enemigos', 28 * 16, 10 * 16)
  pE2.name = 'espectro'
  const enemigos = capaObjetos('enemigos', [pE1, pE2])

  exportar('cienagas', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    enemigos,
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 9. REFUGIO: Torre de Belthar, Belthar, descanso, salida S (cienagas)
// ---------------------------------------------------------------------------
function refugio() {
  const rng = mulberry32(9009)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // fango exterior
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = G.tierraPiedras

  // agua rodeando el islote
  relleno(obstaculos, 4, 3, W - 8, 1, G.agua)
  relleno(obstaculos, 4, 3, 1, H - 6, G.agua)
  relleno(obstaculos, W - 5, 3, 1, H - 6, G.agua)

  // torre central de piedra
  relleno(suelo, 12, 6, 16, 12, G.tablon)
  relleno(obstaculos, 12, 6, 16, 1, G.muro)
  relleno(obstaculos, 12, 6, 1, 12, G.muro)
  relleno(obstaculos, 27, 6, 1, 12, G.muro)
  relleno(frente, 11, 4, 18, 2, G.tejado)

  // fuente de agua clara en el centro
  relleno(obstaculos, 19, 11, 2, 2, G.agua)

  // camino de salida al sur
  relleno(suelo, 18, 18, 4, H - 18, G.tierra)

  bordes(obstaculos, [{ lado: 'S', a: 18, b: 22 }], G.arbol)

  const spawns = spawnsEstandar(20, 16)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 18 * 16, (H - 1) * 16, 4 * 16, 16, { hacia: 'cienagas', dir: 'S' }),
  ])

  const pBelthar = objPunto('npcs', 16 * 16, 10 * 16)
  pBelthar.name = 'belthar'
  const npcs = capaObjetos('npcs', [pBelthar])

  const descanso = capaObjetos('descanso', [objPunto('descanso', 24 * 16, 9 * 16)])

  exportar('refugio', [
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

// ---------------------------------------------------------------------------
// 10. YERMA: Yermos de Ceniza, 2 loberos, salidas O (cienagas), N (aguja), E (umbak)
// ---------------------------------------------------------------------------
function yerma() {
  const rng = mulberry32(10010)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // tierra árida y grietas
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.4 ? G.tierraPiedras : G.tierra

  relleno(obstaculos, 8, 8, 4, 3, G.roca)
  relleno(obstaculos, 28, 8, 4, 3, G.roca)
  relleno(obstaculos, 14, 18, 5, 2, G.roca)

  bordes(obstaculos, [
    { lado: 'O', a: 12, b: 16 },
    { lado: 'N', a: 18, b: 22 },
    { lado: 'E', a: 12, b: 16 },
  ], G.roca)

  const spawns = spawnsEstandar(20, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'cienagas', dir: 'O' }),
    objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: 'aguja', dir: 'N' }),
    objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: 'umbak', dir: 'E' }),
  ])

  const pL1 = objPunto('enemigos', 14 * 16, 10 * 16)
  pL1.name = 'lobero'
  const pL2 = objPunto('enemigos', 26 * 16, 16 * 16)
  pL2.name = 'lobero'
  const enemigos = capaObjetos('enemigos', [pL1, pL2])

  exportar('yerma', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    enemigos,
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    capaObjetos('eventos', []),
  ])
}

// ---------------------------------------------------------------------------
// 11. AGUJA: Capitán de Ceniza, gatillo corona, 20 monedas, salida S (yerma)
// ---------------------------------------------------------------------------
function aguja() {
  const rng = mulberry32(11011)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // fortaleza pálida
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.2 ? G.tierraPiedras : G.tablon

  // murallas interiores
  relleno(obstaculos, 6, 4, 2, 16, G.muro)
  relleno(obstaculos, W - 8, 4, 2, 16, G.muro)

  // trono al norte
  relleno(suelo, 16, 4, 8, 4, G.tierraPiedras)
  relleno(obstaculos, 16, 4, 8, 1, G.muro)

  bordes(obstaculos, [{ lado: 'S', a: 18, b: 22 }], G.muro)

  const spawns = spawnsEstandar(20, 18)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 18 * 16, (H - 1) * 16, 4 * 16, 16, { hacia: 'yerma', dir: 'S' }),
  ])

  const pCapitan = objPunto('enemigos', 20 * 16, 12 * 16)
  pCapitan.name = 'capitan'
  const enemigos = capaObjetos('enemigos', [pCapitan])

  const pCorona = objPunto('eventos', 20 * 16, 6 * 16, { evento: 'corona' })
  pCorona.name = 'corona'
  const eventos = capaObjetos('eventos', [pCorona])

  const monedas = capaObjetos('monedas', [
    ...Array.from({ length: 20 }, (_, i) =>
      objPunto('monedas', (10 + (i % 5) * 4) * 16, (16 + Math.floor(i / 5) * 2) * 16, { valor: 1 })
    ),
  ])

  exportar('aguja', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    enemigos,
    capaObjetos('objetos', []),
    monedas,
    eventos,
  ])
}

// ---------------------------------------------------------------------------
// 12. UMBAK: Monte Umbak, Forja Eterna, Custodio Pálido, gatillo final, salida O (yerma)
// ---------------------------------------------------------------------------
function umbak() {
  const rng = mulberry32(12012)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // roca volcánica y ceniza
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      suelo[y * W + x] = rng() < 0.5 ? G.tierraPiedras : G.tierra

  // paredes volcánicas
  relleno(obstaculos, 6, 4, 4, 16, G.roca)
  relleno(obstaculos, W - 10, 4, 4, 16, G.roca)

  // Forja Eterna al norte
  relleno(suelo, 16, 3, 8, 5, G.tablon)
  relleno(obstaculos, 16, 3, 8, 1, G.muro)
  relleno(obstaculos, 19, 5, 2, 2, G.agua) // la boca ardiente de la forja

  bordes(obstaculos, [{ lado: 'O', a: 12, b: 16 }], G.roca)

  const spawns = spawnsEstandar(14, 14)
  const salidas = capaObjetos('salidas', [
    objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: 'yerma', dir: 'O' }),
  ])

  const pCustodio = objPunto('enemigos', 20 * 16, 11 * 16)
  pCustodio.name = 'custodio'
  const enemigos = capaObjetos('enemigos', [pCustodio])

  const pFinal = objPunto('eventos', 20 * 16, 6 * 16, { evento: 'final' })
  pFinal.name = 'final'
  const eventos = capaObjetos('eventos', [pFinal])

  exportar('umbak', [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    capaObjetos('npcs', []),
    enemigos,
    capaObjetos('objetos', []),
    capaObjetos('monedas', []),
    eventos,
  ])
}

// ---------------------------------------------------------------------------
// Ejecución de todos los mapas
// ---------------------------------------------------------------------------
console.log('Generando los 12 mapas de Corazón de Ceniza...')
idObjeto = 1; vegaverde()
idObjeto = 1; molino()
idObjeto = 1; puente()
idObjeto = 1; bosque()
idObjeto = 1; rioclaro()
idObjeto = 1; valoria()
idObjeto = 1; minas()
idObjeto = 1; cienagas()
idObjeto = 1; refugio()
idObjeto = 1; yerma()
idObjeto = 1; aguja()
idObjeto = 1; umbak()
console.log('¡12 mapas generados con éxito!')
