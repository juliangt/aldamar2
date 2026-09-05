// gen-tileset.mjs — genera public/tilesets/tiny_dungeon.png (24 tiles de
// 16×16, 8 columnas × 3 filas) y src/assets/heroe.png (spritesheet 3×3 de
// 16×16: abajo, arriba, lado; el lado izquierdo va espejado en juego).
// Ejecutar: node tools/gen-tileset.mjs

import { escribirPng, lienzo, px, rect } from './png.mjs'
import fs from 'node:fs'

const T = 16
const COLS = 8
const FILAS = 3

// Paleta (verde/ocre, bioma huerto/camino).
const P = {
  cesped: '#4a8a46',
  cespedOsc: '#3d7339',
  cespedClaro: '#57a052',
  tierra: '#b08a4f',
  tierraOsc: '#96733f',
  agua: '#3a6ea5',
  aguaClara: '#5d8fc0',
  aguaOscura: '#2f5a8a',
  tronco: '#6b4a2a',
  copa: '#2e5c2b',
  copaClara: '#3c7238',
  roca: '#8a8a95',
  rocaOscura: '#6e6e78',
  florR: '#d4574e',
  florA: '#e0c04a',
  madera: '#8a6a3f',
  maderaOscura: '#6f5430',
  pared: '#7d7d89',
  paredOscura: '#63636e',
  techo: '#a04a3a',
  techoOscuro: '#83392c',
  piel: '#e8b98a',
  túnica: '#4f7f4a',
  túnicaOscura: '#3f663b',
  pantalon: '#5a4632',
  pelo: '#7a4a22',
  bota: '#3e2e1c',
}

const l = lienzo(COLS * T, FILAS * T, '#00000000')

function celda(idx, pintar) {
  const ox = (idx % COLS) * T
  const oy = Math.floor(idx / COLS) * T
  pintar(ox, oy)
}

// id 0 (gid 1): césped base con moteado.
celda(0, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  for (let i = 0; i < 10; i++) {
    const dx = (i * 7 + 3) % T
    const dy = (i * 5 + 1) % T
    px(l, COLS * T, x + dx, y + dy, P.cespedOsc)
  }
})

// id 1 (gid 2): césped con matas.
celda(1, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  for (let i = 0; i < 4; i++) {
    const dx = 2 + i * 4
    const dy = 5 + ((i * 5) % 7)
    px(l, COLS * T, x + dx, y + dy, P.cespedClaro)
    px(l, COLS * T, x + dx, y + dy - 1, P.cespedClaro)
    px(l, COLS * T, x + dx + 1, y + dy, P.cespedOsc)
  }
})

// id 2 (gid 3): camino de tierra.
celda(2, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.tierra)
  for (let i = 0; i < 12; i++) {
    const dx = (i * 5 + 2) % T
    const dy = (i * 3 + 4) % T
    px(l, COLS * T, x + dx, y + dy, P.tierraOsc)
  }
})

// id 3 (gid 4): tierra con piedritas.
celda(3, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.tierra)
  px(l, COLS * T, x + 4, y + 6, P.rocaOscura)
  px(l, COLS * T, x + 5, y + 6, P.roca)
  px(l, COLS * T, x + 11, y + 11, P.roca)
  px(l, COLS * T, x + 12, y + 11, P.rocaOscura)
})

// id 4 (gid 5): agua.
celda(4, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.agua)
  for (let w = 0; w < 2; w++) {
    const wy = y + 3 + w * 7
    for (let dx = 0; dx < T; dx += 4)
      px(l, COLS * T, x + dx + w * 2, wy, P.aguaClara)
    for (let dx = 0; dx < T; dx += 6)
      px(l, COLS * T, x + dx + 2 + w * 3, wy + 3, P.aguaOscura)
  }
})

// id 5 (gid 6): borde césped→agua (fila superior de césped).
celda(5, (x, y) => {
  rect(l, COLS * T, x, y, T, 4, P.cesped)
  rect(l, COLS * T, x, y + 4, T, T - 4, P.agua)
  for (let dx = 0; dx < T; dx += 3) px(l, COLS * T, x + dx, y + 4, P.aguaOscura)
})

