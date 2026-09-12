import { describe, it, expect, vi, beforeEach } from 'vitest'
import Botonera from '../../src/scenes/batalla/Botonera.js'
import { crearMockEscena } from '../helpers/phaser.js'

vi.mock('../../src/core/Datos.js', () => ({
  default: {
    aventura: vi.fn(),
    item: vi.fn(),
  },
}))

vi.mock('../../src/core/partida.js', () => ({
  partida: {
    cantidad: vi.fn(),
    itemsApilados: vi.fn(),
  },
}))

vi.mock('../../src/core/resolucion.js', () => ({
  VISTA: { width: 270, height: 480 },
  esVistaVertical: vi.fn(),
}))

import Datos from '../../src/core/Datos.js'
import { partida } from '../../src/core/partida.js'
import { esVistaVertical } from '../../src/core/resolucion.js'

describe('Botonera', () => {
  let escena

  beforeEach(() => {
    vi.clearAllMocks()
    escena = crearMockEscena()
    escena.combate = { aventura: 'test_aventura', estado: 'activo' }
    escena.logY = 300

    Datos.aventura.mockReturnValue({ comando_especial: null })
    partida.cantidad.mockReturnValue(0)
    partida.itemsApilados.mockReturnValue([])
    esVistaVertical.mockReturnValue(true)
  })

  it('creates default buttons correctly', () => {
    const onAccion = vi.fn()
    const botonera = new Botonera(escena, { onAccion })

    const botones = ['atacar', 'objeto', 'especial', 'cuerno', 'huida']

    botones.forEach(id => {
      expect(botonera.botones[id]).toBeDefined()
      expect(botonera.botones[id].zona).toBeDefined()
      expect(botonera.botones[id].caja).toBeDefined()
      expect(botonera.botones[id].texto).toBeDefined()
    })

    expect(escena.add.zone).toHaveBeenCalledTimes(5)
    expect(escena.add.rectangle).toHaveBeenCalledTimes(5)
    expect(escena.add.text).toHaveBeenCalledTimes(5)
  })

  it('uses default "especial" label if especial is not defined', () => {
    Datos.aventura.mockReturnValue({ comando_especial: null })
    const botonera = new Botonera(escena)

    expect(botonera.cmdEsp).toBe('especial')
    expect(botonera.acciones.find(a => a[0] === 'especial')[1]).toBe('ESPECIAL')
  })

  it('uses custom label and command for especial if defined in aventura', () => {
    Datos.aventura.mockReturnValue({ comando_especial: { comando: 'marea' } })
    const botonera = new Botonera(escena)

    expect(botonera.cmdEsp).toBe('marea')
    expect(botonera.acciones.find(a => a[0] === 'especial')[1]).toBe('MAREA')
  })

  it('triggers onAccion correctly when button is clicked', () => {
    const onAccion = vi.fn()
    const botonera = new Botonera(escena, { onAccion })

    // Simulate click on 'atacar'
    botonera.botones.atacar.zona._handlers.pointerdown()
    expect(onAccion).toHaveBeenCalledWith('atacar')

    // Simulate click on 'especial' with default command
    onAccion.mockClear()
    botonera.botones.especial.zona._handlers.pointerdown()
    expect(onAccion).toHaveBeenCalledWith('especial')
  })

  it('triggers onAccion correctly with custom command for especial button', () => {
    const onAccion = vi.fn()
    Datos.aventura.mockReturnValue({ comando_especial: { comando: 'marea' } })
    const botonera = new Botonera(escena, { onAccion })

    // Simulate click on 'especial'
    botonera.botones.especial.zona._handlers.pointerdown()
    expect(onAccion).toHaveBeenCalledWith('marea')
  })
})

