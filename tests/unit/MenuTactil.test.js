import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v, min, max) => Math.min(Math.max(v, min), max),
    },
    GameObjects: {
      Text: class Text {},
      Container: class Container {},
    },
  },
}))

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import MenuTactil from '../../src/ui/MenuTactil.js'
import { audio8 } from '../../src/core/Audio8.js'

function crearMockEscena() {
  const crearElemento = (props = {}) => ({
    setPosition: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn(function (ev, cb) {
      this._handlers = this._handlers || {}
      this._handlers[ev] = cb
      return this
    }),
    destroy: vi.fn(),
    input: { enabled: true, hitArea: { setSize: vi.fn() } },
    list: [],
    add: vi.fn(function (items) {
      if (Array.isArray(items)) this.list.push(...items)
      else this.list.push(items)
      return this
    }),
    ...props,
  })

  return {
    add: {
      container: vi.fn(() => crearElemento()),
      zone: vi.fn(() => crearElemento()),
      rectangle: vi.fn(() => crearElemento()),
      circle: vi.fn(() => crearElemento()),
      text: vi.fn(() => crearElemento()),
    },
    events: {
      on: vi.fn(),
      emit: vi.fn(),
    },
  }
}

describe('MenuTactil Unit Tests', () => {
  let escena
  let onAccion
  let onMenu
  let onPausa
  let menuTactil

  beforeEach(() => {
    escena = crearMockEscena()
    onAccion = vi.fn()
    onMenu = vi.fn()
    onPausa = vi.fn()
    menuTactil = new MenuTactil(escena, { onAccion, onMenu, onPausa })
  })

  it('inicializa d-pad y botones con dirección neutral (0, 0)', () => {
    expect(menuTactil.direccion).toEqual({ x: 0, y: 0 })
    expect(menuTactil.botones.arriba).toBeDefined()
    expect(menuTactil.botones.abajo).toBeDefined()
    expect(menuTactil.botones.izquierda).toBeDefined()
    expect(menuTactil.botones.derecha).toBeDefined()
  })

  it('pulsar y soltar direcciones del d-pad actualiza vector de dirección', () => {
    const btnDerecha = menuTactil.botones.derecha
    btnDerecha.zona._handlers['pointerdown']()
    expect(menuTactil.direccion).toEqual({ x: 1, y: 0 })

    const btnArriba = menuTactil.botones.arriba
    btnArriba.zona._handlers['pointerdown']()
    expect(menuTactil.direccion).toEqual({ x: 1, y: -1 })

    btnDerecha.zona._handlers['pointerup']()
    expect(menuTactil.direccion).toEqual({ x: 0, y: -1 })

    btnArriba.zona._handlers['pointerup']()
    expect(menuTactil.direccion).toEqual({ x: 0, y: 0 })
  })

  it('pulsar botón de acción dispara onAccion y sonido de confirmación', () => {
    const accionZona = menuTactil.accionBtn.zona
    accionZona._handlers['pointerdown']()

    expect(menuTactil.accion).toBe(true)
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onAccion).toHaveBeenCalledTimes(1)

    accionZona._handlers['pointerup']()
    expect(menuTactil.accion).toBe(false)
  })

  it('pulsar botón de menú dispara onMenu y sonido de confirmación', () => {
    const menuZona = menuTactil.btnMenu.zona
    menuZona._handlers['pointerdown']()

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onMenu).toHaveBeenCalledTimes(1)
  })

  it('pulsar botón de pausa dispara onPausa y sonido de confirmación', () => {
    const pausaZona = menuTactil.btnPausa.zona
    pausaZona._handlers['pointerdown']()

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onPausa).toHaveBeenCalledTimes(1)
  })

  it('setAccionHabilitada modifica opacidad e interactividad visual', () => {
    menuTactil.setAccionHabilitada(true, 'Hablar')
    expect(menuTactil.accionBtn.circulo.setFillStyle).toHaveBeenCalledWith(0xd4574e, 0.55)
    expect(menuTactil.accionBtn.etiqueta.setText).toHaveBeenCalledWith('Hablar')

    menuTactil.setAccionHabilitada(false)
    expect(menuTactil.accionBtn.circulo.setFillStyle).toHaveBeenCalledWith(0xd4574e, 0.18)
    expect(menuTactil.accionBtn.etiqueta.setText).toHaveBeenCalledWith('A')
  })

  it('setBloqueado(true) deshabilita input y reinicia vector a (0, 0)', () => {
    menuTactil.botones.derecha.zona._handlers['pointerdown']()
    expect(menuTactil.direccion.x).toBe(1)

    menuTactil.setBloqueado(true)
    expect(menuTactil.direccion).toEqual({ x: 0, y: 0 })
    expect(menuTactil.bloqueado).toBe(true)
  })

  it('relayout() reposiciona d-pad y botones', () => {
    menuTactil.relayout()
    expect(menuTactil.dpadBase.setPosition).toHaveBeenCalled()
    expect(menuTactil.accionBtn.zona.setPosition).toHaveBeenCalled()
  })
})
