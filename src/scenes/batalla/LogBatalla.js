// LogBatalla — banda inferior de texto del combate: muestra una línea y la
// resuelve sola al cabo de un rato (o antes con tap/SPACE). Extraído de
// BattleScene; el auto-avance nunca deja una Promise huérfana: si llega una
// línea nueva, la pendiente se resuelve antes de reemplazarse.

import Texto from '../../core/Texto.js'
import { VISTA } from '../../core/resolucion.js'
import { FUENTE } from '../../ui/tema.js'

const MS_LOG = 750 // auto-avance del log (base; crece con la longitud)

export class LogBatalla {
  constructor(escena) {
    this.escena = escena
    const { width } = VISTA
    this.logY = VISTA.height - 66
    this.fondo = escena.add
      .rectangle(width / 2, this.logY + 26, width - 12, 52, 0x000000, 0.8)
      .setStrokeStyle(1, 0xe8e8e8, 0.8)
      .setDepth(3000)
    this.texto = escena.add
      .text(12, this.logY + 6, '', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        wordWrap: { width: width - 40 },
        lineSpacing: 3,
      })
      .setDepth(3001)
    // Zona de acelerado (tap sobre el log).
    this.zona = escena.add
      .zone(width / 2, this.logY + 26, width, 60)
      .setInteractive()
      .on('pointerdown', () => this.acelerar())
      .setDepth(3002)
    this.resolver = null
    this.tiempo = null
  }

  relayout() {
    const { width, height } = VISTA
    this.logY = height - 66
    this.fondo.setPosition(width / 2, this.logY + 26).setSize(width - 12, 52)
    this.texto.setPosition(12, this.logY + 6).setStyle({ wordWrap: { width: width - 40 } })
    this.zona.setPosition(width / 2, this.logY + 26).setSize(width, 60)
    if (this.zona.input?.hitArea?.setSize) this.zona.input.hitArea.setSize(width, 60)
  }

  // Muestra una línea; resuelve sola al cabo de un rato o antes con tap.
  // Si había una línea pendiente, resolverla antes de reemplazarla: si no,
  // su promesa quedaría huérfana y el flujo se colgaría para siempre.
  linea(texto, ctx = {}) {
    const final = Texto.tpl(texto, ctx)
    this.texto.setText(final)
    this.acelerar()
    return new Promise((resolve) => {
      this.resolver = resolve
      this.tiempo?.remove()
      this.tiempo = this.escena.time.delayedCall(
        Math.min(2600, MS_LOG + final.length * 10),
        () => {
          this.resolver = null
          resolve()
        }
      )
    })
  }

  acelerar() {
    if (this.resolver) {
      this.tiempo?.remove()
      const r = this.resolver
      this.resolver = null
      r()
    }
  }
}

export default LogBatalla
