// MinimapaUI — mapa miniatura translúcido en esquina para orientación en WorldScene.
// Soporta dos modos:
//   1. 'local': silueta de obstáculos de la pantalla actual, salidas y héroe en tiempo real.
//   2. 'aventura': grafo global de pantallas de la aventura con distancia y ruta al destino final.
// Permite alternar tocando el minimapa, mediante tecla M o desde configuraciones de PausaUI.

import { VISTA } from '../core/resolucion.js'
import {
  obtenerMinimapaHabilitado,
  obtenerModoMinimapa,
  guardarModoMinimapa,
} from '../core/opciones.js'
import { calcularGrafoAventura } from '../core/aventuraGrafo.js'
import { audio8 } from '../core/Audio8.js'
import { FUENTE } from './tema.js'

const MAX_W_LOCAL = 56
const MAX_H_LOCAL = 44
const PADDING = 3

const ANCHO_AVENTURA = 96
const ALTO_AVENTURA = 64

export class MinimapaUI {
  constructor(
    escena,
    {
      mapaWidth = 640,
      mapaHeight = 448,
      salidas = [],
      capaObstaculos = null,
      aventuraId = null,
      lugarId = null,
      vistos = {},
      onModoChange = null,
    } = {}
  ) {
    this.escena = escena
    this.mapaWidth = Math.max(1, mapaWidth)
    this.mapaHeight = Math.max(1, mapaHeight)
    this.salidas = salidas || []
    this.capaObstaculos = capaObstaculos
    this.aventuraId = aventuraId
    this.lugarId = lugarId
    this.vistos = vistos || {}
    this.onModoChange = onModoChange

    // Dimensiones en modo local
    const escala = Math.min(MAX_W_LOCAL / this.mapaWidth, MAX_H_LOCAL / this.mapaHeight)
    this.miniW = Math.max(24, Math.round(this.mapaWidth * escala))
    this.miniH = Math.max(18, Math.round(this.mapaHeight * escala))
    this.anchoLocal = this.miniW + PADDING * 2
    this.altoLocal = this.miniH + PADDING * 2

    // Dimensiones en modo aventura
    this.anchoAventura = ANCHO_AVENTURA
    this.altoAventura = ALTO_AVENTURA

    // Modo activo ('local' | 'aventura')
    this.modo = obtenerModoMinimapa()

    const add = escena.add
    this.contenedor = add.container(0, 0).setDepth(1500)

    // 1. Fondo translúcido con borde
    this.fondo = add
      .rectangle(0, 0, this.anchoLocal, this.altoLocal, 0x0c1017, 0.75)
      .setStrokeStyle(1, 0x556070, 0.85)
      .setOrigin(0.5)
    this.contenedor.add(this.fondo)

    // 2. Elementos específicos de Modo Local
    this.gfxObstaculos = add.graphics()
    this.gfxSalidas = add.graphics()
    this.marcadorJugador = add
      .rectangle(0, 0, 4, 4, 0x55ff55, 0.95)
      .setStrokeStyle(1, 0xffffff, 1)
      .setOrigin(0.5)
    this.contenedor.add([this.gfxObstaculos, this.gfxSalidas, this.marcadorJugador])

    this.dibujarObstaculos()
    this.dibujarSalidas()

    // 3. Elementos específicos de Modo Aventura
    this.gfxGrafo = add.graphics()
    this.txtAventuraLugar = add
      .text(0, -this.altoAventura / 2 + 7, '', {
        fontFamily: FUENTE,
        fontSize: '5px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)

    this.txtAventuraInfo = add
      .text(0, this.altoAventura / 2 - 7, '', {
        fontFamily: FUENTE,
        fontSize: '5px',
        color: '#9ad09a',
      })
      .setOrigin(0.5)

    this.contenedor.add([this.gfxGrafo, this.txtAventuraLugar, this.txtAventuraInfo])

    // 4. Etiqueta indicadora de modo (clickable hint)
    this.txtTagModo = add
      .text(0, 0, '', {
        fontFamily: FUENTE,
        fontSize: '4px',
        color: '#7088a8',
      })
      .setOrigin(0.5)
    this.contenedor.add(this.txtTagModo)

    // 5. Zona interactiva para alternar modo con tap/clic directo
    this.zonaClick = add.zone(0, 0, this.anchoLocal, this.altoLocal).setInteractive()
    this.zonaClick.on('pointerdown', () => this.alternarModo())
    this.contenedor.add(this.zonaClick)

    // Estado inicial de visibilidad
    this.habilitado = obtenerMinimapaHabilitado()
    this.visible = this.habilitado
    this.setVisible(this.habilitado)

    this.actualizarVisualesModo()
    this.relayout()
  }

  setLugarInfo(aventuraId, lugarId, vistos = {}) {
    this.aventuraId = aventuraId
    this.lugarId = lugarId
    this.vistos = vistos
    if (this.modo === 'aventura') {
      this.dibujarGrafoAventura()
    }
  }

  alternarModo() {
    audio8.sfx('confirmar')
    const siguiente = this.modo === 'local' ? 'aventura' : 'local'
    this.setModo(siguiente)
  }

  setModo(nuevoModo) {
    const normalizado = nuevoModo === 'aventura' ? 'aventura' : 'local'
    this.modo = normalizado
    guardarModoMinimapa(normalizado)
    this.actualizarVisualesModo()
    this.relayout()
    this.onModoChange?.(normalizado)
  }

  actualizarVisualesModo() {
    const esLocal = this.modo === 'local'
    const w = esLocal ? this.anchoLocal : this.anchoAventura
    const h = esLocal ? this.altoLocal : this.altoAventura

    this.fondo.setSize(w, h)
    this.zonaClick.setSize(w, h)

    // Visibilidad por modo
    this.gfxObstaculos.setVisible(esLocal)
    this.gfxSalidas.setVisible(esLocal)
    this.marcadorJugador.setVisible(esLocal)

    this.gfxGrafo.setVisible(!esLocal)
    this.txtAventuraLugar.setVisible(!esLocal)
    this.txtAventuraInfo.setVisible(!esLocal)

    if (esLocal) {
      this.txtTagModo.setText('SALA')
      this.txtTagModo.setPosition(0, -this.altoLocal / 2 + 5)
    } else {
      this.txtTagModo.setText('AVENTURA')
      this.txtTagModo.setPosition(0, -this.altoAventura / 2 + 7)
      this.txtAventuraLugar.setPosition(0, -this.altoAventura / 2 + 16)
      this.dibujarGrafoAventura()
    }
  }

  dibujarGrafoAventura() {
    if (!this.gfxGrafo || !this.aventuraId) return
    this.gfxGrafo.clear()

    const grafo = calcularGrafoAventura(this.aventuraId, this.lugarId, this.vistos)
    if (!grafo) return

    // Título / Nombre del lugar actual
    const nodoActual = grafo.nodosPorId[this.lugarId]
    const nombreLugar = nodoActual ? nodoActual.nombreCorto : this.lugarId || ''
    this.txtAventuraLugar.setText(nombreLugar.toUpperCase())

    // Información del destino final (sin texto de "faltan x pantallas")
    const nodoFinal = grafo.nodosPorId[grafo.finalId]
    const nombreFinal = nodoFinal ? nodoFinal.nombreCorto : grafo.finalId || ''
    if (this.lugarId === grafo.finalId) {
      this.txtAventuraInfo.setText('¡ZONA FINAL!')
      this.txtAventuraInfo.setColor('#e0c04a')
    } else if (nombreFinal) {
      this.txtAventuraInfo.setText(`DESTINO: ${nombreFinal.toUpperCase()}`)
      this.txtAventuraInfo.setColor('#e0c04a')
    } else {
      this.txtAventuraInfo.setText('')
    }

    // Área del grafo dentro de la caja de aventura (centrado verticalmente)
    const anchoGrafo = this.anchoAventura - 20
    const altoGrafo = 22
    const centroY = 2

    // 1. Dibujar conexiones
    for (const con of grafo.conexiones) {
      const x1 = con.desde.normX * anchoGrafo
      const y1 = centroY + con.desde.normY * altoGrafo
      const x2 = con.hacia.normX * anchoGrafo
      const y2 = centroY + con.hacia.normY * altoGrafo

      if (con.enCaminoFinal) {
        this.gfxGrafo.lineStyle(1, 0xe0c04a, 0.95)
      } else {
        this.gfxGrafo.lineStyle(1, 0x303d4e, 0.7)
      }

      this.gfxGrafo.beginPath()
      this.gfxGrafo.moveTo(x1, y1)
      this.gfxGrafo.lineTo(x2, y2)
      this.gfxGrafo.strokePath()
    }

    // 2. Dibujar nodos
    for (const nodo of grafo.nodos) {
      const nx = nodo.normX * anchoGrafo
      const ny = centroY + nodo.normY * altoGrafo

      if (nodo.esActual) {
        // Jugador actual: verde brillante 5×5
        this.gfxGrafo.fillStyle(0x55ff55, 1)
        this.gfxGrafo.fillRect(nx - 2.5, ny - 2.5, 5, 5)
        this.gfxGrafo.lineStyle(1, 0xffffff, 1)
        this.gfxGrafo.strokeRect(nx - 2.5, ny - 2.5, 5, 5)
      } else if (nodo.esFinal) {
        // Pantalla final: oro/ámbar 5×5
        this.gfxGrafo.fillStyle(0xffaa22, 1)
        this.gfxGrafo.fillRect(nx - 2.5, ny - 2.5, 5, 5)
        this.gfxGrafo.lineStyle(1, 0xffe080, 1)
        this.gfxGrafo.strokeRect(nx - 2.5, ny - 2.5, 5, 5)
      } else if (nodo.visitado) {
        // Pantalla visitada: azul/gris acero 4×4
        this.gfxGrafo.fillStyle(0x506888, 0.9)
        this.gfxGrafo.fillRect(nx - 2, ny - 2, 4, 4)
        this.gfxGrafo.lineStyle(1, 0x7590b0, 0.9)
        this.gfxGrafo.strokeRect(nx - 2, ny - 2, 4, 4)
      } else {
        // Pantalla aún no visitada: hueca 3×3
        this.gfxGrafo.fillStyle(0x1a222e, 0.8)
        this.gfxGrafo.fillRect(nx - 1.5, ny - 1.5, 3, 3)
        this.gfxGrafo.lineStyle(1, 0x3d4f66, 0.8)
        this.gfxGrafo.strokeRect(nx - 1.5, ny - 1.5, 3, 3)
      }
    }
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

  // Actualiza la posición del jugador en coordenadas del mundo (modo local)
  actualizar(jugadorX, jugadorY) {
    if (!this.habilitado || !this.visible || this.modo !== 'local') return
    const clampedX = Math.max(0, Math.min(this.mapaWidth, jugadorX))
    const clampedY = Math.max(0, Math.min(this.mapaHeight, jugadorY))
    const px = -this.miniW / 2 + (clampedX / this.mapaWidth) * this.miniW
    const py = -this.miniH / 2 + (clampedY / this.mapaHeight) * this.miniH
    this.marcadorJugador.setPosition(px, py)
  }

  // Re-posiciona el minimapa en la esquina superior derecha según la vista actual
  relayout() {
    const { width } = VISTA
    const anchoActual = this.modo === 'local' ? this.anchoLocal : this.anchoAventura
    const altoActual = this.modo === 'local' ? this.altoLocal : this.altoAventura
    const posX = width - (anchoActual / 2 + 8)
    const posY = 56 + altoActual / 2
    this.contenedor.setPosition(posX, posY)
  }

  setVisible(visible) {
    this.habilitado = visible
    this.visible = visible
    this.contenedor.setVisible(visible)
  }

  destruir() {
    this.contenedor.destroy()
  }
}

export default MinimapaUI
