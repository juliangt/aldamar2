import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import MenuTactil from '../../src/ui/MenuTactil.js'
import { audio8 } from '../../src/core/Audio8.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('MenuTactil Unit Tests', () => {
  let escena
  let onAccion
  let onMenu
  let onPausa
  let menuTactil

  beforeEach(() => {
    vi.unstubAllGlobals()
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

  it('oculta d-pad y deshabilita su input en computadora con monitor (sin touch y horizontal)', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.dpadVisible).toBe(false)
    expect(mt.dpadBase.visible).toBe(false)
    for (const b of Object.values(mt.botones)) {
      expect(b.gfx.visible).toBe(false)
      expect(b.zona.visible).toBe(false)
      expect(b.zona.input.enabled).toBe(false)
    }
  })

  it('muestra d-pad y habilita input en dispositivo táctil sin teclado (pointer coarse)', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerWidth: 480,
      innerHeight: 270,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.dpadVisible).toBe(true)
    expect(mt.dpadBase.visible).toBe(true)
    for (const b of Object.values(mt.botones)) {
      expect(b.gfx.visible).toBe(true)
      expect(b.zona.visible).toBe(true)
      expect(b.zona.input.enabled).toBe(true)
    }
  })

  it('muestra d-pad en vista vertical (móvil en mano)', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 270,
      innerHeight: 480,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.dpadVisible).toBe(true)
    expect(mt.dpadBase.visible).toBe(true)
  })

  it('setMostrarDpad() alterna dinámicamente la visibilidad e interactividad del d-pad', () => {
    menuTactil.setMostrarDpad(false)
    expect(menuTactil.dpadVisible).toBe(false)
    expect(menuTactil.dpadBase.visible).toBe(false)
    expect(menuTactil.botones.derecha.zona.input.enabled).toBe(false)

    menuTactil.setMostrarDpad(true)
    expect(menuTactil.dpadVisible).toBe(true)
    expect(menuTactil.dpadBase.visible).toBe(true)
    expect(menuTactil.botones.derecha.zona.input.enabled).toBe(true)
  })

  it('setVisible(true) en escritorio no re-muestra el d-pad', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.dpadVisible).toBe(false)

    mt.setVisible(false)
    expect(mt.visible).toBe(false)
    expect(mt.dpadVisible).toBe(false)

    mt.setVisible(true)
    expect(mt.visible).toBe(true)
    expect(mt.dpadVisible).toBe(false)
    expect(mt.dpadBase.visible).toBe(false)
    expect(mt.botones.arriba.zona.input.enabled).toBe(false)
  })

  it('setBloqueado(false) en escritorio no habilita input en zonas del d-pad', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    mt.setBloqueado(true)
    expect(mt.bloqueado).toBe(true)

    mt.setBloqueado(false)
    expect(mt.bloqueado).toBe(false)
    expect(mt.botones.derecha.zona.input.enabled).toBe(false)
  })

  it('relayout() actualiza visibilidad al cambiar dimensiones de ventana', () => {
    const win = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    }
    vi.stubGlobal('window', win)
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.dpadVisible).toBe(false)
    expect(mt.accionVisible).toBe(false)

    // Redimensionar a vertical
    win.innerWidth = 270
    win.innerHeight = 480
    mt.relayout()
    expect(mt.dpadVisible).toBe(true)
    expect(mt.dpadBase.visible).toBe(true)
    expect(mt.accionVisible).toBe(true)
    expect(mt.accionBtn.zona.visible).toBe(true)
  })

  it('oculta botón de acción y deshabilita input en computadora con monitor', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.accionVisible).toBe(false)
    expect(mt.accionBtn.zona.visible).toBe(false)
    expect(mt.accionBtn.circulo.visible).toBe(false)
    expect(mt.accionBtn.etiqueta.visible).toBe(false)
    expect(mt.accionBtn.zona.input.enabled).toBe(false)

    mt.setAccionHabilitada(true, 'Hablar')
    expect(mt.accionBtn.zona.visible).toBe(false)
    expect(mt.accionBtn.zona.input.enabled).toBe(false)
  })

  it('muestra botón de acción y habilita input en dispositivo táctil sin teclado', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      innerWidth: 480,
      innerHeight: 270,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    expect(mt.accionVisible).toBe(true)
    expect(mt.accionBtn.zona.visible).toBe(true)
    expect(mt.accionBtn.circulo.visible).toBe(true)
    expect(mt.accionBtn.etiqueta.visible).toBe(true)

    mt.setAccionHabilitada(true, 'Examinar')
    expect(mt.accionBtn.zona.input.enabled).toBe(true)
  })

  it('setVisible(true) en escritorio no re-muestra el botón de acción', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    mt.setAccionHabilitada(true, 'Hablar')
    expect(mt.accionVisible).toBe(false)

    mt.setVisible(false)
    expect(mt.visible).toBe(false)
    expect(mt.accionVisible).toBe(false)

    mt.setVisible(true)
    expect(mt.visible).toBe(true)
    expect(mt.accionVisible).toBe(false)
    expect(mt.accionBtn.zona.visible).toBe(false)
    expect(mt.accionBtn.zona.input.enabled).toBe(false)
  })

  it('setBloqueado(false) en escritorio no habilita input en botón de acción', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      innerWidth: 1920,
      innerHeight: 1080,
    })
    const mt = new MenuTactil(escena, { onAccion, onMenu, onPausa })
    mt.setAccionHabilitada(true, 'Hablar')
    mt.setBloqueado(true)
    expect(mt.bloqueado).toBe(true)

    mt.setBloqueado(false)
    expect(mt.bloqueado).toBe(false)
    expect(mt.accionBtn.zona.input.enabled).toBe(false)
  })
})
