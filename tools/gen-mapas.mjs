// gen-mapas.mjs — genera los 39 mapas Tiled de Aldamar (Fase G):
// Corazón de Ceniza (12), La Brasa de Vegaverde (5), La Sal y la Ceniza (9), La Aguja sin Sombra (13).
// 40×28 tiles de 16×16.
// Exporta a public/maps/<aventura>/ y dist/maps/<aventura>/
// Ejecutar: node tools/gen-mapas.mjs

import fs from 'node:path'
import path from 'node:path'
import fsPromises from 'node:fs'

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

function capaVacia(gid = 0) {
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

function exportar(aventura, id, capas) {
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
    const ruta = `${dir}/maps/${aventura}/${id}.json`
    fsPromises.mkdirSync(path.dirname(ruta), { recursive: true })
    fsPromises.writeFileSync(ruta, contenido)
  }
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
// PLANTILLAS POR BIOMA (11 biomas)
// ---------------------------------------------------------------------------

function aplicarBioma(bioma, suelo, obstaculos, decoracion, frente, rng, huecosBorde) {
  switch (bioma) {
    case 'huerto': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.18 ? G.cespedMata : G.cesped
      // Sendas de tierra
      relleno(suelo, 0, 12, W, 4, G.tierra)
      // Detalles flores y hierba
      for (let i = 0; i < 24; i++) {
        const x = 2 + Math.floor(rng() * (W - 4))
        const y = 2 + Math.floor(rng() * (H - 4))
        if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
          decoracion[y * W + x] = rng() < 0.5 ? G.flores : G.hierbaAlta
      }
      bordes(obstaculos, huecosBorde, G.arbol)
      break
    }
    case 'camino': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.25 ? G.cespedMata : G.cesped
      // Calzada de tierra con piedras
      relleno(suelo, 0, 11, W, 6, G.tierra)
      for (let x = 0; x < W; x++) {
        if (rng() < 0.3) suelo[11 * W + x] = G.tierraPiedras
        if (rng() < 0.3) suelo[16 * W + x] = G.tierraPiedras
      }
      for (let i = 0; i < 20; i++) {
        const x = 2 + Math.floor(rng() * (W - 4))
        const y = 2 + Math.floor(rng() * (H - 4))
        if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
          decoracion[y * W + x] = rng() < 0.4 ? G.arbusto : G.hierbaAlta
      }
      bordes(obstaculos, huecosBorde, G.arbol)
      break
    }
    case 'bosque': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.3 ? G.cespedMata : G.cesped
      // Sendero serpenteante
      relleno(suelo, 4, 12, W - 8, 4, G.tierra)
      relleno(suelo, 18, 2, 4, 14, G.tierra)
      // Rocas y arbustos
      for (let i = 0; i < 18; i++) {
        const x = 3 + Math.floor(rng() * (W - 6))
        const y = 3 + Math.floor(rng() * (H - 6))
        if (suelo[y * W + x] === G.cesped && obstaculos[y * W + x] === 0)
          obstaculos[y * W + x] = rng() < 0.6 ? G.arbol : G.arbusto
      }
      bordes(obstaculos, huecosBorde, G.arbol)
      break
    }
    case 'aldea': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.25 ? G.tierraPiedras : G.tierra
      // Plaza empedrada central
      relleno(suelo, 10, 8, 20, 12, G.tablon)
      bordes(obstaculos, huecosBorde, G.muro)
      break
    }
    case 'minas': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.35 ? G.tierraPiedras : G.tierra
      // Galerías de roca
      relleno(obstaculos, 6, 6, 8, 6, G.roca)
      relleno(obstaculos, 26, 6, 8, 6, G.roca)
      relleno(obstaculos, 14, 18, 12, 4, G.roca)
      bordes(obstaculos, huecosBorde, G.roca)
      break
    }
    case 'cienagas': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.4 ? G.tierraPiedras : G.tierra
      // Lagunas de lodo/agua
      relleno(obstaculos, 8, 5, 8, 4, G.agua)
      relleno(obstaculos, 24, 16, 9, 5, G.agua)
      for (let i = 0; i < 20; i++) {
        const x = 2 + Math.floor(rng() * (W - 4))
        const y = 2 + Math.floor(rng() * (H - 4))
        if (obstaculos[y * W + x] === 0)
          decoracion[y * W + x] = G.hierbaAlta
      }
      bordes(obstaculos, huecosBorde, G.roca)
      break
    }
    case 'torre': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.2 ? G.tierraPiedras : G.tablon
      // Murallas interiores de la torre
      relleno(obstaculos, 6, 4, 2, 16, G.muro)
      relleno(obstaculos, W - 8, 4, 2, 16, G.muro)
      bordes(obstaculos, huecosBorde, G.muro)
      break
    }
    case 'costa': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.3 ? G.tierraPiedras : G.tierra
      // Canales de agua salada
      relleno(obstaculos, 0, 4, 12, 4, G.agua)
      relleno(obstaculos, 28, 18, 12, 6, G.agua)
      // Pasarelas sobre agua
      relleno(suelo, 12, 11, 16, 6, G.pasarela)
      bordes(obstaculos, huecosBorde, G.roca)
      break
    }
    case 'yermos': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.45 ? G.tierraPiedras : G.tierra
      relleno(obstaculos, 8, 8, 5, 3, G.roca)
      relleno(obstaculos, 27, 7, 5, 3, G.roca)
      relleno(obstaculos, 14, 18, 6, 2, G.roca)
      bordes(obstaculos, huecosBorde, G.roca)
      break
    }
    case 'aguja': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.2 ? G.tierraPiedras : G.tablon
      relleno(obstaculos, 6, 4, 2, 16, G.muro)
      relleno(obstaculos, W - 8, 4, 2, 16, G.muro)
      relleno(suelo, 16, 4, 8, 4, G.tierraPiedras)
      relleno(obstaculos, 16, 4, 8, 1, G.muro)
      bordes(obstaculos, huecosBorde, G.muro)
      break
    }
    case 'volcan': {
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++)
          suelo[y * W + x] = rng() < 0.5 ? G.tierraPiedras : G.tierra
      relleno(obstaculos, 6, 4, 4, 16, G.roca)
      relleno(obstaculos, W - 10, 4, 4, 16, G.roca)
      relleno(suelo, 16, 3, 8, 5, G.tablon)
      relleno(obstaculos, 16, 3, 8, 1, G.muro)
      relleno(obstaculos, 19, 5, 2, 2, G.agua) // cráter / magma
      bordes(obstaculos, huecosBorde, G.roca)
      break
    }
  }
}

