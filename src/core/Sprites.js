// Sprites.js — Sistema central de sprites, paletas y biomas (Fase G).
// Provee texturas dinámicas para los 11 héroes, todos los NPCs y enemigos
// de las 4 aventuras, y las paletas de combate por bioma.

export const BIOMAS_TONOS = {
  // Huerto falro (verde cálido / ocre)
  vegaverde: 0x1a2418,
  ejido: 0x202414,
  colmenar: 0x222616,
  lavadero: 0x18261e,

  // Camino y río (ocre / azul río)
  molino: 0x24200f,
  puente: 0x18202a,
  vado: 0x162228,
  calzada: 0x182028,
  encrucijada: 0x222016,

  // Bosque Umbrío (verde profundo)
  bosque: 0x14261c,

  // Aldea / ciudad (piedra clara / dorado)
  rioclaro: 0x1f2229,
  valoria: 0x282414,

  // Minas goran (azul piedra)
  minas: 0x1a1a22,
  barrok: 0x181828,

  // Ciénaga (verde grisáceo)
  cienagas: 0x1c2418,

  // Torre (gris cálido)
  refugio: 0x201c14,

  // Costa y salinas (azul sal / blanco)
  faro: 0x18222a,
  esteros: 0x162024,
  cauce: 0x1e2022,
  salinas: 0x22262a,
  casa_sal: 0x1c1e22,
  salina_vieja: 0x202428,

  // Yermos (gris ceniza con grietas rojas)
  yerma: 0x241a16,

  // Aguja (blanco pálido)
  aguja: 0x1c2028,
  aguja_pies: 0x202228,
  aguja_cima: 0x242630,

  // Volcán (rojo oscuro)
  umbak: 0x28160f,
  tejera: 0x2c140e,

  // Arena de combate
  arena: 0x181818,
}

export const PALETAS_HEROES = {
  // Corazón de Ceniza
  tilo: { piel: '#e8b98a', pelo: '#7a4a22', tunica: '#4f7f4a', tunicaOsc: '#3f663b', pantalon: '#5a4632' },
  ithel: { piel: '#f0c8a0', pelo: '#e0c060', tunica: '#2e5c2b', tunicaOsc: '#1e401c', pantalon: '#4a3e2a' },
  dagna: { piel: '#d8a070', pelo: '#332218', tunica: '#3a5a7a', tunicaOsc: '#283e54', pantalon: '#383838' },
  ruy: { piel: '#deb080', pelo: '#553311', tunica: '#8a6a3f', tunicaOsc: '#684d28', pantalon: '#443322' },

  // La Brasa de Vegaverde
  enebro: { piel: '#e8b98a', pelo: '#885522', tunica: '#689f48', tunicaOsc: '#4f7c32', pantalon: '#504030' },

  // La Sal y la Ceniza
  bruna: { piel: '#e4b080', pelo: '#5a3010', tunica: '#c49a38', tunicaOsc: '#987524', pantalon: '#483820' },
  gala: { piel: '#e8be94', pelo: '#2a2a38', tunica: '#2b5876', tunicaOsc: '#1e3d52', pantalon: '#3a4454' },
  tamara: { piel: '#dcb288', pelo: '#664433', tunica: '#8c9ea3', tunicaOsc: '#697a7e', pantalon: '#4a4440' },

  // La Aguja sin Sombra
  renco: { piel: '#d4a87a', pelo: '#777777', tunica: '#5a5e65', tunicaOsc: '#42454b', pantalon: '#34363a' },
  vela: { piel: '#ecc098', pelo: '#4a6a40', tunica: '#3d6e50', tunicaOsc: '#2c5039', pantalon: '#3e3832' },
  bram: { piel: '#caa078', pelo: '#402818', tunica: '#2d4b68', tunicaOsc: '#1e3348', pantalon: '#2a2a2a' },
}