// id 6 (gid 7): cercado horizontal.
celda(6, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x, y + 6, T, 2, P.madera)
  rect(l, COLS * T, x, y + 11, T, 2, P.madera)
  rect(l, COLS * T, x + 3, y + 4, 3, 9, P.maderaOscura)
  rect(l, COLS * T, x + 11, y + 4, 3, 9, P.maderaOscura)
})

// id 7 (gid 8): cercado vertical.
celda(7, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x + 7, y, 2, T, P.madera)
  rect(l, COLS * T, x + 5, y + 2, 6, 2, P.maderaOscura)
  rect(l, COLS * T, x + 5, y + 12, 6, 2, P.maderaOscura)
})

// id 8 (gid 9): árbol.
celda(8, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x + 7, y + 10, 2, 5, P.tronco)
  // copa
  rect(l, COLS * T, x + 3, y + 1, 10, 3, P.copa)
  rect(l, COLS * T, x + 2, y + 3, 12, 4, P.copa)
  rect(l, COLS * T, x + 3, y + 7, 10, 3, P.copa)
  for (let dx = 4; dx < 12; dx += 3)
    px(l, COLS * T, x + dx, y + 2, P.copaClara)
  px(l, COLS * T, x + 5, y + 5, P.copaClara)
  px(l, COLS * T, x + 9, y + 6, P.copaClara)
})

// id 9 (gid 10): roca.
celda(9, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x + 3, y + 6, 10, 7, P.roca)
  rect(l, COLS * T, x + 5, y + 4, 6, 2, P.roca)
  rect(l, COLS * T, x + 3, y + 12, 10, 1, P.rocaOscura)
  px(l, COLS * T, x + 6, y + 6, P.rocaOscura)
  px(l, COLS * T, x + 7, y + 6, P.rocaOscura)
})

// id 10 (gid 11): flores (decoración).
celda(10, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  const flores = [
    [3, 4, P.florR],
    [10, 5, P.florA],
    [6, 10, P.florA],
    [12, 11, P.florR],
  ]
  for (const [fx, fy, c] of flores) {
    px(l, COLS * T, x + fx, y + fy, c)
    px(l, COLS * T, x + fx + 1, y + fy, c)
    px(l, COLS * T, x + fx, y + fy + 1, c)
    px(l, COLS * T, x + fx + 1, y + fy + 1, c)
    px(l, COLS * T, x + fx, y + fy + 2, P.cespedOsc)
  }
})

// id 11 (gid 12): arbusto.
celda(11, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x + 3, y + 5, 10, 8, P.copa)
  rect(l, COLS * T, x + 5, y + 3, 6, 2, P.copa)
  px(l, COLS * T, x + 6, y + 6, P.copaClara)
  px(l, COLS * T, x + 9, y + 8, P.copaClara)
})

// id 12 (gid 13): muro de piedra.
celda(12, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.pared)
  for (let fy = 0; fy < T; fy += 4) {
    rect(l, COLS * T, x, y + fy, T, 1, P.paredOscura)
    const offset = (fy / 4) % 2 ? 0 : 4
    for (let fx = offset; fx < T; fx += 8)
      rect(l, COLS * T, x + fx, y + fy, 1, 4, P.paredOscura)
  }
})

// id 13 (gid 14): suelo de tablones.
celda(13, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.madera)
  for (let fy = 0; fy < T; fy += 4) rect(l, COLS * T, x, y + fy, T, 1, P.maderaOscura)
  rect(l, COLS * T, x + 7, y, 1, 4, P.maderaOscura)
  rect(l, COLS * T, x + 13, y + 8, 1, 4, P.maderaOscura)
})

// id 14 (gid 15): tejado (capa «frente»).
celda(14, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.techo)
  for (let fy = 0; fy < T; fy += 4) {
    rect(l, COLS * T, x, y + fy, T, 1, P.techoOscuro)
    for (let fx = (fy / 4) % 2 ? 2 : 0; fx < T; fx += 4)
      px(l, COLS * T, x + fx, y + fy + 2, P.techoOscuro)
  }
})