// ---------------------------------------------------------------------------
// GENERADOR GENÉRICO DE MAPA
// ---------------------------------------------------------------------------

function generarMapa(aventura, lugarId, bioma, seed, def) {
  idObjeto = 1
  const rng = mulberry32(seed)
  const suelo = capaVacia(0)
  const obstaculos = capaVacia(0)
  const decoracion = capaVacia(0)
  const frente = capaVacia(0)

  // Calcular huecos para bordes según salidas declaradas
  const huecosBorde = []
  const salidasObjs = []
  for (const s of def.salidas || []) {
    if (s.dir === 'N') {
      huecosBorde.push({ lado: 'N', a: 18, b: 22 })
      salidasObjs.push(objRect('salidas', 18 * 16, 0, 4 * 16, 16, { hacia: s.hacia, dir: 'N' }))
    } else if (s.dir === 'S') {
      huecosBorde.push({ lado: 'S', a: 18, b: 22 })
      salidasObjs.push(objRect('salidas', 18 * 16, (H - 1) * 16, 4 * 16, 16, { hacia: s.hacia, dir: 'S' }))
    } else if (s.dir === 'E') {
      huecosBorde.push({ lado: 'E', a: 12, b: 16 })
      salidasObjs.push(objRect('salidas', (W - 1) * 16, 12 * 16, 16, 4 * 16, { hacia: s.hacia, dir: 'E' }))
    } else if (s.dir === 'O') {
      huecosBorde.push({ lado: 'O', a: 12, b: 16 })
      salidasObjs.push(objRect('salidas', 0, 12 * 16, 16, 4 * 16, { hacia: s.hacia, dir: 'O' }))
    }
  }

  aplicarBioma(bioma, suelo, obstaculos, decoracion, frente, rng, huecosBorde)

  if (def.personalizar) {
    def.personalizar({ suelo, obstaculos, decoracion, frente, rng })
  }

  const spawns = spawnsEstandar(def.spawnX ?? W / 2, def.spawnY ?? 14)
  const salidas = capaObjetos('salidas', salidasObjs)

  // NPCs
  const npcsObjs = (def.npcs || []).map((n) => {
    const p = objPunto('npcs', n.x * 16, n.y * 16)
    p.name = n.name
    return p
  })
  const npcs = capaObjetos('npcs', npcsObjs)

  // Enemigos
  const eneObjs = (def.enemigos || []).map((e) => {
    const p = objPunto('enemigos', e.x * 16, e.y * 16)
    p.name = e.name
    return p
  })
  const enemigos = capaObjetos('enemigos', eneObjs)

  // Objetos
  const objObjs = (def.objetos || []).map((o) => {
    const p = objPunto('objetos', o.x * 16, o.y * 16)
    p.name = o.name
    return p
  })
  const objetos = capaObjetos('objetos', objObjs)

  // Monedas
  const monObjs = []
  if (def.monedas > 0) {
    const mx = def.monedasX ?? 20
    const my = def.monedasY ?? 18
    for (let i = 0; i < def.monedas; i++) {
      monObjs.push(
        objPunto('monedas', (mx + (i % 4) * 3) * 16, (my + Math.floor(i / 4) * 2) * 16, { valor: 1 })
      )
    }
  }
  const monedas = capaObjetos('monedas', monObjs)

  // Eventos
  const evObjs = (def.eventos || []).map((ev) => {
    const p = objPunto('eventos', ev.x * 16, ev.y * 16, { evento: ev.name })
    p.name = ev.name
    return p
  })
  const eventos = capaObjetos('eventos', evObjs)

  // Descanso
  const descObjs = def.descanso
    ? [objPunto('descanso', (def.descansoX ?? 8) * 16, (def.descansoY ?? 20) * 16)]
    : []
  const descanso = capaObjetos('descanso', descObjs)

  const capas = [
    capaTiles('suelo', suelo),
    capaTiles('obstaculos', obstaculos),
    capaTiles('decoracion', decoracion),
    capaTiles('frente', frente),
    spawns,
    salidas,
    npcs,
    descanso,
    enemigos,
    objetos,
    monedas,
    eventos,
  ]

  exportar(aventura, lugarId, capas)
}

