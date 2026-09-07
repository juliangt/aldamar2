// Carteles del mundo — colocación de los carteles de destino sobre el mapa:
// en bifurcaciones (3+) un poste central con una tabla por camino; si no,
// un cartel junto a cada borde. Decorativos (sin cuerpo físico).
// Extraído de WorldScene; el cálculo de posiciones/nombres vive en
// core/Carteles.js y las texturas en mundo/texturas.js.

import Datos from '../../core/Datos.js'
import { partida } from '../../core/partida.js'
import { nombreCorto, posicionCartel, posicionPoste, ordenarTablas, flechaDe } from '../../core/Carteles.js'
import { texturaCanvas, dibujarPosteCartel } from './texturas.js'
import { FUENTE } from '../../ui/tema.js'

export function crearCarteles(escena, mapa, datosSalidas, capaObstaculos) {
  const salidas = (datosSalidas || []).filter((s) => s.props.hacia)
  if (!salidas.length) return
  const mapaPx = { width: mapa.widthInPixels, height: mapa.heightInPixels }
  if (salidas.length >= 3) {
    const esLibre = (x, y) => {
      const tile = capaObstaculos.getTileAtWorldXY(x, y)
      return !tile || !tile.properties?.colision
    }
    crearPosteBifurcacion(escena, salidas, mapaPx, esLibre)
  } else {
    for (const s of salidas) crearCartelSimple(escena, s, mapaPx)
  }
}

function crearCartelSimple(escena, s, mapaPx) {
  const { x, y } = posicionCartel(s, mapaPx)
  const flecha = flechaDe(s.dir)
  escena.add.image(x, y, 'cartel:poste').setOrigin(0.5, 1).setDepth(y)
  const dx = flecha === 'izquierda' ? -6 : flecha === 'derecha' ? 6 : 0
  pintarTabla(escena, x + dx, y - 12, flecha, s.props.hacia, y)
}

function crearPosteBifurcacion(escena, salidas, mapaPx, esLibre) {
  const filas = ordenarTablas(salidas)
  const n = filas.length
  const alto = 14 * n + 8
  const clave = texturaCanvas(escena, `cartel:poste:${n}`, 8, alto, (g) =>
    dibujarPosteCartel(g, alto)
  )
  const { x, y } = posicionPoste(mapaPx, esLibre)
  escena.add.image(x, y, clave).setOrigin(0.5, 1).setDepth(y)
  filas.forEach((s, i) => {
    const flecha = flechaDe(s.dir)
    const dx = flecha === 'izquierda' ? -10 : flecha === 'derecha' ? 10 : 0
    pintarTabla(escena, x + dx, y - alto + 10 + i * 14, flecha, s.props.hacia, y)
  })
}

// Tabla con el nombre corto del destino; el candado (✕ gris) y el color
// apagado avisan de puertas con `requiere` aún sin cumplir.
function pintarTabla(escena, x, y, flecha, hacia, prof) {
  const destino = Datos.lugar(escena.aventura, hacia)
  const cerrada = salidaBloqueada(destino)
  const forma = flecha === 'arriba' || flecha === 'abajo' ? 'plana' : flecha
  const tex = `cartel:tabla:${forma}${cerrada ? ':cerrada' : ''}`
  escena.add.image(x, y, tex).setDepth(prof)
  // Los triángulos de las tablas planas (N/S) se desplazan a un lado para
  // no perderse contra la columna del poste, del mismo color.
  if (flecha === 'arriba' || flecha === 'abajo')
    escena.add
      .image(x - 12, y + (flecha === 'arriba' ? -8 : 8), `cartel:tri:${flecha}`)
      .setDepth(prof)
  if (cerrada)
    escena.add
      .image(x + (forma === 'plana' ? 12 : 0), y + (flecha === 'arriba' ? 8 : -8), 'cartel:cruz')
      .setDepth(prof)
  // El texto se centra sobre el cuerpo del listón, no sobre la textura
  // completa (la punta desplaza el centro óptico).
  const dxTexto = forma === 'derecha' ? -4 : forma === 'izquierda' ? 4 : 0
  escena.add
    .text(x + dxTexto, y + 1, nombreCorto(destino) || hacia, {
      fontFamily: FUENTE,
      fontSize: '6px',
      color: cerrada ? '#8a8a8a' : '#e8d8a8',
    })
    .setOrigin(0.5)
    .setDepth(prof + 1)
}

export function salidaBloqueada(destino) {
  if (!destino?.requiere) return false
  return (
    !partida.inventario.includes(destino.requiere) && !partida.tieneFlag(destino.requiere)
  )
}
