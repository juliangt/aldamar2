import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/opciones.js', () => ({
  obtenerMinimapaHabilitado: vi.fn(() => true),
  guardarMinimapaHabilitado: vi.fn(),
}))

import { MinimapaUI } from '../../src/ui/MinimapaUI.js'
import { obtenerMinimapaHabilitado } from '../../src/core/opciones.js'
import { crearMockEscena } from '../helpers/phaser.js'
import { VISTA } from '../../src/core/resolucion.js'

describe('MinimapaUI Unit Tests', () => {
  let escena
  let minimapa

  beforeEach(() => {
    vi.clearAllMocks()
    obtenerMinimapaHabilitado.mockReturnValue(true)
    escena = crearMockEscena()
  })

  it('inicializa contenedor con profundidad, fondo translúcido y elementos', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 640,
      mapaHeight: 448,
      salidas: [{ x: 320, y: 0, dir: 'N' }],
    })

    expect(minimapa.contenedor).toBeDefined()
    expect(minimapa.contenedor.setDepth).toHaveBeenCalledWith(1500)
    expect(minimapa.fondo).toBeDefined()
    expect(minimapa.fondo.setStrokeStyle).toHaveBeenCalledWith(1, 0x556070, 0.85)
    expect(minimapa.marcadorJugador).toBeDefined()
    expect(minimapa.gfxSalidas).toBeDefined()
    expect(minimapa.gfxObstaculos).toBeDefined()
  })

  it('respeta la visibilidad inicial según las opciones guardadas', () => {
    obtenerMinimapaHabilitado.mockReturnValue(false)
    minimapa = new MinimapaUI(escena, { mapaWidth: 400, mapaHeight: 300 })

    expect(minimapa.habilitado).toBe(false)
    expect(minimapa.contenedor.setVisible).toHaveBeenCalledWith(false)
  })

  it('actualizar(x, y) posiciona el marcador del jugador proporcionalmente', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 100,
      mapaHeight: 100,
    })

    // Centro del mapa (50, 50) -> coordenadas relativas centradas (0, 0)
    minimapa.actualizar(50, 50)
    expect(minimapa.marcadorJugador.setPosition).toHaveBeenCalledWith(0, 0)

    // Esquina superior izquierda (0, 0)
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
    // -50 debe clampearse a 0 (-miniW/2), y 200 a 100 (miniW/2)
    expect(minimapa.marcadorJugador.setPosition).toHaveBeenCalledWith(
      -minimapa.miniW / 2,
      minimapa.miniH / 2
    )
  })

  it('relayout ubica el minimapa en la esquina superior derecha sin tapar menús', () => {
    minimapa = new MinimapaUI(escena, {
      mapaWidth: 320,
      mapaHeight: 240,
    })

    minimapa.relayout()
    const anchoTotal = minimapa.miniW + 6
    const altoTotal = minimapa.miniH + 6
    const esperadoX = VISTA.width - (anchoTotal / 2 + 8)
    const esperadoY = 56 + altoTotal / 2

    expect(minimapa.contenedor.setPosition).toHaveBeenCalledWith(esperadoX, esperadoY)
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

  it('dibujarObstaculos dibuja celdas colisionables', () => {
    const mockCapaObstaculos = {
      layer: {
        data: [
          [
            { index: 1, collides: true, width: 16, height: 16 },
            { index: 0, collides: false, width: 16, height: 16 },
          ],
        ],
      },
    }

    minimapa = new MinimapaUI(escena, {
      mapaWidth: 32,
      mapaHeight: 16,
      capaObstaculos: mockCapaObstaculos,
    })

    expect(minimapa.gfxObstaculos.clear).toHaveBeenCalled()
    expect(minimapa.gfxObstaculos.fillRect).toHaveBeenCalledTimes(1)
  })

  it('destruir elimina el contenedor', () => {
    minimapa = new MinimapaUI(escena, { mapaWidth: 100, mapaHeight: 100 })
    minimapa.destruir()
    expect(minimapa.contenedor.destroy).toHaveBeenCalled()
  })
})