// ---------------------------------------------------------------------------
// 1. EL CORAZÓN DE CENIZA (12 MAPAS)
// ---------------------------------------------------------------------------

function generarCorazonCeniza() {
  console.log('Generando mapas de corazon_ceniza...')

  generarMapa('corazon_ceniza', 'vegaverde', 'huerto', 1001, {
    salidas: [{ dir: 'E', hacia: 'molino' }],
    npcs: [{ name: 'belthar', x: 10, y: 14 }],
    objetos: [{ name: 'provisiones', x: 13, y: 20 }, { name: 'capa_gris', x: 13, y: 22 }],
    monedas: 6,
    monedasX: 24,
    monedasY: 19,
    descanso: true,
    descansoX: 8,
    descansoY: 20,
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Estanque al norte
      relleno(obstaculos, 5, 4, 9, 5, G.agua)
      relleno(obstaculos, 5, 3, 9, 1, G.aguaBorde)
      // Casa-redil de Oldo al sur
      relleno(suelo, 6, 18, 10, 6, G.tablon)
      relleno(obstaculos, 6, 18, 10, 1, G.muro)
      relleno(obstaculos, 6, 18, 1, 6, G.muro)
      relleno(obstaculos, 15, 18, 1, 6, G.muro)
      relleno(frente, 5, 15, 12, 3, G.tejado)
      // Huerto cercado
      relleno(obstaculos, 22, 17, 13, 1, G.cercaH)
      relleno(obstaculos, 22, 24, 13, 1, G.cercaH)
      relleno(obstaculos, 22, 17, 1, 8, G.cercaV)
      relleno(obstaculos, 34, 17, 1, 8, G.cercaV)
    },
  })

  generarMapa('corazon_ceniza', 'molino', 'camino', 2002, {
    salidas: [{ dir: 'O', hacia: 'vegaverde' }, { dir: 'E', hacia: 'puente' }],
    objetos: [{ name: 'provisiones', x: 22, y: 8 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 18,
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Río en diagonal este
      for (let y = 0; y < H; y++) {
        const rx = 30 + Math.floor(Math.sin(y / 3) * 3)
        relleno(obstaculos, rx, y, 6, 1, G.agua)
        suelo[y * W + rx - 1] = G.aguaBorde
      }
      // Molino al norte
      relleno(suelo, 18, 4, 8, 6, G.tablon)
      relleno(obstaculos, 18, 4, 8, 1, G.muro)
      relleno(obstaculos, 18, 4, 1, 6, G.muro)
      relleno(obstaculos, 25, 4, 1, 6, G.muro)
      relleno(frente, 17, 2, 10, 3, G.tejado)
    },
  })

  generarMapa('corazon_ceniza', 'puente', 'camino', 3003, {
    salidas: [{ dir: 'O', hacia: 'molino' }, { dir: 'N', hacia: 'bosque' }, { dir: 'S', hacia: 'rioclaro' }],
    enemigos: [{ name: 'lobo', x: 28, y: 14 }],
    monedas: 8,
    monedasX: 6,
    monedasY: 6,
    personalizar: ({ suelo, obstaculos }) => {
      // Gran río vertical
      for (let y = 0; y < H; y++) {
        relleno(obstaculos, 17, y, 6, 1, G.agua)
        suelo[y * W + 16] = G.aguaBorde
        suelo[y * W + 23] = G.aguaBorde
      }
      // Puente de madera horizontal
      relleno(suelo, 16, 11, 8, 5, G.pasarela)
      relleno(obstaculos, 16, 11, 8, 0, 0)
    },
  })

  generarMapa('corazon_ceniza', 'bosque', 'bosque', 4004, {
    salidas: [{ dir: 'S', hacia: 'puente' }, { dir: 'E', hacia: 'valoria' }],
    npcs: [{ name: 'sylvana', x: 20, y: 10 }],
    enemigos: [{ name: 'espectro', x: 30, y: 16 }],
    objetos: [{ name: 'hierbas', x: 12, y: 8 }, { name: 'antorcha', x: 28, y: 8 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 18,
    personalizar: ({ suelo }) => {
      relleno(suelo, 16, 8, 8, 6, G.tierra)
    },
  })

  generarMapa('corazon_ceniza', 'rioclaro', 'aldea', 5005, {
    salidas: [{ dir: 'N', hacia: 'puente' }, { dir: 'S', hacia: 'valoria' }],
    npcs: [{ name: 'dorotea', x: 18, y: 10 }],
    eventos: [{ name: 'encargo', x: 18, y: 12 }],
    descanso: true,
    descansoX: 24,
    descansoY: 10,
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Posada de Dorotea
      relleno(suelo, 14, 6, 14, 8, G.tablon)
      relleno(obstaculos, 14, 6, 14, 1, G.muro)
      relleno(obstaculos, 14, 6, 1, 8, G.muro)
      relleno(obstaculos, 27, 6, 1, 8, G.muro)
      relleno(frente, 13, 4, 16, 3, G.tejado)
    },
  })

  generarMapa('corazon_ceniza', 'valoria', 'aldea', 6006, {
    salidas: [{ dir: 'O', hacia: 'bosque' }, { dir: 'N', hacia: 'rioclaro' }, { dir: 'E', hacia: 'minas' }],
    npcs: [{ name: 'aldric', x: 20, y: 8 }],
    eventos: [{ name: 'consejo', x: 20, y: 10 }],
    descanso: true,
    descansoX: 10,
    descansoY: 18,
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Sala del consejo
      relleno(suelo, 14, 4, 12, 8, G.tablon)
      relleno(obstaculos, 14, 4, 12, 1, G.muro)
      relleno(obstaculos, 14, 4, 1, 8, G.muro)
      relleno(obstaculos, 25, 4, 1, 8, G.muro)
      relleno(frente, 13, 2, 14, 3, G.tejado)
    },
  })

  generarMapa('corazon_ceniza', 'minas', 'minas', 7007, {
    salidas: [{ dir: 'O', hacia: 'valoria' }, { dir: 'E', hacia: 'cienagas' }],
    npcs: [{ name: 'torkan', x: 12, y: 14 }],
    enemigos: [{ name: 'trasgo', x: 22, y: 10 }, { name: 'trasgo', x: 28, y: 16 }],
    objetos: [{ name: 'hacha_goran', x: 16, y: 8 }],
    monedas: 12,
    monedasX: 8,
    monedasY: 18,
    eventos: [], // forja es tipo curar_grupo, no gatillo
  })

  generarMapa('corazon_ceniza', 'cienagas', 'cienagas', 8008, {
    salidas: [{ dir: 'O', hacia: 'minas' }, { dir: 'N', hacia: 'refugio' }, { dir: 'E', hacia: 'yerma' }],
    enemigos: [{ name: 'espectro', x: 14, y: 12 }, { name: 'espectro', x: 26, y: 16 }],
  })

  generarMapa('corazon_ceniza', 'refugio', 'torre', 9009, {
    salidas: [{ dir: 'S', hacia: 'cienagas' }],
    npcs: [{ name: 'belthar', x: 16, y: 10 }],
    descanso: true,
    descansoX: 24,
    descansoY: 9,
  })

  generarMapa('corazon_ceniza', 'yerma', 'yermos', 10010, {
    salidas: [{ dir: 'O', hacia: 'cienagas' }, { dir: 'N', hacia: 'aguja' }, { dir: 'E', hacia: 'umbak' }],
    enemigos: [{ name: 'lobero', x: 14, y: 10 }, { name: 'lobero', x: 26, y: 16 }],
  })

  generarMapa('corazon_ceniza', 'aguja', 'aguja', 11011, {
    salidas: [{ dir: 'S', hacia: 'yerma' }],
    enemigos: [{ name: 'capitan', x: 20, y: 12 }],
    eventos: [{ name: 'corona', x: 20, y: 6 }],
    monedas: 20,
    monedasX: 10,
    monedasY: 16,
  })

  generarMapa('corazon_ceniza', 'umbak', 'volcan', 12012, {
    salidas: [{ dir: 'O', hacia: 'yerma' }],
    enemigos: [{ name: 'custodio', x: 20, y: 11 }],
    eventos: [{ name: 'final', x: 20, y: 6 }],
  })
}

