import { describe, it, expect, beforeEach } from 'vitest'
import { Combate } from '../src/core/Combate.js'
import { GameState } from '../src/core/GameState.js'
import { Balance } from '../src/core/Balance.js'
import Datos from '../src/core/Datos.js'
import { Rng } from '../src/core/Rng.js'

describe('Fase H — Calibración y Cierre del Apéndice A', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('Punto 1: Fórmula del comando especial', () => {
    it('calcula dano_base + dano_por_corrupcion * floor(grieta / 10)', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      p.grieta = 35 // 35 / 10 = 3 tramos
      const c = new Combate(p, ['lobo'], new Rng(1))
      c.iniciarRonda()
      const ev = c.accionHeroe('corazon', { objetivoIdx: 0 })
      const danoEv = ev.find((e) => e.tipo === 'dano')
      // corazon_ceniza: base 12 + 3 * 3 = 21
      expect(danoEv.cantidad).toBe(21)
      // coste 15 en camino -> grieta = 35 + 15 = 50
      expect(p.grieta).toBe(50)
    })
  })

  describe('Punto 2: Semántica cada_n_turnos y telegraph de golpe_fuerte', () => {
    it('el telegraph prepara daño extra en turno N y lo desata en turno N+1', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      const c = new Combate(p, ['lobo'], new Rng(1))
      c.iniciarRonda()
      const lobo = c.enemigos[0]
      lobo.telegraph = 5
      const vidaAntes = c.heroe().vida
      // Turno del lobo: ataque 3 + telegraph 5 = 8
      const ev = c.turnoEnemigos()
      const danoEv = ev.find((e) => e.tipo === 'dano' && e.lado === 'heroes')
      expect(danoEv.cantidad).toBe(8)
      expect(c.heroe().vida).toBe(vidaAntes - 8)
      expect(lobo.telegraph).toBe(0)
    })
  })

  describe('Punto 3: Ticks de veneno', () => {
    it('hace tick al inicio de la ronda y se consume turno a turno', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      const c = new Combate(p, ['lobo'], new Rng(1))
      c.heroe().veneno = { dano: 3, turnos: 2 }
      const vida0 = c.heroe().vida
      c.iniciarRonda()
      expect(c.heroe().vida).toBe(vida0 - 3)
      expect(c.heroe().veneno.turnos).toBe(1)
      c.iniciarRonda()
      expect(c.heroe().vida).toBe(vida0 - 6)
      expect(c.heroe().veneno).toBeNull()
    })
  })

  describe('Punto 4: Progresión de XP y curva de niveles', () => {
    it('sube de nivel a los 30*n acumulados (+5 PV máx, +1 ataque en niveles pares)', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      const c = new Combate(p, ['lobo'], new Rng(1))
      const atq0 = p.stats.ataque
      const pv0 = p.stats.vidaMax

      // Subida a nivel 2: necesita 30 XP
      c.ganarXp(30)
      expect(p.nivel).toBe(2)
      expect(p.stats.vidaMax).toBe(pv0 + 5)
      expect(p.stats.ataque).toBe(atq0 + 1) // nivel par gana ataque

      // Subida a nivel 3: necesita 60 XP adicionales
      c.ganarXp(60)
      expect(p.nivel).toBe(3)
      expect(p.stats.vidaMax).toBe(pv0 + 10)
      expect(p.stats.ataque).toBe(atq0 + 1) // nivel impar no gana ataque
    })
  })

  describe('Punto 5: Reglas de huida', () => {
    it('los jefes y enemigos con sinHuida impiden huir siempre', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      const c = new Combate(p, ['custodio'], new Rng(1))
      c.iniciarRonda()
      expect(c.puedeHuir()).toBe(false)
      expect(c.intentarHuida().huida).toBe(false)
    })
  })

  describe('Punto 6: Cuerno de Valoria', () => {
    it('no se consume al intentar usarlo contra jefes', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      p.inventario.push('cuerno_valoria')
      const c = new Combate(p, ['custodio'], new Rng(1))
      c.iniciarRonda()
      c.usarCuerno()
      expect(p.inventario).toContain('cuerno_valoria')
      expect(c.resultado).toBeNull()
    })
  })

  describe('Punto 7: Recuperación de aliados caídos', () => {
    it('los aliados caídos se levantan con 1 PV tras victoria', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      p.companeros = ['sylvana']
      p.companerosSalud = { sylvana: { vida: 10, vidaMax: 18 } }
      const c = new Combate(p, ['lobo'], new Rng(1))
      c.iniciarRonda()
      c.heroes[1].vida = 0
      c.heroes[1].vivo = false
      c.resultado = 'victoria'
      c.aplicarResultado()
      expect(p.companerosSalud.sylvana.vida).toBe(1)
    })
  })

  describe('Punto 11: Lengua de mercado y precio mínimo', () => {
    it('Lengua de mercado descuenta 1 moneda pero nunca baja de 0', () => {
      const p = new GameState()
      p.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      // Tilo no tiene lengua_mercado
      expect(p.tieneLenguaMercado()).toBe(false)

      const pRuy = new GameState()
      pRuy.nuevaPartida('corazon_ceniza', 'ruy', 'camino')
      // Ruy tiene lengua_mercado
      expect(pRuy.tieneLenguaMercado()).toBe(true)
      const precioNormal = Datos.item('corazon_ceniza', 'antorcha').precio
      expect(pRuy.precioEfectivo('antorcha')).toBe(Math.max(0, precioNormal - 1))
    })
  })

  describe('Comparativa de las 3 dificultades (paseo, camino, ceniza)', () => {
    it('paseo otorga más vida al héroe y debilita a los enemigos', () => {
      const pPaseo = new GameState().nuevaPartida('corazon_ceniza', 'tilo', 'paseo')
      const pCamino = new GameState().nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      const pCeniza = new GameState().nuevaPartida('corazon_ceniza', 'tilo', 'ceniza')

      expect(pPaseo.stats.vidaMax).toBeGreaterThan(pCamino.stats.vidaMax)
      expect(pCamino.stats.vidaMax).toBeGreaterThan(pCeniza.stats.vidaMax)

      const cPaseo = new Combate(pPaseo, ['custodio'], new Rng(1))
      const cCamino = new Combate(pCamino, ['custodio'], new Rng(1))
      const cCeniza = new Combate(pCeniza, ['custodio'], new Rng(1))

      expect(cPaseo.enemigos[0].vida).toBeLessThan(cCamino.enemigos[0].vida)
      expect(cCamino.enemigos[0].vida).toBeLessThan(cCeniza.enemigos[0].vida)
      expect(cPaseo.enemigos[0].ataque).toBeLessThan(cCamino.enemigos[0].ataque)
      expect(cCamino.enemigos[0].ataque).toBeLessThan(cCeniza.enemigos[0].ataque)
    })
  })
})
