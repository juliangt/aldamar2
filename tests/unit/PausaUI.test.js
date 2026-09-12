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

import { PausaUI } from '../../src/ui/PausaUI.js'
import { audio8 } from '../../src/core/Audio8.js'
import { alternarPantallaCompleta, estaPantallaCompleta } from '../../src/core/pantalla.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('PausaUI Unit Tests', () => {
  let escena
  let onReanudar
  let onSalir
  let pausaUI

  beforeEach(() => {
    vi.clearAllMocks()
    audio8.volumenMaster = 0.8
    audio8.mute = false
    estaPantallaCompleta.mockReturnValue(false)

    escena = crearMockEscena()
    onReanudar = vi.fn()
    onSalir = vi.fn()
    pausaUI = new PausaUI(escena, { onReanudar, onSalir })
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
    const altoCaja = 232
    expect(pausaUI.fondo.setPosition).toHaveBeenCalledWith(cx, cy)
    expect(pausaUI.fondo.setSize).toHaveBeenCalledWith(anchoCaja, altoCaja)

    expect(pausaUI.titulo.setPosition).toHaveBeenCalledWith(cx, cy - 92)
    expect(pausaUI.btnReanudar.setPosition).toHaveBeenCalledWith(cx, cy - 42)
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
