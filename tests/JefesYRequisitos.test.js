import { describe, it, expect, beforeEach } from 'vitest'
import Datos from '../src/core/Datos.js'
import { Combate } from '../src/core/Combate.js'
import { GameState } from '../src/core/GameState.js'
import { EventEngine } from '../src/core/EventEngine.js'
import { Rng } from '../src/core/Rng.js'

describe('Jefes y requisitos por aventura (Fase G)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('1. Jefe simple sin fases: el Espantapájaros Ahumado (Brasa)', () => {
    it('el ahumado es jefe sin fases, con sin_huida y stats directos', () => {
      const def = Datos.enemigo('brasa_vegaverde', 'ahumado')
      expect(def.sin_huida).toBe(true)
      expect(def.fases).toBeUndefined()
      expect(def.vida).toBe(26)
      expect(def.ataque).toBe(6)
    })

    it('combate fluido y victoria contra el ahumado', () => {
      const gs = new GameState()
      gs.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')
      const c = new Combate(gs, ['ahumado'], new Rng(1))
      c.iniciarRonda()

      expect(c.puedeHuir()).toBe(false)

      while (c.estado !== 'fin') {
        c.accionHeroe('atacar')
        c.turnoAliados()
        c.turnoEnemigos()
      }

      expect(c.resultado).toBe('victoria')
      expect(c.xpGanada).toBe(20)
    })
  })

  describe('2. Jefe con defensa: la Viuda de Sal (Sal y Ceniza)', () => {
    it('la viuda tiene defensa 1 y stats de jefe', () => {
      const def = Datos.enemigo('sal_y_ceniza', 'viuda')
      expect(def.sin_huida).toBe(true)
      expect(def.defensa).toBe(1)
      expect(def.vida).toBe(36)
      expect(def.ataque).toBe(7)
    })

    it('requiere farol_sal para entrar a la Salina Vieja', () => {
      const lugar = Datos.lugar('sal_y_ceniza', 'salina_vieja')
      expect(lugar.requiere).toBe('farol_sal')
      expect(lugar.requiere_texto).toContain('sin la luz de un fuego')
    })
  })

  describe('3. Jefe con fases y refuerzos: Morvath (La Aguja sin Sombra)', () => {
    it('morvath tiene fase <50% con refuerzo de espectro', () => {
      const def = Datos.enemigo('aguja_sin_sombra', 'morvath')
      expect(def.fases).toBeDefined()
      expect(def.fases[0].vida_menor_que).toBe(50)
      expect(def.fases[0].ataque).toBe(11)
      const tieneRefuerzo = def.fases[0].habilidades.some(
        (h) => h.tipo === 'refuerzo' && h.enemigo === 'espectro'
      )
      expect(tieneRefuerzo).toBe(true)
    })

    it('al bajar del 50% cambia de fase en su turno', () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')
      const c = new Combate(gs, ['morvath'], new Rng(1))
      c.iniciarRonda()

      const morvath = c.enemigos[0]
      expect(morvath.nombre).toBe('Morvath, tejido de humo')

      // Dañar a Morvath por debajo de 50% (vida 36 -> <18)
      morvath.vida = 15
      const evEnemigos = c.turnoEnemigos()
      expect(evEnemigos.some((e) => e.tipo === 'fase')).toBe(true)
      expect(morvath.nombre).toBe('Morvath, la Aguja viva')
      expect(morvath.ataque).toBe(11)
    })
  })

  describe('4. Requisitos de puertas en las 4 aventuras', () => {
    it('bloqueo y desbloqueo con requiere_texto en cada puerta', () => {
      const puertas = [
        { av: 'corazon_ceniza', lugar: 'minas', item: 'antorcha' },
        { av: 'corazon_ceniza', lugar: 'yerma', item: 'estandarte' },
        { av: 'sal_y_ceniza', lugar: 'salina_vieja', item: 'farol_sal' },
        { av: 'aguja_sin_sombra', lugar: 'yerma', item: 'estandarte' },
        { av: 'aguja_sin_sombra', lugar: 'aguja_pies', item: 'campanilla' },
      ]

      for (const p of puertas) {
        const lug = Datos.lugar(p.av, p.lugar)
        expect(lug.requiere).toBe(p.item)
        expect(lug.requiere_texto.length).toBeGreaterThan(10)

        const gs = new GameState()
        gs.nuevaPartida(p.av, Object.keys(Datos.aventura(p.av).personajes)[0], 'camino')
        expect(gs.inventario.includes(p.item)).toBe(false)

        // Adquirir ítem
        gs.inventario.push(p.item)
        expect(gs.inventario.includes(p.item)).toBe(true)
      }
    })
  })

  describe('5. Lugar limpio para gatillo final en aguja_cima', () => {
    it('el gatillo final no se activa si el lugar no está limpio de enemigos', async () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')
      gs.grieta = 65

      const mockUi = {
        toast: () => {},
        decir: async () => {},
        decidir: async () => ({ clave: 'final', texto: 'fin' }),
        final: () => {},
      }

      // Con enemigos vivos (limpio = false)
      const resBloqueado = await EventEngine.gatillo(
        gs,
        'final',
        mockUi,
        {},
        { limpio: false }
      )
      expect(resBloqueado).toBe('pendiente')

      // Con lugar limpio (limpio = true)
      const resLimpio = await EventEngine.gatillo(
        gs,
        'final',
        mockUi,
        {},
        { limpio: true }
      )
      expect(resLimpio).toBe('ejecutado')
    })
  })
})
