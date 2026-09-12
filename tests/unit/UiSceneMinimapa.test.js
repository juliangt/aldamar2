import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/ui/MinimapaUI.js', () => {
  return {
    default: vi.fn(function () {
      this.actualizar = vi.fn()
      this.relayout = vi.fn()
      this.setVisible = vi.fn()
    }),
  }
})

vi.mock('../../src/ui/DialogBox.js', () => ({
  default: vi.fn(function () {
    this.escena = { events: { on: vi.fn() } }
    this.relayout = vi.fn()
  }),
}))

vi.mock('../../src/ui/SelectorOpciones.js', () => ({
  default: vi.fn(function () {
    this.relayout = vi.fn()
  }),
}))

vi.mock('../../src/ui/MenuTactil.js', () => ({
  default: vi.fn(function () {
    this.relayout = vi.fn()
    this.setVisible = vi.fn()
    this.setBloqueado = vi.fn()
  }),
}))

vi.mock('../../src/ui/InventarioUI.js', () => ({
  default: vi.fn(function () {
    this.relayout = vi.fn()
  }),
}))

vi.mock('../../src/ui/TiendaUI.js', () => ({
  default: vi.fn(function () {
    this.relayout = vi.fn()
  }),
}))

vi.mock('../../src/ui/PausaUI.js', () => ({
  default: vi.fn(function (escena, opts) {
    this.opts = opts
    this.relayout = vi.fn()
    this.setVisible = vi.fn()
    this.actualizarTextos = vi.fn()
    this.setInfo = vi.fn()
  }),
}))

vi.mock('../../src/core/resolucion.js', () => ({
  VISTA: { width: 480, height: 270 },
  aplicarRes: vi.fn(),
  alRelayout: vi.fn(),
}))

import { UiScene } from '../../src/scenes/UiScene.js'
import MinimapaUI from '../../src/ui/MinimapaUI.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('UiScene Minimapa Integration', () => {
  let uiScene
  let mockEscena

  beforeEach(() => {
    vi.clearAllMocks()
    mockEscena = crearMockEscena()
    uiScene = new UiScene()
    Object.assign(uiScene, mockEscena)
    uiScene.scene = { get: vi.fn() }
    uiScene.time = { delayedCall: vi.fn() }
  })

  it('crea MinimapaUI si se pasa mapaInfo en init()', () => {
    const mapaInfo = {
      mapaWidth: 400,
      mapaHeight: 300,
      salidas: [{ x: 10, y: 10 }],
    }
    uiScene.init({ nombre: 'Aldea', mapaInfo })
    uiScene.create()

    expect(MinimapaUI).toHaveBeenCalledWith(uiScene, mapaInfo)
    expect(uiScene.minimapa).toBeDefined()
  })

  it('no crea MinimapaUI si no hay mapaInfo (escena sin mapa)', () => {
    uiScene.init({ nombre: 'Menu' })
    uiScene.create()

    expect(MinimapaUI).not.toHaveBeenCalled()
    expect(uiScene.minimapa).toBeUndefined()
  })

  it('actualizarMinimapa delega en minimapa.actualizar', () => {
    uiScene.init({
      mapaInfo: { mapaWidth: 100, mapaHeight: 100 },
    })
    uiScene.create()

    uiScene.actualizarMinimapa(45, 60)
    expect(uiScene.minimapa.actualizar).toHaveBeenCalledWith(45, 60)
  })

  it('relayout invoca minimapa.relayout', () => {
    uiScene.init({
      mapaInfo: { mapaWidth: 100, mapaHeight: 100 },
    })
    uiScene.create()

    uiScene.relayout()
    expect(uiScene.minimapa.relayout).toHaveBeenCalled()
  })

  it('onMinimapaToggle de PausaUI cambia la visibilidad del minimapa', () => {
    uiScene.init({
      mapaInfo: { mapaWidth: 100, mapaHeight: 100 },
    })
    uiScene.create()

    const onMinimapaToggle = uiScene.pausa.opts.onMinimapaToggle
    expect(onMinimapaToggle).toBeDefined()

    onMinimapaToggle(false)
    expect(uiScene.minimapa.setVisible).toHaveBeenCalledWith(false)

    onMinimapaToggle(true)
    expect(uiScene.minimapa.setVisible).toHaveBeenCalledWith(true)
  })
})
