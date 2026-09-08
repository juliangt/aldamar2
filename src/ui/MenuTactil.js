// MenuTactil — controles táctiles v2 (Fase H): accesibilidad móvil (hit areas ≥ 48 px),
// d-pad 8 direcciones abajo-izquierda, botón de acción abajo-derecha,
// botón de inventario (≡) y botón de pausa (⏸) arriba-derecha.
// Multitouch: cada zona es interactiva por sí misma (activePointers: 3).
//
// OJO: nada de setScrollFactor(0) aquí. La cámara de Ui nunca se desplaza
// y en Phaser 4 los objetos con scrollFactor(0) bajo zoom ≠ 1 quedan
// descuadrados del mundo (render fuera de vista e input que no llega).
// Con el scrollFactor por defecto siguen el mismo transform que el HUD.

import Phaser from 'phaser'
import { VISTA } from '../core/resolucion.js'
import { audio8 } from '../core/Audio8.js'

const RADIO = 24
import { FUENTE } from './tema.js'

export class MenuTactil {
  constructor(escena, { onAccion, onMenu, onPausa } = {}) {
    this.escena = escena
    this.direccion = { x: 0, y: 0 } // eje actual del d-pad (-1..1)
    this.accion = false
    this.acciones = new Set() // botones del d-pad activos
    this.onAccion = onAccion || (() => {})
    this.onMenu = onMenu || (() => {})
    this.onPausa = onPausa || (() => {})

    this.raiz = escena.add.container(0, 0).setDepth(2000)

    this.crearDpad(56, VISTA.height - 56)
    this.crearBotonAccion(VISTA.width - 44, VISTA.height - 44)
    this.crearBotonMenu(VISTA.width - 30, 28)
    this.crearBotonPausa(VISTA.width - 78, 28)
  }

  // Re-posiciona todos los controles al cambiar la orientación (270×480
  // ⇄ 480×270): las esquinas se recalculan contra la nueva vista y las
  // zonas interactivas conservan sus listeners.
  relayout() {
    const { width, height } = VISTA
    const cx = 56
    const cy = height - 56
    this.dpadBase.setPosition(cx, cy)
    for (const [nombre, [dx, dy]] of Object.entries({
      arriba: [0, -1],
      abajo: [0, 1],
      izquierda: [-1, 0],
      derecha: [1, 0],
    })) {
      const b = this.botones[nombre]
      if (!b) continue
      b.zona.setPosition(cx + dx * 28, cy + dy * 28)
      b.gfx.setPosition(cx + dx * 28, cy + dy * 28)
    }
    this.accionBtn.zona.setPosition(width - 44, height - 44)
    this.accionBtn.circulo.setPosition(width - 44, height - 44)
    this.accionBtn.etiqueta.setPosition(width - 44, height - 44)
    this.btnMenu?.zona.setPosition(width - 30, 28)
    this.btnMenu?.fondo.setPosition(width - 30, 28)
    this.btnMenu?.etiqueta.setPosition(width - 30, 28)
    this.btnPausa?.zona.setPosition(width - 78, 28)
    this.btnPausa?.fondo.setPosition(width - 78, 28)
    this.btnPausa?.etiqueta.setPosition(width - 78, 28)
  }

  crearDpad(cx, cy) {
    const e = this.escena
    this.dpadBase = e.add
      .circle(cx, cy, 48, 0x000000, 0.25)
      .setStrokeStyle(1, 0xffffff, 0.2)
    this.raiz.add(this.dpadBase)
    const posiciones = {
      arriba: [0, -1],
      abajo: [0, 1],
      izquierda: [-1, 0],
      derecha: [1, 0],
    }
    this.botones = {}
    for (const [nombre, [dx, dy]] of Object.entries(posiciones)) {
      const bx = cx + dx * 28
      const by = cy + dy * 28
      // Hit area accesible ≥ 48×48 px
      const zona = e.add
        .zone(bx, by, RADIO * 2, RADIO * 2)
        .setInteractive()
      const gfx = e.add.circle(bx, by, RADIO * 0.75, 0xffffff, 0.14)
      this.raiz.add([gfx])
      gfx.setDepth(2001)
      zona.setDepth(2002)

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
    // Hit area accesible ≥ 48×48 px
    const zona = e.add.zone(bx, by, 48, 48).setInteractive()
    const circulo = e.add.circle(bx, by, 22, 0xd4574e, 0.35).setDepth(2001)
    const etiqueta = e.add
      .text(bx, by, 'A', { fontFamily: FUENTE, fontSize: '12px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(2002)
    zona.setDepth(2002)
    this.accionBtn = { zona, circulo, etiqueta }
    zona.on('pointerdown', () => {
      this.accion = true
      circulo.setFillStyle(0xd4574e, 0.75)
      audio8.sfx('confirmar')
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

  setBloqueado(bloqueado) {
    this.bloqueado = bloqueado
    for (const b of Object.values(this.botones)) b.zona.input.enabled = !bloqueado
    this.accionBtn.zona.input.enabled = !bloqueado && this.habilitado
    if (this.btnMenu?.zona?.input) this.btnMenu.zona.input.enabled = !bloqueado
    if (this.btnPausa?.zona?.input) this.btnPausa.zona.input.enabled = !bloqueado
    if (bloqueado) {
      this.acciones.clear()
      for (const b of Object.values(this.botones)) b.gfx.setFillStyle(0xffffff, 0.14)
      this.direccion.x = 0
      this.direccion.y = 0
    }
  }

  crearBotonMenu(bx, by) {
    const e = this.escena
    // Hit area accesible ≥ 48×48 px
    const zona = e.add.zone(bx, by, 48, 48).setInteractive().setDepth(2002)
    const fondo = e.add.circle(bx, by, 14, 0x000000, 0.4).setDepth(2001)
    const etiqueta = e.add
      .text(bx, by, '≡', { fontFamily: FUENTE, fontSize: '13px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(2002)
    zona.on('pointerdown', () => {
      audio8.sfx('confirmar')
      this.onMenu()
    })
    this.btnMenu = { zona, fondo, etiqueta }
  }

  crearBotonPausa(bx, by) {
    const e = this.escena
    // Hit area accesible ≥ 48×48 px
    const zona = e.add.zone(bx, by, 48, 48).setInteractive().setDepth(2002)
    const fondo = e.add.circle(bx, by, 14, 0x000000, 0.4).setDepth(2001)
    const etiqueta = e.add
      .text(bx, by, '⏸', { fontFamily: FUENTE, fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5)
      .setDepth(2002)
    zona.on('pointerdown', () => {
      audio8.sfx('confirmar')
      this.onPausa()
    })
    this.btnPausa = { zona, fondo, etiqueta }
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
    if (this.btnMenu) {
      this.btnMenu.zona.visible = visible
      this.btnMenu.fondo.visible = visible
      this.btnMenu.etiqueta.visible = visible
    }
    if (this.btnPausa) {
      this.btnPausa.zona.visible = visible
      this.btnPausa.fondo.visible = visible
      this.btnPausa.etiqueta.visible = visible
    }
  }
}

export default MenuTactil