export const PALETAS_ENEMIGOS = {
  lobo: { principal: '#5a5a6a', ojos: '#c03030', secundario: '#3a3a46' },
  espectro: { principal: '#8a9ab0', ojos: '#e8f0ff', secundario: '#6a7a90' },
  trasgo: { principal: '#7a8a4a', ojos: '#e0c04a', secundario: '#586834' },
  lobero: { principal: '#6a5a4a', ojos: '#d84030', secundario: '#4a3a2a' },
  capitan: { principal: '#9a6a5a', ojos: '#0a0a0a', secundario: '#683a2a' },
  custodio: { principal: '#b0c0c8', ojos: '#d8d8d8', secundario: '#788890' },
  mirlo: { principal: '#242430', ojos: '#e0a020', secundario: '#383844' },
  ahumado: { principal: '#8a4a2a', ojos: '#ff4422', secundario: '#5a2a14' },
  gaviota: { principal: '#d8e0e8', ojos: '#202020', secundario: '#98a8b8' },
  cangrejo: { principal: '#b84433', ojos: '#101010', secundario: '#782418' },
  ahogado: { principal: '#3a6070', ojos: '#60a0b0', secundario: '#224050' },
  viuda: { principal: '#382840', ojos: '#e0d8e8', secundario: '#201628' },
  sombra: { principal: '#202028', ojos: '#8090a8', secundario: '#101018' },
  capitan_ceniza: { principal: '#8a5a50', ojos: '#1a1010', secundario: '#5a3830' },
  capitan_rehecho: { principal: '#4a3440', ojos: '#e04040', secundario: '#2a1a24' },
  eco_voz: { principal: '#a0b8d0', ojos: '#ffffff', secundario: '#7088a0' },
  morvath: { principal: '#421438', ojos: '#ff3060', secundario: '#240820' },
}

export const PALETAS_NPCS = {
  oldo: { piel: '#c8a06a', pelo: '#e0e0e0', tunica: '#8a6a3f', baston: '#e0c04a' },
  perpetua: { piel: '#c8a06a', pelo: '#d0d0d0', tunica: '#3a5a7a', baston: '#5d8fc0' },
  iseo: { piel: '#b8a088', pelo: '#7a7a88', tunica: '#2b4458', baston: '#e0c04a' },
  maruxa: { piel: '#b08858', pelo: '#222222', tunica: '#6a5a4a', baston: '#c0b898' },
  heraldo: { piel: '#e8b98a', pelo: '#e0c060', tunica: '#b8922e', baston: '#ffffff' },
  bruna: { piel: '#e4b080', pelo: '#5a3010', tunica: '#c49a38', baston: '#e0c04a' },
  belthar: { piel: '#c8a06a', pelo: '#5a3a20', tunica: '#3e5a3e', baston: '#6b4a2a' },
  dorotea: { piel: '#d4a87a', pelo: '#6a4a2a', tunica: '#7a3030', baston: '#d8d0b0' },
  torkan: { piel: '#caa078', pelo: '#402818', tunica: '#3a4a5a', baston: '#8a8a95' },
  aldric: { piel: '#deb080', pelo: '#553311', tunica: '#b08a4f', baston: '#ffffff' },
  sylvana: { piel: '#f0c8a0', pelo: '#e0c060', tunica: '#2e5c2b', baston: '#3c7238' },
  enebro: { piel: '#e8b98a', pelo: '#885522', tunica: '#689f48', baston: '#e0c04a' },
  tilo: { piel: '#e8b98a', pelo: '#7a4a22', tunica: '#4f7f4a', baston: '#8a8a8a' },
}

function obtenerCanvas(ancho, alto) {
  if (typeof document !== 'undefined' && document.createElement) {
    const cv = document.createElement('canvas')
    cv.width = ancho
    cv.height = alto
    return cv
  }
  return {
    width: ancho,
    height: alto,
    getContext: () => ({
      fillStyle: '',
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
    }),
  }
}

export function crearTexturaHeroe(scene, heroeId = 'tilo') {
  const clave = `heroe:${heroeId}`
  if (scene.textures.exists(clave)) return clave

  const P = PALETAS_HEROES[heroeId] || PALETAS_HEROES.tilo
  const HS = 16
  const cv = obtenerCanvas(HS * 3, HS * 3)
  const ctx = cv.getContext('2d')

  function dibujarHeroe(fila, col, piernas) {
    const x = col * HS
    const y = fila * HS

    const rect = (rx, ry, rw, rh, c) => {
      ctx.fillStyle = c
      ctx.fillRect(x + rx, y + ry, rw, rh)
    }
    const px = (pxX, pxY, c) => {
      ctx.fillStyle = c
      ctx.fillRect(x + pxX, y + pxY, 1, 1)
    }

    // Cabeza (fila 2–6)
    rect(5, 2, 6, 5, P.piel)
    rect(5, 1, 6, 2, P.pelo)
    px(4, 2, P.pelo)
    px(11, 2, P.pelo)

    if (fila === 0) {
      // Abajo
      px(6, 4, '#222')
      px(9, 4, '#222')
    } else if (fila === 2) {
      // Lado
      px(9, 4, '#222')
      rect(5, 2, 2, 3, P.pelo)
    } else {
      // Arriba
      rect(5, 2, 6, 3, P.pelo)
    }

    // Torso (túnica, filas 7–11)
    rect(4, 7, 8, 5, P.tunica)
    rect(4, 11, 8, 1, P.tunicaOsc)

    // Brazos
    px(3, 8, P.piel)
    px(12, 8, P.piel)
    if (fila === 2) {
      ctx.clearRect(x + 3, y + 8, 1, 1)
    }

    // Piernas según fase
    const [pi, pd] = piernas
    rect(5, 12 + pi, 2, 3 - pi, P.pantalon)
    rect(9, 12 + pd, 2, 3 - pd, P.pantalon)
    rect(5, 14 + pi, 2, 1, '#3e2e1c')
    rect(9, 14 + pd, 2, 1, '#3e2e1c')
  }

  dibujarHeroe(0, 0, [0, 0])
  dibujarHeroe(0, 1, [-1, 1])
  dibujarHeroe(0, 2, [1, -1])
  dibujarHeroe(1, 0, [0, 0])
  dibujarHeroe(1, 1, [-1, 1])
  dibujarHeroe(1, 2, [1, -1])
  dibujarHeroe(2, 0, [0, 0])
  dibujarHeroe(2, 1, [-1, 0])
  dibujarHeroe(2, 2, [1, 0])

  scene.textures.addSpriteSheet(clave, cv, { frameWidth: 16, frameHeight: 16 })
  return clave
}

