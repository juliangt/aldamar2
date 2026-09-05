// PanelUI — base de los paneles modales táctiles (inventario, tienda):
// ventana con borde 1-bit, fila de título, botón de cierre y helpers para
// filas/botones. El bloqueo modal del mundo lo gestiona UiScene.

import { VISTA } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'

export class PanelUI {
  constructor(escena, { titulo, ancho = 440, alto = 230 } = {}) {
    this.escena = escena
    const { width, height } = VISTA
    this.ancho = ancho
    this.alto = alto
    this.x = (width - ancho) / 2
    this.y = (height - alto) / 2

    this.raiz = escena.add.container(0, 0).setDepth(3600).setVisible(false)

    // Zona a pantalla completa: el tap no atraviesa al mundo.
    this.velo = escena.add
      .zone(width / 2, height / 2, width, height)
      .setInteractive()
    this.velo.on('pointerdown', () => {}) // traga el tap
    this.fondo = escena.add
      .rectangle(this.x + ancho / 2, this.y + alto / 2, ancho, alto, 0x000000, 0.92)
      .setStrokeStyle(1, 0xe8e8e8, 0.9)
    this.titulo = escena.add
      .text(this.x + 8, this.y + 6, titulo, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
    this.raiz.add([this.velo, this.fondo, this.titulo])

    this.crearBoton(this.x + ancho - 16, this.y + 12, '×', () => this.cerrar(), 20)
    this.filas = escena.add.container(0, 0)
    this.detalle = escena.add.container(0, 0)
    this.raiz.add([this.filas, this.detalle])
    this.abierto = false
  }

  crearBoton(cx, cy, etiqueta, onClick, ancho = 76) {
    const zona = this.escena.add.zone(cx, cy, ancho, 16).setInteractive()
    const caja = this.escena.add
      .rectangle(cx, cy, ancho, 16, 0x000000, 0.5)
      .setStrokeStyle(1, 0xe0c04a, 0.8)
    const rotulo = this.escena.add
      .text(cx, cy, etiqueta, { fontFamily: FUENTE, fontSize: '7px', color: '#e0c04a' })
      .setOrigin(0.5)
    zona.on('pointerdown', () => onClick())
    const grupo = [zona, caja, rotulo]
    this.raiz.add(grupo)
    return {
      zona,
      caja,
      rotulo,
      setTexto(t) {
        rotulo.setText(t)
      },
      setHabilitado(on) {
        zona.input.enabled = on
        rotulo.setColor(on ? '#e0c04a' : '#5a5a5a')
        caja.setStrokeStyle(1, on ? 0xe0c04a : 0x5a5a5a, 0.8)
      },
      destruir() {
        grupo.forEach((o) => o.destroy())
      },
    }
  }

  limpiar(contenedor) {
    contenedor.list.slice().forEach((o) => o.destroy())
  }

  abrir() {
    this.abierto = true
    this.raiz.setVisible(true)
  }

  cerrar() {
    if (!this.abierto) return
    this.abierto = false
    this.raiz.setVisible(false)
    this.onCerrar && this.onCerrar()
  }
}

export default PanelUI
export { FUENTE }
