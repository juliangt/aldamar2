import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => {
  class Scene {
    constructor(key) {
      this.key = key
    }
  }
  return {
    default: {
      Scene,
      Scenes: {
        Events: {
          WAKE: 'wake',
          SLEEP: 'sleep',
        },
      },
      Input: {
        Keyboard: {
          JustDown: vi.fn(),
        },
      },
    },
    Scene,
  }
})

vi.mock('../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
    iniciarAmbiente: vi.fn(),
    detenerAmbiente: vi.fn(),
  },
  obtenerBioma: vi.fn().mockReturnValue('camino'),
}))

vi.mock('../src/assets/heroe.png', () => ({
  default: 'mock-heroe.png',
}))

import BattleScene from '../src/scenes/BattleScene.js'
import { WorldScene } from '../src/scenes/WorldScene.js'

describe('BattleScene transitions and safety fixes', () => {
  let battle

  beforeEach(() => {
    battle = new BattleScene()
    battle.datosEntrada = { idx: 2 }
    battle.origen = 'World'
    battle.time = {
      delayedCall: vi.fn((ms, cb) => {
        cb()
        return { remove: vi.fn() }
      }),
    }
    battle.cameras = {
      main: {
        fadeOut: vi.fn(),
        once: vi.fn((event, cb) => {
          if (event === 'camerafadeoutcomplete') cb()
        }),
      },
    }
    battle.scene = {
      wake: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
      isActive: vi.fn().mockReturnValue(false),
    }
  })

  it('acabar wakes World before stopping Battle', async () => {
    const callOrder = []
    battle.scene.wake.mockImplementation(() => callOrder.push('wake'))
    battle.scene.stop.mockImplementation(() => callOrder.push('stop'))

    await battle.acabar('victoria')

    expect(battle.scene.wake).toHaveBeenCalledWith('World', { resultado: 'victoria', idx: 2 })
    expect(battle.scene.stop).toHaveBeenCalledWith('Battle')
    expect(callOrder).toEqual(['wake', 'stop'])
  })

  it('acabar resolves via fallback timeout if camerafadeoutcomplete never fires', async () => {
    battle.cameras.main.once = vi.fn() // Camera never emits event
    battle.time.delayedCall = vi.fn() // Clock stalled

    const promise = battle.acabar('victoria')
    await promise

    expect(battle.scene.wake).toHaveBeenCalledWith('World', { resultado: 'victoria', idx: 2 })
    expect(battle.scene.stop).toHaveBeenCalledWith('Battle')
  })

  it('finalizar calls acabar with fallback when resultado is unexpected or null', async () => {
    battle.combate = {
      resultado: 'otro_estado',
      aplicarResultado: vi.fn(),
    }
    battle.acabar = vi.fn().mockResolvedValue()

    await battle.finalizar()

    expect(battle.combate.aplicarResultado).toHaveBeenCalled()
    expect(battle.acabar).toHaveBeenCalledWith('otro_estado')
  })

  it('accion auto-selects enemy 0 if player presses an action button during modoObjetivo', () => {
    battle.combate = { estado: 'objetivo' }
    battle.modoObjetivo = true
    battle.resolveObjetivo = vi.fn()
    battle.tapEnemigo = vi.fn()
    battle.esperandoAccion = false

    battle.accion('atacar')

    expect(battle.tapEnemigo).toHaveBeenCalledWith(0)
  })

  it('refrescarBotones disables interactivity when button is not visible or estado is fin', () => {
    const zona = {
      setVisible: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      disableInteractive: vi.fn().mockReturnThis(),
    }
    const caja = { setVisible: vi.fn() }
    const texto = { setVisible: vi.fn() }

    battle.combate = {
      aventura: 'corazon_ceniza',
      estado: 'fin',
    }
    battle.botones = {
      atacar: { zona, caja, texto },
    }

    battle.refrescarBotones()

    expect(zona.setVisible).toHaveBeenCalledWith(false)
    expect(zona.disableInteractive).toHaveBeenCalled()
    expect(caja.setVisible).toHaveBeenCalledWith(false)
    expect(texto.setVisible).toHaveBeenCalledWith(false)
  })

  it('linea resolves a pending previous line instead of orphaning it (secreto/cuervo hang)', async () => {
    const bs = new BattleScene()
    let autoAvance = null
    bs.time = {
      delayedCall: vi.fn((_ms, cb) => {
        autoAvance = cb
        return { remove: vi.fn() }
      }),
    }
    bs.logTexto = { setText: vi.fn() }

    const p1 = bs.linea('El cuervo planea sobre el combate…')
    // Antes del fix, esta segunda linea() machacaba logResolver y p1
    // nunca se resolvía: el flujo del combate quedaba colgado.
    const p2 = bs.linea('El lobo golpea.')
    await p1

    autoAvance()
    await p2
    expect(bs.logResolver).toBeNull()
  })

  it('flow fallback to acabar("victoria") when an error is thrown', async () => {
    // Setup for bypassing the while loop and causing an error on finalizar
    battle.combate = {
      estado: 'fin',
      enemigos: [{ nombre: 'Enemigo 1' }],
      iniciarRonda: vi.fn().mockReturnValue([])
    }
    battle.linea = vi.fn().mockResolvedValue()
    battle.reproducir = vi.fn().mockResolvedValue()
    battle.finalizar = vi.fn().mockRejectedValue(new Error('Test mock error'))
    battle.acabar = vi.fn().mockResolvedValue()
    battle.setBotonesActivos = vi.fn()
    battle.refrescarBotones = vi.fn()

    // Suppress console.error during this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await battle.flow()

    expect(battle.finalizar).toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('Error en BattleScene.flow:', expect.any(Error))
    expect(battle.acabar).toHaveBeenCalledWith('victoria')

    consoleSpy.mockRestore()
  })
})

describe('WorldScene enemy overlap safety fixes', () => {
  let world

  beforeEach(() => {
    world = Object.create(WorldScene.prototype)
    world.transicionando = false
    world.pausado = false
    world.graciaHuida = 0
    world.game = { loop: { time: 1000 } }
    world.scene = {
      isActive: vi.fn().mockReturnValue(false),
      sleep: vi.fn(),
      launch: vi.fn(),
      wake: vi.fn(),
    }
    world.events = { on: vi.fn() }
    world.lugarId = 'camino'
  })

  it('tocarEnemigo does not lock transicionando when there are no living enemies', () => {
    world.enemigosMapa = [{ id: 'lobo', derrotado: true }]

    world.tocarEnemigo({ id: 'lobo' })

    expect(world.transicionando).toBe(false)
    expect(world.scene.launch).not.toHaveBeenCalled()
  })

  it('tocarEnemigo blocks trigger during graciaHuida based on game loop time', () => {
    world.enemigosMapa = [{ id: 'lobo', derrotado: false }]
    world.graciaHuida = 2000 // future timestamp

    world.tocarEnemigo({ id: 'lobo' })

    expect(world.transicionando).toBe(false)
    expect(world.scene.launch).not.toHaveBeenCalled()
  })

  it('tocarEnemigo transitions and launches battle when valid living enemies exist', () => {
    world.enemigosMapa = [{ id: 'lobo', derrotado: false }]
    world.graciaHuida = 500 // past timestamp

    world.tocarEnemigo({ id: 'lobo' })

    expect(world.transicionando).toBe(true)
    expect(world.scene.launch).toHaveBeenCalledWith('Battle', {
      enemigos: ['lobo'],
      origen: 'World',
      lugar: 'camino',
    })
  })
})