export function crearTexturaEnemigo(scene, enemigoId) {
  const clave = `enemigo:${enemigoId}`
  if (scene.textures.exists(clave)) return clave

  const pal = PALETAS_ENEMIGOS[enemigoId] || {
    principal: '#7a7a8a',
    ojos: '#c03030',
    secundario: '#4a4a5a',
  }
  const cv = obtenerCanvas(16, 16)
  const g = cv.getContext('2d')

  // Silueta detallada 1-bit según tipo
  if (enemigoId === 'mirlo' || enemigoId === 'gaviota') {
    // Aves
    g.fillStyle = pal.principal
    g.fillRect(4, 5, 8, 6) // cuerpo
    g.fillRect(8, 2, 4, 4) // cabeza
    g.fillStyle = pal.ojos
    g.fillRect(10, 3, 1, 1) // ojo
    g.fillStyle = '#e0a020'
    g.fillRect(12, 4, 3, 2) // pico
    g.fillStyle = pal.secundario
    g.fillRect(2, 7, 5, 3) // cola / ala
    g.fillRect(6, 11, 2, 3) // patas
  } else if (enemigoId === 'cangrejo') {
    // Cangrejo
    g.fillStyle = pal.principal
    g.fillRect(3, 5, 10, 6) // caparazón
    g.fillStyle = pal.secundario
    g.fillRect(1, 3, 3, 3) // pinza izq
    g.fillRect(12, 3, 3, 3) // pinza der
    g.fillStyle = pal.ojos
    g.fillRect(5, 4, 2, 2)
    g.fillRect(9, 4, 2, 2)
    g.fillStyle = '#111111'
    g.fillRect(2, 11, 2, 3) // patas
    g.fillRect(12, 11, 2, 3)
  } else {
    // Humanoide / bestia
    g.fillStyle = pal.principal
    g.fillRect(4, 2, 8, 6) // cabeza
    g.fillStyle = pal.ojos
    g.fillRect(5, 4, 2, 2)
    g.fillRect(9, 4, 2, 2)
    g.fillStyle = pal.principal
    g.fillRect(3, 8, 10, 6) // cuerpo
    g.fillStyle = pal.secundario
    g.fillRect(4, 14, 3, 2) // pies
    g.fillRect(9, 14, 3, 2)
  }

  scene.textures.addCanvas(clave, cv)
  return clave
}

export function crearTexturaNpc(scene, npcId) {
  const clave = `npc:${npcId}`
  if (scene.textures.exists(clave)) return clave

  const pal = PALETAS_NPCS[npcId] || {
    piel: '#c8a06a',
    pelo: '#5a3a20',
    tunica: '#3e5a3e',
    baston: '#8a8a8a',
  }

  const cv = obtenerCanvas(32, 16)
  const g = cv.getContext('2d')

  const px = (x, y, w, h, c) => {
    g.fillStyle = c
    g.fillRect(x, y, w, h)
  }

  for (const f of [0, 1]) {
    const ox = f * 16
    px(ox + 5, 2, 6, 5, pal.piel) // cabeza
    px(ox + 5, 1, 6, 2, pal.pelo) // pelo
    px(ox + 4, 7, 8, 6, pal.tunica) // túnica
    px(ox + 5 + f, 13, 2, 3, '#2a2a2a') // piernas
    px(ox + 9 - f, 13, 2, 3, '#2a2a2a')
    px(ox + 12, 4 + f, 2, 11, pal.baston) // bastón o apero
  }

  scene.textures.addCanvas(clave, cv)
  return clave
}
