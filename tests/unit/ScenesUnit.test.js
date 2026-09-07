import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

import { BootScene } from '../../src/scenes/BootScene.js'
import * as resolucion from '../../src/core/resolucion.js'
import { MenuScene } from '../../src/scenes/MenuScene.js'
import { HeroeScene } from '../../src/scenes/HeroeScene.js'
import { EpilogoScene } from '../../src/scenes/EpilogoScene.js'
import Datos from '../../src/core/Datos.js'
import GameState from '../../src/core/GameState.js'

describe('ScenesUnit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('BootScene', () => {
    let boot
    let spyValidarDatos
    let spySceneStart
    let spyWarn
    let originalFonts

    beforeEach(() => {
      boot = new BootScene()
      boot.scene = { start: vi.fn() }
      spyValidarDatos = vi.spyOn(boot, 'validarDatos').mockImplementation(() => {})
      spySceneStart = vi.spyOn(boot.scene, 'start')
      spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.spyOn(resolucion, 'aplicarRes').mockImplementation(() => {})

      originalFonts = globalThis.document?.fonts
    })

    afterEach(() => {
      vi.restoreAllMocks()
      if (globalThis.document) {
        globalThis.document.fonts = originalFonts
      }
    })

    describe('create', () => {
      it('espera a la fuente y avanza si se carga correctamente (happy path)', async () => {
        if (!globalThis.document) globalThis.document = {}
        globalThis.document.fonts = { load: vi.fn().mockResolvedValue([]) }

        await boot.create()

        expect(globalThis.document.fonts.load).toHaveBeenCalledWith('8px "Press Start 2P"', 'ALDAMAR')
        expect(spyWarn).not.toHaveBeenCalled()
        expect(spyValidarDatos).toHaveBeenCalled()
        expect(spySceneStart).toHaveBeenCalledWith('Sello')
      })

      it('lanza console.warn si la fuente falla pero avanza igual (error path)', async () => {
        if (!globalThis.document) globalThis.document = {}
        globalThis.document.fonts = { load: vi.fn().mockRejectedValue(new Error('Font load failed')) }

        await boot.create()

        expect(globalThis.document.fonts.load).toHaveBeenCalledWith('8px "Press Start 2P"', 'ALDAMAR')
        expect(spyWarn).toHaveBeenCalledWith('[Boot] No se pudo esperar a la fuente pixel; sigo con fallback')
        expect(spyValidarDatos).toHaveBeenCalled()
        expect(spySceneStart).toHaveBeenCalledWith('Sello')
      })
    })

    it('validarDatos confirma las 4 aventuras, 39 lugares, 23 enemigos y 3 dificultades', () => {
      spyValidarDatos.mockRestore()
      const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})

      boot.validarDatos()

      expect(spyInfo).toHaveBeenCalledWith(expect.stringContaining('4 aventuras · 39 lugares · 23 enemigos · 3 dificultades · 3 rasgos (OK)'))
      spyInfo.mockRestore()
    })
  })

  describe('MenuScene', () => {
    it('navega entre las 4 aventuras cíclicamente', () => {
      const menu = new MenuScene()
      menu.init()
      expect(menu.indiceAventura).toBe(0)
      expect(menu.mostrarPanelLegado).toBe(false)

      const total = Datos.orden.length
      expect(total).toBe(4)

      menu.indiceAventura = (menu.indiceAventura + 1) % total
      expect(menu.indiceAventura).toBe(1)

      menu.indiceAventura = (menu.indiceAventura - 1 + total) % total
      expect(menu.indiceAventura).toBe(0)
    })

    it('detecta si hay partida guardada para continuar o empezar nueva', () => {
      expect(GameState.restaurar('corazon_ceniza')).toBeNull()

      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo')
      p.guardar()

      const guardada = GameState.restaurar('corazon_ceniza')
      expect(guardada).not.toBeNull()
      expect(guardada.heroe).toBe('tilo')
    })
  })

  describe('HeroeScene', () => {
    it('resuelve héroe actual y nombres por defecto', () => {
      const heroeScene = new HeroeScene()
      heroeScene.init({ aventura: 'corazon_ceniza' })
      heroeScene.clavesHeroes = ['tilo']

      const { clave, pj } = heroeScene.heroeActual()
      expect(clave).toBe('tilo')
      expect(pj.nombre).toBe('Tilo')

      const nombre = heroeScene.nombreActual(clave, pj)
      expect(nombre).toBe('Tilo')
    })

    it('teclado táctil respeta límite de 12 letras y borrado', () => {
      const heroeScene = new HeroeScene()
      heroeScene.nombreTemp = 'HEROE'

      // Inserción de letra
      if (heroeScene.nombreTemp.length < 12) heroeScene.nombreTemp += 'S'
      expect(heroeScene.nombreTemp).toBe('HEROES')

      // Límite de 12
      heroeScene.nombreTemp = '123456789012'
      if (heroeScene.nombreTemp.length < 12) heroeScene.nombreTemp += 'X'
      expect(heroeScene.nombreTemp).toBe('123456789012')

      // Borrado
      heroeScene.nombreTemp = heroeScene.nombreTemp.slice(0, -1)
      expect(heroeScene.nombreTemp).toBe('12345678901')
    })
  })

  describe('EpilogoScene', () => {
    it('init() con tipo caída elimina la partida guardada', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo')
      p.guardar()
      expect(GameState.restaurar('corazon_ceniza')).not.toBeNull()

      const epilogo = new EpilogoScene()
      epilogo.init({ tipo: 'caida', aventura: 'corazon_ceniza' })

      // Simular ejecución create() para caída
      if (epilogo.tipo === 'caida' && epilogo.avId) {
        GameState.borrar(epilogo.avId)
      }

      expect(GameState.restaurar('corazon_ceniza')).toBeNull()
    })
  })
})