// ---------------------------------------------------------------------------
// 2. LA BRASA DE VEGAVERDE (5 MAPAS)
// ---------------------------------------------------------------------------

function generarBrasaVegaverde() {
  console.log('Generando mapas de brasa_vegaverde...')

  // vegaverde: Oldo NPC; carta_belthar + hoz; 5 monedas; descanso
  generarMapa('brasa_vegaverde', 'vegaverde', 'huerto', 20101, {
    salidas: [{ dir: 'E', hacia: 'ejido' }],
    npcs: [{ name: 'oldo', x: 10, y: 14 }],
    objetos: [{ name: 'carta_belthar', x: 13, y: 20 }, { name: 'hoz', x: 13, y: 22 }],
    monedas: 5,
    monedasX: 24,
    monedasY: 19,
    descanso: true,
    descansoX: 8,
    descansoY: 20,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(obstaculos, 5, 4, 9, 5, G.agua)
      relleno(obstaculos, 5, 3, 9, 1, G.aguaBorde)
      relleno(suelo, 6, 18, 10, 6, G.tablon)
      relleno(obstaculos, 6, 18, 10, 1, G.muro)
      relleno(obstaculos, 6, 18, 1, 6, G.muro)
      relleno(obstaculos, 15, 18, 1, 6, G.muro)
      relleno(frente, 5, 15, 12, 3, G.tejado)
    },
  })

  // ejido: mirlo; 6 monedas; salidas a vegaverde (O), tejera (E), lavadero (S)
  generarMapa('brasa_vegaverde', 'ejido', 'huerto', 20102, {
    salidas: [
      { dir: 'O', hacia: 'vegaverde' },
      { dir: 'E', hacia: 'tejera' },
      { dir: 'S', hacia: 'lavadero' },
    ],
    enemigos: [{ name: 'mirlo', x: 22, y: 12 }],
    monedas: 6,
    monedasX: 12,
    monedasY: 6,
    personalizar: ({ suelo, obstaculos }) => {
      // Hileras de puerros y huertos secos
      relleno(suelo, 8, 6, 24, 2, G.tierraPiedras)
      relleno(suelo, 8, 18, 24, 2, G.tierraPiedras)
      relleno(obstaculos, 14, 5, 2, 4, G.cercaV)
    },
  })

  // tejera: jefe ahumado (sin huida), gatillo final, salida O (ejido)
  generarMapa('brasa_vegaverde', 'tejera', 'volcan', 20103, {
    salidas: [{ dir: 'O', hacia: 'ejido' }],
    enemigos: [{ name: 'ahumado', x: 20, y: 12 }],
    eventos: [{ name: 'final', x: 20, y: 6 }],
    personalizar: ({ obstaculos, suelo }) => {
      // El viejo tejo ardiendo en el centro
      relleno(suelo, 17, 9, 6, 6, G.tierraPiedras)
      relleno(obstaculos, 19, 10, 2, 2, G.arbol)
    },
  })

  // lavadero: Perpetua NPC, capa_encerada, 8 monedas, salidas N (ejido), O (colmenar)
  generarMapa('brasa_vegaverde', 'lavadero', 'huerto', 20104, {
    salidas: [
      { dir: 'N', hacia: 'ejido' },
      { dir: 'O', hacia: 'colmenar' },
    ],
    npcs: [{ name: 'perpetua', x: 18, y: 12 }],
    objetos: [{ name: 'capa_encerada', x: 24, y: 16 }],
    monedas: 8,
    monedasX: 10,
    monedasY: 18,
    personalizar: ({ suelo, obstaculos }) => {
      // Pilas de cobre y acequia
      relleno(obstaculos, 14, 8, 12, 3, G.agua)
      relleno(obstaculos, 14, 7, 12, 1, G.aguaBorde)
      relleno(suelo, 12, 11, 16, 4, G.tablon)
    },
  })

  // colmenar: Bruna NPC, decisión colmena, 8 monedas, salida E (lavadero)
  generarMapa('brasa_vegaverde', 'colmenar', 'huerto', 20105, {
    salidas: [{ dir: 'E', hacia: 'lavadero' }],
    npcs: [{ name: 'bruna', x: 18, y: 12 }],
    eventos: [{ name: 'colmena', x: 18, y: 14 }],
    monedas: 8,
    monedasX: 8,
    monedasY: 8,
    personalizar: ({ suelo, obstaculos, decoracion }) => {
      // Cajones de colmenas
      relleno(suelo, 12, 8, 16, 12, G.cespedMata)
      relleno(obstaculos, 10, 10, 2, 2, G.muro)
      relleno(obstaculos, 10, 16, 2, 2, G.muro)
      relleno(obstaculos, 28, 10, 2, 2, G.muro)
      relleno(obstaculos, 28, 16, 2, 2, G.muro)
      relleno(decoracion, 16, 10, 8, 1, G.flores)
      relleno(decoracion, 16, 18, 8, 1, G.flores)
    },
  })
}

