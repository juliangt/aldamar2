import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import TiendaUI from '../../src/ui/TiendaUI.js'
import { partida } from '../../src/core/partida.js'
import { audio8 } from '../../src/core/Audio8.js'
import { crearMockEscena } from '../helpers/phaser.js'

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
