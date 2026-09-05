// SelectorOpciones — panel táctil de decisiones (Fase E): pregunta arriba y
// botones verticales con `titulo` + `detalle` (estilos 1-bit, como DialogBox).
// Basado en Promise: resuelve la opción elegida (objeto) o null al cerrar.
// Emite «dialogo-abierto/cerrado» en el bus de la escena para que el mundo
// sepa que hay un modal encima (mismo contrato que DialogBox).

import Phaser from 'phaser'
import Texto from '../core/Texto.js'
import { VISTA } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'

export class SelectorOpciones {
  constructor(escena) {
    this.escena = escena
    this.abierto = false
  }

  // pregunta: string; opciones: [{titulo, detalle, ...}] (la opción completa
  // se devuelve tal cual al resolver, efectos incluidos).
  elegir(pregunta, opciones, ctx = {}) {
    if (!opciones?.length) return Promise.resolve(null)
    this.abierto = true
    const { width } = VISTA
    const contenedor = this.escena.add.container(0, 0).setDepth(3600)
    this.contenedor = contenedor

    const altoCaja = 84
    const y0 = VISTA.height - altoCaja - 6
    // Velo sobre el mundo: el tap no pasa abajo mientras se decide.
    const velo = this.escena.add
      .zone(width / 2, VISTA.height / 2, width, VISTA.height)
      .setInteractive()

    const fondo = this.escena.add
      .rectangle(6 + (width - 12) / 2, y0 + altoCaja / 2, width - 12, altoCaja, 0x000000, 0.85)
      .setStrokeStyle(1, 0xe8e8e8, 0.9)

    const textoPregunta = this.escena.add.text(14, y0 + 8, Texto.tpl(pregunta || '', ctx), {
      fontFamily: FUENTE,
      fontSize: '8px',
      color: '#9ad09a',
      wordWrap: { width: width - 28 },
    })

    contenedor.add([velo, fondo, textoPregunta])
    this.escena.events.emit('dialogo-abierto')

    return new Promise((resolve) => {
      const altoBoton = Math.min(20, Math.max(14, (altoCaja - 34) / opciones.length))
      opciones.forEach((op, i) => {
        const bx = width / 2
        const by = y0 + 28 + i * (altoBoton + 4) + altoBoton / 2
        const zona = this.escena.add.zone(bx, by, width - 36, altoBoton).setInteractive()
        const caja = this.escena.add
          .rectangle(bx, by, width - 36, altoBoton, 0x000000, 0.5)
          .setStrokeStyle(1, 0xe0c04a, 0.9)
        const titulo = this.escena.add
          .text(bx, by - 3, op.titulo || op.clave, {
            fontFamily: FUENTE,
            fontSize: '7px',
            color: '#e0c04a',
          })
          .setOrigin(0.5)
        const detalle = op.detalle
          ? this.escena.add
              .text(bx, by + 5, `· ${op.detalle}`, {
                fontFamily: FUENTE,
                fontSize: '6px',
                color: '#8a8a8a',
              })
              .setOrigin(0.5)
          : null
        zona.on('pointerdown', () => {
          this.cerrar()
          resolve(op)
        })
        contenedor.add([zona, caja, titulo, ...(detalle ? [detalle] : [])])
      })
    })
  }

  cerrar() {
    if (!this.abierto) return
    this.abierto = false
    this.contenedor?.destroy()
    this.contenedor = null
    this.escena.events.emit('dialogo-cerrado')
  }
}

export default SelectorOpciones
