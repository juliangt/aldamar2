import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
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

import TiendaUI from '../../src/ui/TiendaUI.js'
import { partida } from '../../src/core/partida.js'
import { audio8 } from '../../src/core/Audio8.js'

function crearMockEscena() {
  const crearElemento = (props = {}) => ({
    setPosition: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
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
      text: vi.fn(() => crearElemento()),
    },
  }
}

describe('TiendaUI Unit Tests', () => {
  let escena
  let tiendaUI
  let onToast
  let onCambio

  beforeEach(() => {
    escena = crearMockEscena()
    onToast = vi.fn()
    onCambio = vi.fn()
    partida.nuevaPartida('corazon_ceniza', 'tilo')
    tiendaUI = new TiendaUI(escena, { onToast, onCambio })
  })

  it('abrir(lugarId) carga el catálogo del lugar y actualiza el título', () => {
    tiendaUI.abrir('rioclaro')

    expect(tiendaUI.abierto).toBe(true)
    expect(tiendaUI.lugarId).toBe('rioclaro')
    expect(tiendaUI.catalogo).toContain('provisiones')
    expect(tiendaUI.titulo.setText).toHaveBeenCalled()
  })

  it('cerrar() resetea el título y oculta el panel', () => {
    tiendaUI.abrir('rioclaro')
    tiendaUI.cerrar()

    expect(tiendaUI.abierto).toBe(false)
    expect(tiendaUI.titulo.setText).toHaveBeenCalledWith('TIENDA')
  })

  it('comprar() con saldo suficiente descuenta monedas, añade item y notifica', () => {
    partida.monedas = 20
    tiendaUI.abrir('rioclaro')

    tiendaUI.comprar('provisiones')

    expect(partida.monedas).toBeLessThan(20)
    expect(partida.inventario).toContain('provisiones')
    expect(audio8.sfx).toHaveBeenCalledWith('moneda')
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('Compras: provisiones'))
    expect(onCambio).toHaveBeenCalled()
  })

  it('comprar() sin saldo suficiente rechaza la compra y emite toast de advertencia', () => {
    partida.monedas = 0
    tiendaUI.abrir('rioclaro')

    tiendaUI.comprar('espada_corta')

    expect(partida.monedas).toBe(0)
    expect(partida.inventario).not.toContain('espada_corta')
    expect(onToast).toHaveBeenCalledWith('No te alcanza para eso.')
  })

  it('alCambiarVista() repinta el catálogo si la tienda está abierta', () => {
    tiendaUI.abrir('rioclaro')
    const spyPintar = vi.spyOn(tiendaUI, 'pintar')

    tiendaUI.alCambiarVista()

    expect(spyPintar).toHaveBeenCalled()
  })
})