describe('Botonera Layout', () => {
  let escena

  beforeEach(() => {
    vi.clearAllMocks()
    escena = crearMockEscena()
    escena.combate = { aventura: 'test_aventura', estado: 'activo' }
    escena.logY = 300

    Datos.aventura.mockReturnValue({ comando_especial: null })
    partida.cantidad.mockReturnValue(0)
    partida.itemsApilados.mockReturnValue([])
  })

  it('calculates correct positions for vertical view', () => {
    esVistaVertical.mockReturnValue(true)
    const botonera = new Botonera(escena)

    // Fila 0 (top row): 3 buttons (index 0, 1, 2), n=3, fila0=3
    // i=0 -> k=0, n=3 -> x = 270 * 0.5 / 3 = 45, y = 300 - 38 = 262
    expect(botonera.posBoton(0, 5)).toEqual({ x: 45, y: 262, w: 78 })

    // i=1 -> k=1, n=3 -> x = 270 * 1.5 / 3 = 135, y = 262
    expect(botonera.posBoton(1, 5)).toEqual({ x: 135, y: 262, w: 78 })

    // i=2 -> k=2, n=3 -> x = 270 * 2.5 / 3 = 225, y = 262
    expect(botonera.posBoton(2, 5)).toEqual({ x: 225, y: 262, w: 78 })

    // Fila 1 (bottom row): 2 buttons (index 3, 4), n=2
    // i=3 -> k=0, n=2 -> x = 270 * 0.5 / 2 = 67.5, y = 300 - 14 = 286
    expect(botonera.posBoton(3, 5)).toEqual({ x: 67.5, y: 286, w: 78 })

    // i=4 -> k=1, n=2 -> x = 270 * 1.5 / 2 = 202.5, y = 286
    expect(botonera.posBoton(4, 5)).toEqual({ x: 202.5, y: 286, w: 78 })
  })

  it('calculates correct positions for horizontal view', () => {
    esVistaVertical.mockReturnValue(false)
    const botonera = new Botonera(escena)

    // i=0 -> x = 12 + 0 + 246/10 - 6 = 12 + 24.6 - 6 = 30.6
    expect(botonera.posBoton(0, 5)).toEqual({ x: 30.6, y: 288, w: 82 })

    // i=4 -> x = 12 + 4*(246/5) + 246/10 - 6 = 12 + 196.8 + 24.6 - 6 = 227.4
    expect(botonera.posBoton(4, 5)).toEqual({ x: 227.4, y: 288, w: 82 })
  })

  it('relayout updates positions of buttons', () => {
    esVistaVertical.mockReturnValue(true)
    const botonera = new Botonera(escena)

    // Check initial position of first button
    const p = botonera.posBoton(0, 5)

    botonera.botones.atacar.zona.setPosition.mockClear()
    botonera.botones.atacar.caja.setPosition.mockClear()
    botonera.botones.atacar.texto.setPosition.mockClear()

    botonera.relayout()

    expect(botonera.botones.atacar.zona.setPosition).toHaveBeenCalledWith(p.x, p.y)
    expect(botonera.botones.atacar.caja.setPosition).toHaveBeenCalledWith(p.x, p.y)
    expect(botonera.botones.atacar.texto.setPosition).toHaveBeenCalledWith(p.x, p.y)
  })

  it('relayout ignores missing buttons and safely updates hitArea if available', () => {
    esVistaVertical.mockReturnValue(true)
    const botonera = new Botonera(escena)

    // Simulate missing button
    const atacarBtn = botonera.botones.atacar
    delete botonera.botones.atacar

    // Call relayout
    botonera.relayout()

    // Ensure it didn't throw an error when processing the missing button
    expect(atacarBtn.zona.setPosition).not.toHaveBeenCalled()

    // Ensure hitArea is updated
    expect(botonera.botones.huida.zona.input.hitArea.setSize).toHaveBeenCalled()

    // Test when hitArea does not have setSize (it handles gracefully)
    delete botonera.botones.huida.zona.input.hitArea.setSize
    expect(() => botonera.relayout()).not.toThrow()
  })
})