// ---------------------------------------------------------------------------
// 3. LA SAL Y LA CENIZA (9 MAPAS)
// ---------------------------------------------------------------------------

function generarSalYCeniza() {
  console.log('Generando mapas de sal_y_ceniza...')

  // rioclaro: Dorotea NPC, tienda, descanso, salida S (vado)
  generarMapa('sal_y_ceniza', 'rioclaro', 'aldea', 30101, {
    salidas: [{ dir: 'S', hacia: 'vado' }],
    npcs: [{ name: 'dorotea', x: 18, y: 10 }],
    descanso: true,
    descansoX: 24,
    descansoY: 10,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(suelo, 14, 6, 14, 8, G.tablon)
      relleno(obstaculos, 14, 6, 14, 1, G.muro)
      relleno(obstaculos, 14, 6, 1, 8, G.muro)
      relleno(obstaculos, 27, 6, 1, 8, G.muro)
      relleno(frente, 13, 4, 16, 3, G.tejado)
    },
  })

  // vado: gaviota, 6 monedas, salidas N (rioclaro), S (calzada)
  generarMapa('sal_y_ceniza', 'vado', 'camino', 30102, {
    salidas: [
      { dir: 'N', hacia: 'rioclaro' },
      { dir: 'S', hacia: 'calzada' },
    ],
    enemigos: [{ name: 'gaviota', x: 22, y: 12 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 16,
    personalizar: ({ suelo, obstaculos }) => {
      // Vado con cañas y agua poco profunda
      relleno(obstaculos, 4, 8, 10, 12, G.agua)
      relleno(suelo, 16, 0, 8, H, G.tierraPiedras)
    },
  })

  // calzada: gaviota, 8 monedas, cruce N (vado), E (faro), S (esteros)
  generarMapa('sal_y_ceniza', 'calzada', 'camino', 30103, {
    salidas: [
      { dir: 'N', hacia: 'vado' },
      { dir: 'E', hacia: 'faro' },
      { dir: 'S', hacia: 'esteros' },
    ],
    enemigos: [{ name: 'gaviota', x: 20, y: 12 }],
    monedas: 8,
    monedasX: 10,
    monedasY: 8,
    personalizar: ({ suelo, obstaculos }) => {
      // Calzada romana sobre el agua
      relleno(obstaculos, 0, 0, 16, 10, G.agua)
      relleno(obstaculos, 0, 18, 16, 10, G.agua)
      relleno(suelo, 16, 0, 8, H, G.tierraPiedras)
      relleno(suelo, 16, 11, W - 16, 5, G.tierraPiedras)
    },
  })

  // faro: Iseo NPC, decisión faro, salida O (calzada)
  generarMapa('sal_y_ceniza', 'faro', 'costa', 30104, {
    salidas: [{ dir: 'O', hacia: 'calzada' }],
    npcs: [{ name: 'iseo', x: 20, y: 12 }],
    eventos: [{ name: 'faro', x: 20, y: 14 }],
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Torre del faro
      relleno(suelo, 16, 6, 8, 8, G.tablon)
      relleno(obstaculos, 16, 6, 8, 1, G.muro)
      relleno(obstaculos, 16, 6, 1, 8, G.muro)
      relleno(obstaculos, 23, 6, 1, 8, G.muro)
      relleno(frente, 15, 4, 10, 3, G.tejado)
    },
  })

  // esteros: cangrejo, 6 monedas, salidas N (calzada), E (salinas), S (cauce)
  generarMapa('sal_y_ceniza', 'esteros', 'costa', 30105, {
    salidas: [
      { dir: 'N', hacia: 'calzada' },
      { dir: 'E', hacia: 'salinas' },
      { dir: 'S', hacia: 'cauce' },
    ],
    enemigos: [{ name: 'cangrejo', x: 18, y: 14 }],
    monedas: 6,
    monedasX: 6,
    monedasY: 6,
  })

  // cauce: perla_gris, 10 monedas, cangrejo, salida N (esteros)
  generarMapa('sal_y_ceniza', 'cauce', 'costa', 30106, {
    salidas: [{ dir: 'N', hacia: 'esteros' }],
    objetos: [{ name: 'perla_gris', x: 20, y: 16 }],
    enemigos: [{ name: 'cangrejo', x: 16, y: 12 }],
    monedas: 10,
    monedasX: 24,
    monedasY: 10,
  })

  // salinas: mirlo, 8 monedas, salidas O (esteros), E (casa_sal)
  generarMapa('sal_y_ceniza', 'salinas', 'costa', 30107, {
    salidas: [
      { dir: 'O', hacia: 'esteros' },
      { dir: 'E', hacia: 'casa_sal' },
    ],
    enemigos: [{ name: 'mirlo', x: 20, y: 12 }],
    monedas: 8,
    monedasX: 12,
    monedasY: 18,
    personalizar: ({ suelo, obstaculos }) => {
      // Cuadrículas de terrazas de sal
      relleno(suelo, 8, 6, 24, 16, G.tierraPiedras)
      relleno(obstaculos, 8, 13, 24, 1, G.cercaH)
      relleno(obstaculos, 19, 6, 1, 16, G.cercaV)
    },
  })

  // casa_sal: Maruxa NPC, jefe ahogado, tienda, salidas O (salinas), E (salina_vieja)
  generarMapa('sal_y_ceniza', 'casa_sal', 'costa', 30108, {
    salidas: [
      { dir: 'O', hacia: 'salinas' },
      { dir: 'E', hacia: 'salina_vieja' },
    ],
    npcs: [{ name: 'maruxa', x: 14, y: 12 }],
    enemigos: [{ name: 'ahogado', x: 26, y: 12 }],
    personalizar: ({ suelo, obstaculos, frente }) => {
      // Almacén de sal
      relleno(suelo, 10, 8, 20, 12, G.tablon)
      relleno(obstaculos, 10, 8, 20, 1, G.muro)
      relleno(frente, 9, 6, 22, 3, G.tejado)
    },
  })

  // salina_vieja: jefe viuda, gatillo final, salida O (casa_sal)
  generarMapa('sal_y_ceniza', 'salina_vieja', 'costa', 30109, {
    salidas: [{ dir: 'O', hacia: 'casa_sal' }],
    enemigos: [{ name: 'viuda', x: 22, y: 12 }],
    eventos: [{ name: 'final', x: 22, y: 6 }],
    personalizar: ({ suelo, obstaculos }) => {
      // Terraza profunda con ascua en el centro
      relleno(suelo, 14, 4, 16, 18, G.tierraPiedras)
      relleno(obstaculos, 20, 8, 4, 2, G.roca)
    },
  })
}

