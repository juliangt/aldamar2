import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/opciones.js', () => ({
  obtenerMinimapaHabilitado: vi.fn(() => true),
  guardarMinimapaHabilitado: vi.fn(),
  obtenerModoMinimapa: vi.fn(() => 'local'),
  guardarModoMinimapa: vi.fn(),
}))

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import { MinimapaUI } from '../../src/ui/MinimapaUI.js'
import {
  obtenerMinimapaHabilitado,
  obtenerModoMinimapa,
  guardarModoMinimapa,
} from '../../src/core/opciones.js'
import { audio8 } from '../../src/core/Audio8.js'
import { crearMockEscena } from '../helpers/phaser.js'
import { VISTA } from '../../src/core/resolucion.js'

describe('MinimapaUI Unit Tests', () => {
  let escena
  let minimapa

  beforeEach(() => {
    vi.clearAllMocks()
    obtenerMinimapaHabilitado.mockReturnValue(true)
    obtenerModoMinimapa.mockReturnValue('local')
    escena = crearMockEscena()
  })

  it('inicializa contenedor con profundidad, fondo translúcido y elementos', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 640,
      mapaHeight: 448,
      salidas: [{ x: 320, y: 0, dir: 'N' }],
      aventuraId: 'corazon_ceniza',
      lugarId: 'vegaverde',
    })

    expect(minimapa.contenedor).toBeDefined()
    expect(minimapa.contenedor.setDepth).toHaveBeenCalledWith(1500)
    expect(minimapa.fondo).toBeDefined()
    expect(minimapa.marcadorJugador).toBeDefined()
    expect(minimapa.gfxSalidas).toBeDefined()
    expect(minimapa.gfxObstaculos).toBeDefined()
    expect(minimapa.gfxGrafo).toBeDefined()
    expect(minimapa.zonaClick).toBeDefined()
  })

  it('respeta la visibilidad inicial según las opciones guardadas', () => {
    obtenerMinimapaHabilitado.mockReturnValue(false)
    minimapa = new MinimapaUI(escena, { mapaWidth: 400, mapaHeight: 300 })

    expect(minimapa.habilitado).toBe(false)
    expect(minimapa.contenedor.setVisible).toHaveBeenCalledWith(false)
  })

  it('actualizar(x, y) posiciona el marcador del jugador en modo local', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 100,
      mapaHeight: 100,
    })

    minimapa.actualizar(50, 50)
    expect(minimapa.marcadorJugador.setPosition).toHaveBeenCalledWith(0, 0)

    minimapa.actualizar(0, 0)
    expect(minimapa.marcadorJugador.setPosition).toHaveBeenCalledWith(
      -minimapa.miniW / 2,
      -minimapa.miniH / 2
    )
  })

  it('actualizar(x, y) limita coordenadas fuera de rango (clamp)', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 100,
      mapaHeight: 100,
    })

    minimapa.actualizar(-50, 200)
    expect(minimapa.marcadorJugador.setPosition).toHaveBeenCalledWith(
      -minimapa.miniW / 2,
      minimapa.miniH / 2
    )
  })

  it('actualizar(x, y) no mueve el marcador si el modo es aventura', () => {
    obtenerModoMinimapa.mockReturnValue('aventura')
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 100,
      mapaHeight: 100,
      aventuraId: 'corazon_ceniza',
      lugarId: 'vegaverde',
    })

    minimapa.marcadorJugador.setPosition.mockClear()
    minimapa.actualizar(25, 25)
    expect(minimapa.marcadorJugador.setPosition).not.toHaveBeenCalled()
  })

  it('alternarModo cambia de local a aventura y viceversa, emitiendo sonido y guardando', () => {
    const onModoChange = vi.fn()
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 200,
      mapaHeight: 200,
      aventuraId: 'corazon_ceniza',
      lugarId: 'vegaverde',
      onModoChange,
    })

    expect(minimapa.modo).toBe('local')

    // Tocar zona para alternar a aventura
    minimapa.zonaClick._handlers['pointerdown']()

    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(guardarModoMinimapa).toHaveBeenCalledWith('aventura')
    expect(minimapa.modo).toBe('aventura')
    expect(onModoChange).toHaveBeenCalledWith('aventura')

    // Alternar de vuelta a local
    minimapa.zonaClick._handlers['pointerdown']()
    expect(guardarModoMinimapa).toHaveBeenCalledWith('local')
    expect(minimapa.modo).toBe('local')
    expect(onModoChange).toHaveBeenCalledWith('local')
  })

  it('modo aventura muestra el grafo de la aventura y el destino final', () => {
    obtenerModoMinimapa.mockReturnValue('aventura')
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 200,
      mapaHeight: 200,
      aventuraId: 'corazon_ceniza',
      lugarId: 'vegaverde',
    })

    expect(minimapa.txtAventuraInfo.setText).toHaveBeenCalledWith('DESTINO: UMBAK')
    expect(minimapa.txtAventuraLugar.setText).toHaveBeenCalledWith('VEGAVERDE')
    expect(minimapa.gfxGrafo.clear).toHaveBeenCalled()
    expect(minimapa.gfxGrafo.strokePath).toHaveBeenCalled()
  })

  it('modo aventura muestra zona final cuando el jugador llega al destino', () => {
    obtenerModoMinimapa.mockReturnValue('aventura')
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 200,
      mapaHeight: 200,
      aventuraId: 'corazon_ceniza',
      lugarId: 'umbak',
    })

    expect(minimapa.txtAventuraInfo.setText).toHaveBeenCalledWith('¡ZONA FINAL!')
    expect(minimapa.txtAventuraInfo.setColor).toHaveBeenCalledWith('#e0c04a')
  })

  it('relayout ubica el minimapa en la esquina superior derecha según el modo', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 320,
      mapaHeight: 240,
    })

    minimapa.relayout()
    const anchoTotal = minimapa.anchoLocal
    const esperadoX = VISTA.width - (anchoTotal / 2 + 8)
    expect(minimapa.contenedor.setPosition).toHaveBeenCalledWith(esperadoX, expect.any(Number))

    minimapa.setModo('aventura')
    const esperadoXAventura = VISTA.width - (minimapa.anchoAventura / 2 + 8)
    expect(minimapa.contenedor.setPosition).toHaveBeenCalledWith(esperadoXAventura, expect.any(Number))
  })

  it('setVisible conmuta el estado y la visibilidad del contenedor', () => {
    minimapa = new MinimapaUI(escena, { mapaWidth: 200, mapaHeight: 200 })

    minimapa.setVisible(false)
    expect(minimapa.habilitado).toBe(false)
    expect(minimapa.contenedor.setVisible).toHaveBeenCalledWith(false)

    minimapa.setVisible(true)
    expect(minimapa.habilitado).toBe(true)
    expect(minimapa.contenedor.setVisible).toHaveBeenCalledWith(true)
  })

  it('dibujarSalidas dibuja marcadores en gfxSalidas', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 200,
      mapaHeight: 200,
      salidas: [
        { x: 100, y: 0, dir: 'N' },
        { x: 100, y: 200, dir: 'S' },
      ],
    })

    expect(minimapa.gfxSalidas.clear).toHaveBeenCalled()
    expect(minimapa.gfxSalidas.fillRect).toHaveBeenCalledTimes(2)
  })

  it('destruir elimina el contenedor', () => {
    minimapa = new MinimapaUI(escena, { mapaWidth: 100, mapaHeight: 100 })
    minimapa.destruir()
    expect(minimapa.contenedor.destroy).toHaveBeenCalled()
  })
})
