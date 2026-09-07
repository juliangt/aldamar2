// Escenario — fondo y texturas específicas del combate: banda de suelo 1-bit
// por bioma (redibujable al girar el dispositivo) y el sprite procedural del
// compañero. Extraído de BattleScene; las paletas por lugar viven en
// core/Sprites.js.

import { VISTA, esVistaVertical } from '../../core/resolucion.js'
import { BIOMAS_TONOS } from '../../core/Sprites.js'

// Banda de suelo 1-bit por bioma, redibujable al cambiar la orientación.
export function dibujarFondo(escena, lugarId) {
  escena.gfxFondo?.destroy()
  const g = escena.add.graphics().setDepth(0)
  escena.gfxFondo = g
  const { width, height } = VISTA
  const vertical = esVistaVertical()
  // Franja de escenario: en vertical el log/botones dejan ~115 px abajo.
  const sueloAlto = vertical ? height - 115 : 170
  const lineaY = vertical ? height - 130 : 148
  // Tono según el lugar.
  const tono = BIOMAS_TONOS[lugarId] ?? 0x14181c
  g.fillStyle(tono, 1).fillRect(0, 0, width, sueloAlto)
  g.lineStyle(1, 0x2a3038, 1).lineBetween(0, lineaY, width, lineaY)
  // Motivo simple de bioma: línea de horizonte + dientes de sierra.
  g.fillStyle(0x0a0d10, 0.6)
  for (let x = 0; x < width; x += 24) g.fillRect(x, lineaY - 4, 12, 4)
}

// Textura del compañero: viajero con túnica del color derivado de su id.
export function texturaSpriteCompanero(escena, id) {
  const clave = `companero:${id}`
  if (escena.textures.exists(clave)) return clave
  const colores = ['#4a7a5a', '#7a6a4a', '#5a6a7a']
  const color = colores[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % colores.length]
  const cv = document.createElement('canvas')
  cv.width = 16
  cv.height = 16
  const g = cv.getContext('2d')
  g.fillStyle = '#c8a06a'
  g.fillRect(5, 2, 6, 5) // cabeza
  g.fillStyle = color
  g.fillRect(4, 8, 8, 6) // cuerpo
  g.fillStyle = '#2a2a2a'
  g.fillRect(5, 14, 2, 2)
  g.fillRect(9, 14, 2, 2)
  escena.textures.addCanvas(clave, cv)
  return clave
}