// ---------------------------------------------------------------------------
// 4. LA AGUJA SIN SOMBRA (13 MAPAS)
// ---------------------------------------------------------------------------

function generarAgujaSinSombra() {
  console.log('Generando mapas de aguja_sin_sombra...')

  // vegaverde: Oldo, Enebro, hogaza, 8 monedas, descanso, salida E (molino)
  generarMapa('aguja_sin_sombra', 'vegaverde', 'huerto', 40101, {
    salidas: [{ dir: 'E', hacia: 'molino' }],
    npcs: [
      { name: 'oldo', x: 10, y: 14 },
      { name: 'enebro', x: 12, y: 14 },
    ],
    objetos: [{ name: 'hogaza', x: 14, y: 20 }],
    monedas: 8,
    monedasX: 24,
    monedasY: 18,
    descanso: true,
    descansoX: 8,
    descansoY: 20,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(obstaculos, 5, 4, 9, 5, G.agua)
      relleno(obstaculos, 5, 3, 9, 1, G.aguaBorde)
      relleno(suelo, 6, 18, 10, 6, G.tablon)
      relleno(obstaculos, 6, 18, 10, 1, G.muro)
      relleno(obstaculos, 6, 18, 1, 6, G.muro)
      relleno(obstaculos, 15, 18, 1, 6, G.muro)
      relleno(frente, 5, 15, 12, 3, G.tejado)
    },
  })

  // molino: Tilo NPC, capitan_ceniza, 6 monedas, salidas O (vegaverde), E (encrucijada)
  generarMapa('aguja_sin_sombra', 'molino', 'camino', 40102, {
    salidas: [
      { dir: 'O', hacia: 'vegaverde' },
      { dir: 'E', hacia: 'encrucijada' },
    ],
    npcs: [{ name: 'tilo', x: 14, y: 12 }],
    enemigos: [{ name: 'capitan_ceniza', x: 26, y: 12 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 18,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(suelo, 18, 4, 8, 6, G.tablon)
      relleno(obstaculos, 18, 4, 8, 1, G.muro)
      relleno(obstaculos, 18, 4, 1, 6, G.muro)
      relleno(obstaculos, 25, 4, 1, 6, G.muro)
      relleno(frente, 17, 2, 10, 3, G.tejado)
    },
  })

  // encrucijada: sombra, 6 monedas, salidas O (molino), N (rioclaro), S (bosque)
  generarMapa('aguja_sin_sombra', 'encrucijada', 'camino', 40103, {
    salidas: [
      { dir: 'O', hacia: 'molino' },
      { dir: 'N', hacia: 'rioclaro' },
      { dir: 'S', hacia: 'bosque' },
    ],
    enemigos: [{ name: 'sombra', x: 20, y: 12 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 8,
    personalizar: ({ suelo, decoracion }) => {
      // Gran cruce empedrado y poste
      relleno(suelo, 16, 0, 8, H, G.tierraPiedras)
      relleno(suelo, 0, 11, W, 6, G.tierraPiedras)
      decoracion[14 * W + 18] = G.poste
    },
  })

  // rioclaro: Dorotea + Maruxa, descanso, tienda, salidas S (encrucijada), E (valoria)
  generarMapa('aguja_sin_sombra', 'rioclaro', 'aldea', 40104, {
    salidas: [
      { dir: 'S', hacia: 'encrucijada' },
      { dir: 'E', hacia: 'valoria' },
    ],
    npcs: [
      { name: 'dorotea', x: 16, y: 10 },
      { name: 'maruxa', x: 20, y: 10 },
    ],
    descanso: true,
    descansoX: 24,
    descansoY: 10,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(suelo, 14, 6, 14, 8, G.tablon)
      relleno(obstaculos, 14, 6, 14, 1, G.muro)
      relleno(obstaculos, 14, 6, 1, 8, G.muro)
      relleno(obstaculos, 27, 6, 1, 8, G.muro)
      relleno(frente, 13, 4, 16, 3, G.tejado)
    },
  })

  // valoria: Heraldo NPC, decisión estandarte, descanso, salidas O (rioclaro), N (barrok)
  generarMapa('aguja_sin_sombra', 'valoria', 'aldea', 40105, {
    salidas: [
      { dir: 'O', hacia: 'rioclaro' },
      { dir: 'N', hacia: 'barrok' },
    ],
    npcs: [{ name: 'heraldo', x: 20, y: 8 }],
    eventos: [{ name: 'estandarte', x: 20, y: 10 }],
    descanso: true,
    descansoX: 10,
    descansoY: 18,
    personalizar: ({ suelo, obstaculos, frente }) => {
      relleno(suelo, 14, 4, 12, 8, G.tablon)
      relleno(obstaculos, 14, 4, 12, 1, G.muro)
      relleno(obstaculos, 14, 4, 1, 8, G.muro)
      relleno(obstaculos, 25, 4, 1, 8, G.muro)
      relleno(frente, 13, 2, 14, 3, G.tejado)
    },
  })

  // bosque: mirlo, jerba, 6 monedas, salidas N (encrucijada), E (puente)
  generarMapa('aguja_sin_sombra', 'bosque', 'bosque', 40106, {
    salidas: [
      { dir: 'N', hacia: 'encrucijada' },
      { dir: 'E', hacia: 'puente' },
    ],
    enemigos: [{ name: 'mirlo', x: 24, y: 14 }],
    objetos: [{ name: 'jerba', x: 12, y: 8 }],
    monedas: 6,
    monedasX: 8,
    monedasY: 18,
  })

  // puente: espectro, 8 monedas, salidas O (bosque), N (refugio), E (cienagas)
  generarMapa('aguja_sin_sombra', 'puente', 'camino', 40107, {
    salidas: [
      { dir: 'O', hacia: 'bosque' },
      { dir: 'N', hacia: 'refugio' },
      { dir: 'E', hacia: 'cienagas' },
    ],
    enemigos: [{ name: 'espectro', x: 28, y: 14 }],
    monedas: 8,
    monedasX: 6,
    monedasY: 6,
    personalizar: ({ suelo, obstaculos }) => {
      for (let y = 0; y < H; y++) {
        relleno(obstaculos, 17, y, 6, 1, G.agua)
        suelo[y * W + 16] = G.aguaBorde
        suelo[y * W + 23] = G.aguaBorde
      }
      relleno(suelo, 16, 11, 8, 5, G.pasarela)
      relleno(obstaculos, 16, 11, 8, 0, 0)
    },
  })

  // refugio: Belthar NPC, descanso, salida S (puente)
  generarMapa('aguja_sin_sombra', 'refugio', 'torre', 40108, {
    salidas: [{ dir: 'S', hacia: 'puente' }],
    npcs: [{ name: 'belthar', x: 16, y: 10 }],
    descanso: true,
    descansoX: 24,
    descansoY: 9,
  })

  // barrok: Torkan NPC, trasgo, tienda, 12 monedas, salidas S (valoria), E (cienagas)
  generarMapa('aguja_sin_sombra', 'barrok', 'minas', 40109, {
    salidas: [
      { dir: 'S', hacia: 'valoria' },
      { dir: 'E', hacia: 'cienagas' },
    ],
    npcs: [{ name: 'torkan', x: 12, y: 14 }],
    enemigos: [{ name: 'trasgo', x: 24, y: 10 }],
    monedas: 12,
    monedasX: 8,
    monedasY: 18,
  })

  // cienagas: espectro, 12 monedas, salidas O (puente), N (barrok), E (yerma)
  generarMapa('aguja_sin_sombra', 'cienagas', 'cienagas', 40110, {
    salidas: [
      { dir: 'O', hacia: 'puente' },
      { dir: 'N', hacia: 'barrok' },
      { dir: 'E', hacia: 'yerma' },
    ],
    enemigos: [{ name: 'espectro', x: 20, y: 14 }],
    monedas: 12,
    monedasX: 10,
    monedasY: 6,
  })

  // yerma: 2 loberos, 20 monedas, requiere estandarte, salidas O (cienagas), E (aguja_pies)
  generarMapa('aguja_sin_sombra', 'yerma', 'yermos', 40111, {
    salidas: [
      { dir: 'O', hacia: 'cienagas' },
      { dir: 'E', hacia: 'aguja_pies' },
    ],
    enemigos: [
      { name: 'lobero', x: 14, y: 10 },
      { name: 'lobero', x: 26, y: 16 },
    ],
    monedas: 20,
    monedasX: 8,
    monedasY: 6,
  })

  // aguja_pies: mirlo, requiere campanilla, salidas O (yerma), E (aguja_cima)
  generarMapa('aguja_sin_sombra', 'aguja_pies', 'aguja', 40112, {
    salidas: [
      { dir: 'O', hacia: 'yerma' },
      { dir: 'E', hacia: 'aguja_cima' },
    ],
    enemigos: [{ name: 'mirlo', x: 20, y: 12 }],
  })

  // aguja_cima: eco_voz, capitan_rehecho, morvath, gatillo final, salida O (aguja_pies)
  generarMapa('aguja_sin_sombra', 'aguja_cima', 'aguja', 40113, {
    salidas: [{ dir: 'O', hacia: 'aguja_pies' }],
    enemigos: [
      { name: 'eco_voz', x: 16, y: 12 },
      { name: 'capitan_rehecho', x: 20, y: 12 },
      { name: 'morvath', x: 24, y: 12 },
    ],
    eventos: [{ name: 'final', x: 20, y: 6 }],
  })
}

// ---------------------------------------------------------------------------
// EJECUCIÓN
// ---------------------------------------------------------------------------

console.log('Generando los 39 mapas de Aldamar (Fase G)...')
generarCorazonCeniza()
generarBrasaVegaverde()
generarSalYCeniza()
generarAgujaSinSombra()
console.log('¡39 mapas generados con éxito!')
