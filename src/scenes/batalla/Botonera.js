// Botonera — comandos del combate (ATACAR/OBJETO/especial/CUERNO/HUIDA):
// una fila en horizontal; en vertical dos filas (3+2). La visibilidad de
// cada comando depende del estado del combate (consumibles, cuerno,
// comando especial de la aventura). Extraída de BattleScene; la acción se
// comunica por callback y el estado se lee de escena.combate.

import Datos from '../../core/Datos.js'
import { partida } from '../../core/partida.js'
import { VISTA, esVistaVertical } from '../../core/resolucion.js'
import { FUENTE } from '../../ui/tema.js'

export class Botonera {
  constructor(escena, { onAccion } = {}) {
    this.escena = escena
    this.onAccion = onAccion
    this.botones = {}

    const c = escena.combate
    const esp = Datos.aventura(c.aventura).comando_especial
    this.cmdEsp = esp?.comando || 'especial'
    const etiquetaEsp = esp?.comando ? esp.comando.toUpperCase() : 'ESPECIAL'
    this.acciones = [
      ['atacar', 'ATACAR'],
      ['objeto', 'OBJETO'],
      ['especial', etiquetaEsp],
      ['cuerno', 'CUERNO'],
      ['huida', 'HUIDA'],
    ]

    this.acciones.forEach(([id, etiqueta], i) => {
      const p = this.posBoton(i, this.acciones.length)
      const zona = escena.add.zone(p.x, p.y, p.w, 18).setInteractive().setDepth(3100)
      const caja = escena.add
        .rectangle(p.x, p.y, p.w, 16, 0x000000, 0.6)
        .setStrokeStyle(1, 0xe0c04a, 0.8)
        .setDepth(3100)
      const texto = escena.add
        .text(p.x, p.y, etiqueta, { fontFamily: FUENTE, fontSize: '7px', color: '#e0c04a' })
        .setOrigin(0.5)
        .setDepth(3101)
      zona.on('pointerdown', () => this.onAccion?.(id === 'especial' ? this.cmdEsp : id))
      this.botones[id] = { zona, caja, texto }
    })
    this.refrescar()
  }

  // Posición del botón i-ésimo: una fila en horizontal; en vertical dos
  // filas (3+2) para que los cinco comandos no se pisen en 270 px de ancho.
  posBoton(i, total) {
    const { width } = VISTA
    const logY = this.escena.logY
    if (!esVistaVertical()) {
      return {
        x: 12 + i * ((width - 24) / total) + (width - 24) / total / 2 - 6,
        y: logY - 12,
        w: 82,
      }
    }
    const fila0 = Math.ceil(total / 2)
    const enFila0 = i < fila0
    const n = enFila0 ? fila0 : total - fila0
    const k = enFila0 ? i : i - fila0
    return {
      x: (width * (k + 0.5)) / n,
      y: enFila0 ? logY - 38 : logY - 14,
      w: 78,
    }
  }

  relayout() {
    this.acciones.forEach(([id], i) => {
      const b = this.botones[id]
      if (!b) return
      const p = this.posBoton(i, this.acciones.length)
      b.zona.setPosition(p.x, p.y).setSize(p.w, 18)
      if (b.zona.input?.hitArea?.setSize) b.zona.input.hitArea.setSize(p.w, 18)
      b.caja.setPosition(p.x, p.y).setSize(p.w, 16)
      b.texto.setPosition(p.x, p.y)
    })
  }

  refrescar() {
    const c = this.escena.combate
    const esp = Datos.aventura(c.aventura).comando_especial
    const tieneEspecial = !!(esp && esp.comando) // corazon, marea, eco (Brasa null)
    const tieneCuerno = partida.cantidad('cuerno_valoria') > 0
    const visibles = {
      atacar: true,
      objeto: partida.itemsApilados().some(({ id }) => Datos.item(c.aventura, id)?.tipo === 'consumible'),
      especial: tieneEspecial,
      cuerno: tieneCuerno,
      huida: true,
    }
    for (const [id, b] of Object.entries(this.botones)) {
      const v = visibles[id] && c.estado !== 'fin'
      b.zona.setVisible(v)
      if (v) b.zona.setInteractive()
      else b.zona.disableInteractive()
      b.caja.setVisible(v)
      b.texto.setVisible(v)
    }
  }

  setActivos(activos) {
    for (const b of Object.values(this.botones)) {
      b.caja.setStrokeStyle(1, activos ? 0xe0c04a : 0x555555, activos ? 0.9 : 0.5)
      b.texto.setColor(activos ? '#e0c04a' : '#777777')
      b.zona.input.enabled = activos
    }
  }
}

export default Botonera
