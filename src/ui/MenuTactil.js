// MenuTactil — controles táctiles v1: d-pad 8 direcciones abajo-izquierda,
// botón de acción contextual abajo-derecha y botón de menú (pausa).
// Multitouch: cada zona es interactiva por sí misma (activePointers: 3).

import Phaser from 'phaser'
import { VISTA } from '../core/resolucion.js'

const RADIO = 22
const FUENTE = '"Press Start 2P", monospace'

export class MenuTactil {
  constructor(escena, { onAccion, onMenu } = {}) {
    this.escena = escena
    this.direccion = { x: 0, y: 0 } // eje actual del d-pad (-1..1)
    this.accion = false
    this.acciones = new Set() // botones del d-pad activos
    this.onAccion = onAccion || (() => {})
    this.onMenu = onMenu || (() => {})

    const { width, height } = VISTA
    this.raiz = escena.add.container(0, 0).setScrollFactor(0).setDepth(2000)

    this.crearDpad(56, height - 56)
    this.crearBotonAccion(width - 44, height - 44)
    this.crearBotonMenu(width - 30, 30)
  }

  crearDpad(cx, cy) {
    const e = this.escena
    this.raiz.add(
      e.add.circle(cx, cy, 46, 0x000000, 0.25).setStrokeStyle(1, 0xffffff, 0.2)
    )
    const posiciones = {
      arriba: [0, -1],
      abajo: [0, 1],
      izquierda: [-1, 0],
      derecha: [1, 0],
    }
    this.botones = {}
    for (const [nombre, [dx, dy]] of Object.entries(posiciones)) {
      const bx = cx + dx * 30
      const by = cy + dy * 30
      const zona = e.add
        .zone(bx, by, RADIO * 2, RADIO * 2)
        .setInteractive()
      const gfx = e.add.circle(bx, by, RADIO * 0.8, 0xffffff, 0.14)
      this.raiz.add([gfx])
      // La zona debe vivir en la raíz para compartir scrollFactor/depth.
      gfx.setDepth(2001)
      zona.setScrollFactor(0).setDepth(2002)

      zona.on('pointerdown', () => this.pulsar(nombre, gfx))
      zona.on('pointerout', () => this.soltar(nombre, gfx))
      zona.on('pointerup', () => this.soltar(nombre, gfx))
      this.botones[nombre] = { zona, gfx, vec: [dx, dy] }
    }
  }

  pulsar(nombre, gfx) {
    this.acciones.add(nombre)
    gfx.setFillStyle(0xffffff, 0.45)
    this.recalcularEje()
  }

  soltar(nombre, gfx) {
    this.acciones.delete(nombre)
    gfx.setFillStyle(0xffffff, 0.14)
    this.recalcularEje()
  }

  recalcularEje() {
    let x = 0
    let y = 0
    for (const n of this.acciones) {
      const [dx, dy] = this.botones[n].vec
      x += dx
      y += dy
    }
    this.direccion.x = Phaser.Math.Clamp(x, -1, 1)
    this.direccion.y = Phaser.Math.Clamp(y, -1, 1)
  }

  crearBotonAccion(bx, by) {
    const e = this.escena
    const zona = e.add.zone(bx, by, 40, 40).setInteractive()
    const circulo = e.add.circle(bx, by, 20, 0xd4574e, 0.35).setScrollFactor(0).setDepth(2001)
    const etiqueta = e.add
      .text(bx, by, 'A', { fontFamily: FUENTE, fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002)
    zona.setScrollFactor(0).setDepth(2002)
    this.accionBtn = { zona, circulo, etiqueta }
    zona.on('pointerdown', () => {
      this.accion = true
      circulo.setFillStyle(0xd4574e, 0.75)
      this.onAccion()
    })
    zona.on('pointerup', () => {
      this.accion = false
      circulo.setFillStyle(0xd4574e, this.habilitado ? 0.55 : 0.35)
    })
    this.setAccionHabilitada(false)
  }

  // El botón A solo se enciende cerca de algo interactivo; cuando hay
  // objetivo muestra el verbo («Hablar», «Coger», «Entrar»).
  setAccionHabilitada(habilitado, verbo) {
    this.habilitado = habilitado
    this.accionBtn.circulo.setFillStyle(0xd4574e, habilitado ? 0.55 : 0.18)
    this.accionBtn.etiqueta.setFontSize(habilitado && verbo ? '7px' : '12px')
    this.accionBtn.etiqueta.setText(habilitado && verbo ? verbo : 'A')
    this.accionBtn.etiqueta.setAlpha(habilitado ? 1 : 0.4)
    this.accionBtn.zona.input.enabled = habilitado && !this.bloqueado
  }

  // Bloqueo modal: con la DialogBox abierta el d-pad y A se silencian y el
  // eje vuelve a 0 para que el jugador se detenga.
  setBloqueado(bloqueado) {
    this.bloqueado = bloqueado
    for (const b of Object.values(this.botones)) b.zona.input.enabled = !bloqueado
    this.accionBtn.zona.input.enabled = !bloqueado && this.habilitado
    if (bloqueado) {
      this.acciones.clear()
      for (const b of Object.values(this.botones)) b.gfx.setFillStyle(0xffffff, 0.14)
      this.direccion.x = 0
      this.direccion.y = 0
    }
  }

  crearBotonMenu(bx, by) {
    const e = this.escena
    const zona = e.add.zone(bx, by, 28, 28).setInteractive().setScrollFactor(0).setDepth(2002)
    const etiqueta = e.add
      .text(bx, by, '≡', { fontFamily: FUENTE, fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2001)
    zona.on('pointerdown', () => this.onMenu())
  }

  setVisible(visible) {
    this.raiz.setVisible(visible)
    for (const b of Object.values(this.botones)) {
      b.zona.visible = visible
      b.gfx.visible = visible
    }
    this.accionBtn.zona.visible = visible
    this.accionBtn.circulo.visible = visible
    this.accionBtn.etiqueta.visible = visible
  }
}

export default MenuTactil
