import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

import PanelUI from '../../src/ui/PanelUI.js'
import { VISTA } from '../../src/core/resolucion.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('PanelUI Unit Tests', () => {
  let escena
  let panel

  beforeEach(() => {
    escena = crearMockEscena()
    panel = new PanelUI(escena, { titulo: 'TEST PANEL', ancho: 300, alto: 200 })
  })

  it('inicializa correctamente propiedades y contenedor oculto', () => {
    expect(panel.titulo.setText).toBeDefined()
    expect(panel.raiz.setVisible).toHaveBeenCalledWith(false)
    expect(panel.abierto).toBe(false)
  })

  it('abrir() cambia abierto a true y hace visible la raíz', () => {
    panel.abrir()
    expect(panel.abierto).toBe(true)
    expect(panel.raiz.setVisible).toHaveBeenCalledWith(true)
  })

  it('cerrar() oculta la raíz y ejecuta el callback onCerrar', () => {
    const onCerrar = vi.fn()
    panel.onCerrar = onCerrar

    panel.abrir()
    panel.cerrar()

    expect(panel.abierto).toBe(false)
    expect(panel.raiz.setVisible).toHaveBeenCalledWith(false)
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('cerrar() es idempotente si el panel ya está cerrado', () => {
    const onCerrar = vi.fn()
    panel.onCerrar = onCerrar

    panel.cerrar()
    expect(onCerrar).not.toHaveBeenCalled()
  })

  it('crearBoton() crea componentes y permite habilitar/deshabilitar', () => {
    const onClick = vi.fn()
    const boton = panel.crearBoton(10, 20, 'ACCION', onClick, 60)

    expect(boton.rotulo).toBeDefined()
    expect(boton.zona).toBeDefined()

    boton.setHabilitado(false)
    expect(boton.zona.input.enabled).toBe(false)
    expect(boton.rotulo.setColor).toHaveBeenCalledWith('#5a5a5a')

    boton.setHabilitado(true)
    expect(boton.zona.input.enabled).toBe(true)
    expect(boton.rotulo.setColor).toHaveBeenCalledWith('#e0c04a')

    boton.setTexto('NUEVO')
    expect(boton.rotulo.setText).toHaveBeenCalledWith('NUEVO')
  })

  it('relayout() re-aplica la geometría y dispara alCambiarVista si existe', () => {
    panel.alCambiarVista = vi.fn()
    panel.relayout()
    expect(panel.alCambiarVista).toHaveBeenCalled()
    expect(panel.ancho).toBeLessThanOrEqual(VISTA.width)
    expect(panel.alto).toBeLessThanOrEqual(VISTA.height)
  })

  it('limpiar() destruye los elementos del contenedor dado', () => {
    const mockHijo1 = { destroy: vi.fn() }
    const mockHijo2 = { destroy: vi.fn() }
    const contenedor = { list: [mockHijo1, mockHijo2] }

    panel.limpiar(contenedor)
    expect(mockHijo1.destroy).toHaveBeenCalled()
    expect(mockHijo2.destroy).toHaveBeenCalled()
  })
})