// id 15 (gid 16): pasarela horizontal sobre agua.
celda(15, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.agua)
  rect(l, COLS * T, x, y + 2, T, 12, P.madera)
  rect(l, COLS * T, x, y + 2, T, 1, P.maderaOscura)
  rect(l, COLS * T, x, y + 13, T, 1, P.maderaOscura)
  for (let fx = 3; fx < T; fx += 6) rect(l, COLS * T, x + fx, y + 2, 1, 12, P.maderaOscura)
})

// id 16 (gid 17): hierba alta (decoración).
celda(16, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  for (let bx = 2; bx < T - 1; bx += 3) {
    for (let h = 0; h < 6 + (bx % 3); h++)
      px(l, COLS * T, x + bx + (h % 2), y + T - 3 - h, P.cespedClaro)
  }
})

// id 17 (gid 18): poste indicador.
celda(17, (x, y) => {
  rect(l, COLS * T, x, y, T, T, P.cesped)
  rect(l, COLS * T, x + 7, y + 5, 2, 10, P.maderaOscura)
  rect(l, COLS * T, x + 3, y + 5, 10, 4, P.madera)
  rect(l, COLS * T, x + 3, y + 5, 10, 1, P.maderaOscura)
})

fs.mkdirSync('public/tilesets', { recursive: true })
escribirPng('public/tilesets/tiny_dungeon.png', COLS * T, FILAS * T, l)

// ---------------------------------------------------------------------------
// Spritesheet del héroe: 3 columnas (reposo, paso A, paso B) × 3 filas
// (abajo, arriba, lado derecho; izquierda = flipX). 48×48.
// ---------------------------------------------------------------------------

const HS = 16
const hc = lienzo(HS * 3, HS * 3, '#00000000')

function heroe(fila, col, piernas) {
  const x = col * HS
  const y = fila * HS
  // cabeza (fila 2–6)
  rect(hc, HS * 3, x + 5, y + 2, 6, 5, P.piel)
  rect(hc, HS * 3, x + 5, y + 1, 6, 2, P.pelo)
  px(hc, HS * 3, x + 4, y + 2, P.pelo)
  px(hc, HS * 3, x + 11, y + 2, P.pelo)
  if (fila === 0) {
    // abajo: cara visible con ojos
    px(hc, HS * 3, x + 6, y + 4, '#222')
    px(hc, HS * 3, x + 9, y + 4, '#222')
  } else if (fila === 2) {
    // lado: un ojo y perfil de pelo
    px(hc, HS * 3, x + 9, y + 4, '#222')
    rect(hc, HS * 3, x + 5, y + 2, 2, 3, P.pelo)
  } else {
    // arriba: nuca de pelo
    rect(hc, HS * 3, x + 5, y + 2, 6, 3, P.pelo)
  }
  // torso (túnica, filas 7–11)
  rect(hc, HS * 3, x + 4, y + 7, 8, 5, P.túnica)
  rect(hc, HS * 3, x + 4, y + 11, 8, 1, P.túnicaOscura)
  // brazos
  px(hc, HS * 3, x + 3, y + 8, P.piel)
  px(hc, HS * 3, x + 12, y + 8, P.piel)
  if (fila === 2) {
    // lado: un solo brazo visible
    px(hc, HS * 3, x + 3, y + 8, '#00000000')
  }
  // piernas (filas 12–14) según fase del paso
  const [pi, pd] = piernas
  rect(hc, HS * 3, x + 5, y + 12 + pi, 2, 3 - pi, P.pantalon)
  rect(hc, HS * 3, x + 9, y + 12 + pd, 2, 3 - pd, P.pantalon)
  rect(hc, HS * 3, x + 5, y + 14 + pi, 2, 1, P.bota)
  rect(hc, HS * 3, x + 9, y + 14 + pd, 2, 1, P.bota)
}

heroe(0, 0, [0, 0]) // abajo reposo
heroe(0, 1, [-1, 1]) // abajo paso A
heroe(0, 2, [1, -1]) // abajo paso B
heroe(1, 0, [0, 0]) // arriba reposo
heroe(1, 1, [-1, 1])
heroe(1, 2, [1, -1])
heroe(2, 0, [0, 0]) // lado reposo
heroe(2, 1, [-1, 0])
heroe(2, 2, [1, 0])

escribirPng('src/assets/heroe.png', HS * 3, HS * 3, hc)
console.log('tileset + héroe listos')
