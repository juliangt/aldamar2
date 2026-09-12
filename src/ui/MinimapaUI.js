// MinimapaUI — mapa miniatura translúcido en esquina para orientación en WorldScene.
// Muestra silueta del mapa, salidas y posición del jugador en tiempo real.
// Permite activar/desactivar desde configuraciones y se re-ubica al cambiar la vista.

import { VISTA } from '../core/resolucion.js'
import { obtenerMinimapaHabilitado } from '../core/opciones.js'

const MAX_W = 56
const MAX_H = 44
const PADDING = 3

export class MinimapaUI {
  constructor(escena, { mapaWidth = 640, mapaHeight = 448, salidas = [], capaObstaculos = null } = {}) {
    this.escena = escena
    this.mapaWidth = Math.max(1, mapaWidth)
    this.mapaHeight = Math.max(1, mapaHeight)
    this.salidas = salidas || []
    this.capaObstaculos = capaObstaculos

    // Dimensiones proporcionales dentro de MAX_W × MAX_H
    const escala = Math.min(MAX_W / this.mapaWidth, MAX_H / this.mapaHeight)
    this.miniW = Math.max(24, Math.round(this.mapaWidth * escala))
    this.miniH = Math.max(18, Math.round(this.mapaHeight * escala))

    const add = escena.add
    this.contenedor = add.container(0, 0).setDepth(1500)

    // 1. Fondo translúcido (alpha: 0.75) con borde de 1 px
    const anchoTotal = this.miniW + PADDING * 2
    const altoTotal = this.miniH + PADDING * 2
    this.fondo = add
      .rectangle(0, 0, anchoTotal, altoTotal, 0x0c1017, 0.75)
      .setStrokeStyle(1, 0x556070, 0.85)
      .setOrigin(0.5)
    this.contenedor.add(this.fondo)

    // 2. Gráficos de obstáculos estáticos (silueta del mapa)
    this.gfxObstaculos = add.graphics()
    this.contenedor.add(this.gfxObstaculos)
    this.dibujarObstaculos()

    // 3. Gráficos de salidas (puntos cardinales hacia dónde dirigirse)
    this.gfxSalidas = add.graphics()
    this.contenedor.add(this.gfxSalidas)
    this.dibujarSalidas()

    // 4. Marcador del jugador
    this.marcadorJugador = add
      .rectangle(0, 0, 4, 4, 0x55ff55, 0.95)
      .setStrokeStyle(1, 0xffffff, 1)
      .setOrigin(0.5)
    this.contenedor.add(this.marcadorJugador)

    // Estado inicial según preferencias persistidas (default: true)
    this.habilitado = obtenerMinimapaHabilitado()
    this.visible = this.habilitado
    this.setVisible(this.habilitado)

    this.relayout()
  }

  dibujarObstaculos() {
    if (!this.capaObstaculos || !this.gfxObstaculos) return
    this.gfxObstaculos.clear()
    this.gfxObstaculos.fillStyle(0x2a3648, 0.6)

    const layer = this.capaObstaculos.layer || this.capaObstaculos
    const data = layer.data || []
    const ox = -this.miniW / 2
    const oy = -this.miniH / 2

    const escalaX = this.miniW / this.mapaWidth
    const escalaY = this.miniH / this.mapaHeight

    for (let y = 0; y < data.length; y++) {
      const fila = data[y]
      if (!fila) continue
      for (let x = 0; x < fila.length; x++) {
        const tile = fila[x]
        if (!tile || tile.index === -1 || tile.index === 0) continue
        const colisiona = tile.collides || tile.properties?.colision
        if (colisiona) {
          const px = ox + (tile.pixelX !== undefined ? tile.pixelX : x * (tile.width || 16)) * escalaX
          const py = oy + (tile.pixelY !== undefined ? tile.pixelY : y * (tile.height || 16)) * escalaY
          const w = Math.max(1, (tile.width || 16) * escalaX)
          const h = Math.max(1, (tile.height || 16) * escalaY)
          this.gfxObstaculos.fillRect(px, py, w, h)
        }
      }
    }
  }

  dibujarSalidas() {
    if (!this.gfxSalidas) return
    this.gfxSalidas.clear()
    const ox = -this.miniW / 2
    const oy = -this.miniH / 2

    for (const salida of this.salidas) {
      const sx = ox + (salida.x / this.mapaWidth) * this.miniW
      const sy = oy + (salida.y / this.mapaHeight) * this.miniH
      this.gfxSalidas.fillStyle(0xe0c04a, 0.95)
      this.gfxSalidas.fillRect(sx - 2, sy - 2, 4, 4)
      this.gfxSalidas.lineStyle(1, 0xffffff, 0.9)
      this.gfxSalidas.strokeRect(sx - 2, sy - 2, 4, 4)
    }
  }

  // Actualiza la posición del jugador en coordenadas del mundo
  actualizar(jugadorX, jugadorY) {
    if (!this.habilitado || !this.visible) return
    const clampedX = Math.max(0, Math.min(this.mapaWidth, jugadorX))
    const clampedY = Math.max(0, Math.min(this.mapaHeight, jugadorY))
    const px = -this.miniW / 2 + (clampedX / this.mapaWidth) * this.miniW
    const py = -this.miniH / 2 + (clampedY / this.mapaHeight) * this.miniH
    this.marcadorJugador.setPosition(px, py)
  }

  // Re-posiciona el minimapa en la esquina superior derecha según la vista actual
  relayout() {
    const { width } = VISTA
    const anchoTotal = this.miniW + PADDING * 2
    const altoTotal = this.miniH + PADDING * 2
    const posX = width - (anchoTotal / 2 + 8)
    const posY = 56 + (altoTotal / 2)
    this.contenedor.setPosition(posX, posY)
  }

  setVisible(visible) {
    this.habilitado = visible
    this.contenedor.setVisible(visible)
  }

  destruir() {
    this.contenedor.destroy()
  }
}

export default MinimapaUI