describe('Botonera State Updates', () => {
  let escena

  beforeEach(() => {
    vi.clearAllMocks()
    escena = crearMockEscena()
    escena.combate = { aventura: 'test_aventura', estado: 'activo' }
    escena.logY = 300

    Datos.aventura.mockReturnValue({ comando_especial: null })
    Datos.item.mockReturnValue({ tipo: 'consumible' })
    partida.cantidad.mockReturnValue(0)
    partida.itemsApilados.mockReturnValue([])
    esVistaVertical.mockReturnValue(true)
  })

  it('refrescar hides cuerno, objeto, and especial by default', () => {
    const botonera = new Botonera(escena)
    botonera.refrescar()

    // visible
    expect(botonera.botones.atacar.zona.setVisible).toHaveBeenCalledWith(true)
    expect(botonera.botones.huida.zona.setVisible).toHaveBeenCalledWith(true)

    // hidden
    expect(botonera.botones.cuerno.zona.setVisible).toHaveBeenCalledWith(false)
    expect(botonera.botones.objeto.zona.setVisible).toHaveBeenCalledWith(false)
    expect(botonera.botones.especial.zona.setVisible).toHaveBeenCalledWith(false)
  })

  it('refrescar shows especial if has comando_especial', () => {
    Datos.aventura.mockReturnValue({ comando_especial: { comando: 'marea' } })
    const botonera = new Botonera(escena)
    botonera.refrescar()

    expect(botonera.botones.especial.zona.setVisible).toHaveBeenCalledWith(true)
  })

  it('refrescar shows cuerno if player has cuerno_valoria', () => {
    partida.cantidad.mockImplementation((id) => id === 'cuerno_valoria' ? 1 : 0)
    const botonera = new Botonera(escena)
    botonera.refrescar()

    expect(botonera.botones.cuerno.zona.setVisible).toHaveBeenCalledWith(true)
  })

  it('refrescar shows objeto if player has consumibles', () => {
    partida.itemsApilados.mockReturnValue([{ id: 'pocion' }])
    const botonera = new Botonera(escena)
    botonera.refrescar()

    expect(botonera.botones.objeto.zona.setVisible).toHaveBeenCalledWith(true)
  })

  it('refrescar disables and hides all buttons if combat state is "fin"', () => {
    escena.combate.estado = 'fin'
    partida.itemsApilados.mockReturnValue([{ id: 'pocion' }])
    partida.cantidad.mockImplementation((id) => id === 'cuerno_valoria' ? 1 : 0)
    Datos.aventura.mockReturnValue({ comando_especial: { comando: 'marea' } })

    const botonera = new Botonera(escena)
    botonera.refrescar()

    const botones = ['atacar', 'objeto', 'especial', 'cuerno', 'huida']

    botones.forEach(id => {
      expect(botonera.botones[id].zona.setVisible).toHaveBeenCalledWith(false)
      expect(botonera.botones[id].zona.disableInteractive).toHaveBeenCalled()
      expect(botonera.botones[id].caja.setVisible).toHaveBeenCalledWith(false)
      expect(botonera.botones[id].texto.setVisible).toHaveBeenCalledWith(false)
    })
  })

  it('setActivos enables or disables interactivity and styling', () => {
    const botonera = new Botonera(escena)

    botonera.setActivos(false)

    const botones = ['atacar', 'objeto', 'especial', 'cuerno', 'huida']
    botones.forEach(id => {
      expect(botonera.botones[id].caja.setStrokeStyle).toHaveBeenCalledWith(1, 0x555555, 0.5)
      expect(botonera.botones[id].texto.setColor).toHaveBeenCalledWith('#777777')
      expect(botonera.botones[id].zona.input.enabled).toBe(false)
    })

    botonera.setActivos(true)

    botones.forEach(id => {
      expect(botonera.botones[id].caja.setStrokeStyle).toHaveBeenCalledWith(1, 0xe0c04a, 0.9)
      expect(botonera.botones[id].texto.setColor).toHaveBeenCalledWith('#e0c04a')
      expect(botonera.botones[id].zona.input.enabled).toBe(true)
    })
  })
})
