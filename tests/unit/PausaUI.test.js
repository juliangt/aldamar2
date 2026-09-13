import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
    toggleMute: vi.fn(),
    setVolumen: vi.fn(),
    mute: false,
    volumenMaster: 0.8,
  },
}))

vi.mock('../../src/core/pantalla.js', () => ({
  alternarPantallaCompleta: vi.fn().mockResolvedValue(),
  estaPantallaCompleta: vi.fn().mockReturnValue(false),
}))

vi.mock('../../src/core/opciones.js', () => ({
  obtenerMinimapaHabilitado: vi.fn(() => true),
  guardarMinimapaHabilitado: vi.fn(),
  obtenerModoMinimapa: vi.fn(() => 'local'),
  guardarModoMinimapa: vi.fn(),
}))

import { PausaUI } from '../../src/ui/PausaUI.js'
import { audio8 } from '../../src/core/Audio8.js'
import { alternarPantallaCompleta, estaPantallaCompleta } from '../../src/core/pantalla.js'
import {
  obtenerMinimapaHabilitado,
  guardarMinimapaHabilitado,
  obtenerModoMinimapa,
  guardarModoMinimapa,
} from '../../src/core/opciones.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('PausaUI Unit Tests', () => {
  let escena
  let onReanudar
  let onSalir
  let onMinimapaToggle
  let onModoMinimapaChange
  let pausaUI

  beforeEach(() => {
    vi.clearAllMocks()
    audio8.volumenMaster = 0.8
    audio8.mute = false
    estaPantallaCompleta.mockReturnValue(false)
    obtenerMinimapaHabilitado.mockReturnValue(true)
    obtenerModoMinimapa.mockReturnValue('local')

    escena = crearMockEscena()
    onReanudar = vi.fn()
    onSalir = vi.fn()
    onMinimapaToggle = vi.fn()
    onModoMinimapaChange = vi.fn()
    pausaUI = new PausaUI(escena, {
      onReanudar,
      onSalir,
      onMinimapaToggle,
      onModoMinimapaChange,
    })
  })

  it('inicializa contenedor oculto y crea todos los elementos de la UI', () => {
    expect(pausaUI.contenedor.setVisible).toHaveBeenCalledWith(false)
    expect(pausaUI.velo).toBeDefined()
    expect(pausaUI.fondo).toBeDefined()
    expect(pausaUI.titulo).toBeDefined()
    expect(pausaUI.info).toBeDefined()
    expect(pausaUI.btnReanudar).toBeDefined()
    expect(pausaUI.btnAudioToggle).toBeDefined()
    expect(pausaUI.btnVolMenos).toBeDefined()
    expect(pausaUI.txtVolumen).toBeDefined()
    expect(pausaUI.btnVolMas).toBeDefined()
    expect(pausaUI.btnMinimapaToggle).toBeDefined()
    expect(pausaUI.btnModoMinimapa).toBeDefined()
    expect(pausaUI.btnPantallaCompleta).toBeDefined()
    expect(pausaUI.btnSalir).toBeDefined()
  })

  it('pulsar Reanudar dispara onReanudar y sonido', () => {
    const zonaReanudar = pausaUI.btnReanudar.list[0]
    zonaReanudar._handlers['pointerdown']()

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onReanudar).toHaveBeenCalledTimes(1)
  })

  it('pulsar Salir dispara onSalir y sonido', () => {
    const zonaSalir = pausaUI.btnSalir.list[0]
    zonaSalir._handlers['pointerdown']()

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onSalir).toHaveBeenCalledTimes(1)
  })

  it('pulsar Audio Toggle alterna mute, actualiza etiqueta y reproduce sonido', () => {
    const zonaAudio = pausaUI.btnAudioToggle.list[0]
    const lblAudio = pausaUI.btnAudioToggle.list[2]

    zonaAudio._handlers['pointerdown']()
    expect(audio8.toggleMute).toHaveBeenCalledTimes(1)
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')

    audio8.mute = true
    pausaUI.actualizarTextos()
    expect(lblAudio.setText).toHaveBeenCalledWith('AUDIO: SILENCIADO')

    audio8.mute = false
    pausaUI.actualizarTextos()
    expect(lblAudio.setText).toHaveBeenCalledWith('AUDIO: ACTIVADO')
  })

  it('pulsar Volumen Menos baja el volumen limitando a 0', () => {
    const zonaVolMenos = pausaUI.btnVolMenos.list[0]

    zonaVolMenos._handlers['pointerdown']()
    expect(audio8.setVolumen).toHaveBeenCalledWith(expect.closeTo(0.7, 5)) // 0.8 - 0.1
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')

    // Simular que el volumen ya es 0 para comprobar el límite inferior
    audio8.volumenMaster = 0
    zonaVolMenos._handlers['pointerdown']()
    expect(audio8.setVolumen).toHaveBeenCalledWith(0)
  })

  it('pulsar Volumen Mas sube el volumen limitando a 1', () => {
    const zonaVolMas = pausaUI.btnVolMas.list[0]

    zonaVolMas._handlers['pointerdown']()
    expect(audio8.setVolumen).toHaveBeenCalledWith(0.9) // 0.8 + 0.1
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')

    // Simular que el volumen ya es 1 para comprobar el límite superior
    audio8.volumenMaster = 1
    zonaVolMas._handlers['pointerdown']()
    expect(audio8.setVolumen).toHaveBeenCalledWith(1)
  })

  it('pulsar Pantalla Completa llama a alternarPantallaCompleta y reproduce sonido', async () => {
    const zonaPantallaCompleta = pausaUI.btnPantallaCompleta.list[0]
    const lblPantallaCompleta = pausaUI.btnPantallaCompleta.list[2]

    zonaPantallaCompleta._handlers['pointerdown']()
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(alternarPantallaCompleta).toHaveBeenCalledTimes(1)

    // Comprobar actualización de textos basada en estado de pantalla
    estaPantallaCompleta.mockReturnValue(true)
    pausaUI.actualizarTextos()
    expect(lblPantallaCompleta.setText).toHaveBeenCalledWith('MODO VENTANA')

    estaPantallaCompleta.mockReturnValue(false)
    pausaUI.actualizarTextos()
    expect(lblPantallaCompleta.setText).toHaveBeenCalledWith('PANTALLA COMPLETA')
  })

  it('pulsar Minimapa Toggle alterna el valor en opciones, actualiza etiqueta y reproduce sonido', () => {
    const zonaMinimapa = pausaUI.btnMinimapaToggle.list[0]
    const lblMinimapa = pausaUI.btnMinimapaToggle.list[2]

    obtenerMinimapaHabilitado.mockReturnValue(true)
    zonaMinimapa._handlers['pointerdown']()

    expect(guardarMinimapaHabilitado).toHaveBeenCalledWith(false)
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onMinimapaToggle).toHaveBeenCalledWith(false)

    obtenerMinimapaHabilitado.mockReturnValue(false)
    pausaUI.actualizarTextos()
    expect(lblMinimapa.setText).toHaveBeenCalledWith('MINIMAPA: DESACTIVADO')

    zonaMinimapa._handlers['pointerdown']()
    expect(guardarMinimapaHabilitado).toHaveBeenCalledWith(true)
    expect(onMinimapaToggle).toHaveBeenCalledWith(true)

    obtenerMinimapaHabilitado.mockReturnValue(true)
    pausaUI.actualizarTextos()
    expect(lblMinimapa.setText).toHaveBeenCalledWith('MINIMAPA: ACTIVADO')
  })

  it('pulsar Modo Minimapa alterna entre local y aventura, reproduce sonido y llama a onModoMinimapaChange', () => {
    const zonaModo = pausaUI.btnModoMinimapa.list[0]
    const lblModo = pausaUI.btnModoMinimapa.list[2]

    obtenerModoMinimapa.mockReturnValue('local')
    zonaModo._handlers['pointerdown']()

    expect(guardarModoMinimapa).toHaveBeenCalledWith('aventura')
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(onModoMinimapaChange).toHaveBeenCalledWith('aventura')

    obtenerModoMinimapa.mockReturnValue('aventura')
    pausaUI.actualizarTextos()
    expect(lblModo.setText).toHaveBeenCalledWith('VISTA: AVENTURA')

    zonaModo._handlers['pointerdown']()
    expect(guardarModoMinimapa).toHaveBeenCalledWith('local')
    expect(onModoMinimapaChange).toHaveBeenCalledWith('local')

    obtenerModoMinimapa.mockReturnValue('local')
    pausaUI.actualizarTextos()
    expect(lblModo.setText).toHaveBeenCalledWith('VISTA: SALA ACTUAL')
  })

  it('setInfo actualiza el texto de info', () => {
    pausaUI.setInfo('Texto de prueba')
    expect(pausaUI.info.setText).toHaveBeenCalledWith('Texto de prueba')
  })

  it('setVisible muestra u oculta el contenedor', () => {
    pausaUI.setVisible(true)
    expect(pausaUI.contenedor.setVisible).toHaveBeenCalledWith(true)

    pausaUI.setVisible(false)
    expect(pausaUI.contenedor.setVisible).toHaveBeenCalledWith(false)
  })

  it('relayout reposiciona los elementos correctamente según la vista', async () => {
    const { VISTA } = await import('../../src/core/resolucion.js')

    pausaUI.relayout()

    const cx = VISTA.width / 2
    const cy = VISTA.height / 2

    expect(pausaUI.velo.setPosition).toHaveBeenCalledWith(cx, cy)
    expect(pausaUI.velo.setSize).toHaveBeenCalledWith(VISTA.width, VISTA.height)

    const anchoCaja = Math.min(VISTA.width - 32, 280)
    const altoCaja = 236
    expect(pausaUI.fondo.setPosition).toHaveBeenCalledWith(cx, cy)
    expect(pausaUI.fondo.setSize).toHaveBeenCalledWith(anchoCaja, altoCaja)

    expect(pausaUI.titulo.setPosition).toHaveBeenCalledWith(cx, cy - 98)
    expect(pausaUI.btnReanudar.setPosition).toHaveBeenCalledWith(cx, cy - 56)
    expect(pausaUI.btnMinimapaToggle.setPosition).toHaveBeenCalledWith(cx, cy + 16)
    expect(pausaUI.btnModoMinimapa.setPosition).toHaveBeenCalledWith(cx, cy + 40)
  })

  it('botones cambian color al pasar el puntero sobre ellos (hover)', () => {
    const zonaReanudar = pausaUI.btnReanudar.list[0]
    const cajaReanudar = pausaUI.btnReanudar.list[1]

    zonaReanudar._handlers['pointerover']()
    expect(cajaReanudar.setFillStyle).toHaveBeenCalledWith(0x353e4c, 1)

    zonaReanudar._handlers['pointerout']()
    expect(cajaReanudar.setFillStyle).toHaveBeenCalledWith(0x1f242c, 0.9)
  })
})
