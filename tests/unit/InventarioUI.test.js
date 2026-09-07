import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import InventarioUI from '../../src/ui/InventarioUI.js'
import { partida } from '../../src/core/partida.js'
import Datos from '../../src/core/Datos.js'
import { audio8 } from '../../src/core/Audio8.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('InventarioUI Unit Tests', () => {
  let escena
  let inventarioUI
  let onToast
  let onCambio

  beforeEach(() => {
    escena = crearMockEscena()
    onToast = vi.fn()
    onCambio = vi.fn()
    partida.nuevaPartida('corazon_ceniza', 'tilo')
    inventarioUI = new InventarioUI(escena, { onToast, onCambio })
  })

  it('se inicializa con título y filas calculadas', () => {
    expect(inventarioUI.titulo.setText).toBeDefined()
    expect(inventarioUI.xFilas).toBeDefined()
    expect(inventarioUI.yFilas).toBeDefined()
  })

  it('abrir() abre el panel y renderiza el inventario', () => {
    inventarioUI.abrir()
    expect(inventarioUI.abierto).toBe(true)
    expect(inventarioUI.raiz.setVisible).toHaveBeenCalledWith(true)
  })

  it('ejecutar() con consumible cura vida, emite toast y llama onCambio', () => {
    partida.stats.vidaMax = 30
    partida.stats.vida = 10
    partida.inventario = ['provisiones']

    const dato = Datos.item(partida.aventura, 'provisiones')
    expect(dato.tipo).toBe('consumible')

    inventarioUI.ejecutar('provisiones', dato)

    expect(audio8.sfx).toHaveBeenCalledWith('curacion')
    expect(onToast).toHaveBeenCalled()
    expect(onCambio).toHaveBeenCalled()
    expect(partida.stats.vida).toBeGreaterThan(10)
    expect(partida.inventario).not.toContain('provisiones')
  })

  it('ejecutar() con arma o armadura equipa el objeto y notifica', () => {
    partida.inventario = ['espada_corta']
    const dato = Datos.item(partida.aventura, 'espada_corta')
    expect(dato.tipo).toBe('arma')

    inventarioUI.ejecutar('espada_corta', dato)

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(partida.equipo.arma).toBe('espada_corta')
    expect(onToast).toHaveBeenCalledWith(expect.stringContaining('Equipas: espada corta'))
    expect(onCambio).toHaveBeenCalled()
  })

  it('alCambiarVista() recalcula filas y repinta si está abierto', () => {
    inventarioUI.abrir()
    const spyPintar = vi.spyOn(inventarioUI, 'pintar')

    inventarioUI.alCambiarVista()

    expect(spyPintar).toHaveBeenCalled()
  })
})
