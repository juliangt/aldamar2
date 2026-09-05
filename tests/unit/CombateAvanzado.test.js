import { describe, it, expect, beforeEach } from 'vitest'
import { Combate } from '../../src/core/Combate.js'
import { GameState } from '../../src/core/GameState.js'
import { Rng } from '../../src/core/Rng.js'

class RngGuion {
  constructor(valores = []) {
    this.valores = [...valores]
  }
  next() {
    return this.valores.length ? this.valores.shift() : 0
  }
  chance(p) {
    return this.next() < p
  }
}

describe('CombateAvanzado Unit Tests', () => {
  let p

  beforeEach(() => {
    localStorage.clear()
    p = new GameState()
    p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-test')
  })

  it('huida con éxito marca resultado como huida y finaliza combate', () => {
    // RngGuion con 0 -> chance(0.5) será true
    const rng = new RngGuion([0])
    const c = new Combate(p, ['lobo'], rng)
    c.iniciarRonda()

    const resHuida = c.accionHeroe('huida')
    expect(resHuida.huida).toBe(true)
    expect(resHuida.eventos.some((e) => e.tipo === 'fin' && e.resultado === 'huida')).toBe(true)
    expect(c.resultado).toBe('huida')
    expect(c.estado).toBe('fin')
  })

  it('huida fallida gasta turno del héroe y permite contraataque enemigo', () => {
    // RngGuion con 1 -> chance(0.5) será false
    const rng = new RngGuion([1, 0, 0])
    const c = new Combate(p, ['lobo'], rng)
    c.iniciarRonda()

    const resHuida = c.accionHeroe('huida')
    expect(resHuida.huida).toBe(false)
    expect(c.resultado).toBeNull()
    expect(c.estado).not.toBe('fin')

    // El lobo contraataca
    const eventosEnemigos = c.turnoEnemigos()
    expect(eventosEnemigos.some((e) => e.tipo === 'dano')).toBe(true)
  })

  it('usarObjeto en combate cura la salud del héroe y consume el ítem', () => {
    p.stats.vida = 10
    p.stats.vidaMax = 40
    p.inventario = ['provisiones']

    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()

    const eventos = c.accionHeroe('objeto', { itemId: 'provisiones' })
    expect(eventos.some((e) => e.tipo === 'curar')).toBe(true)
    expect(c.heroe().vida).toBeGreaterThan(10)
    expect(p.inventario).not.toContain('provisiones')
  })

  it('eventosVeneno resta salud al inicio del turno y reduce contador de veneno', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    const heroe = c.heroe()
    heroe.veneno = { dano: 3, turnos: 2 }
    const vidaInicial = heroe.vida

    const eventos = c.eventosVeneno('heroe', heroe)

    expect(eventos).toHaveLength(1)
    expect(eventos[0].tipo).toBe('dano')
    expect(eventos[0].texto).toContain('veneno')
    expect(heroe.vida).toBe(vidaInicial - 3)
    expect(heroe.veneno.turnos).toBe(1)
  })

  it('enemigo con habilidad especial ejecuta efecto al activarse', () => {
    const c = new Combate(p, ['espectro'], new Rng(42))
    c.iniciarRonda()
    const enemigo = c.enemigos[0]
    enemigo.turnosPropios = 2 // El próximo turno será múltiplo de 3 para activar veneno

    const eventos = c.actuarEnemigo(enemigo)
    expect(eventos.length).toBeGreaterThan(0)
    expect(eventos.some((e) => e.tipo === 'texto' || e.tipo === 'dano')).toBe(true)
  })

  it('compañero aliado ataca en su turno y daña al enemigo objetivo', () => {
    p.companeros = ['sylvana']
    p.companerosSalud = { sylvana: { vida: 18, vidaMax: 18 } }

    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    const vidaPreviaLobo = c.enemigos[0].vida

    const eventosAliados = c.turnoAliados(0)
    expect(eventosAliados.some((e) => e.autor === 'Sylvana de los Faroles')).toBe(true)
    expect(c.enemigos[0].vida).toBeLessThan(vidaPreviaLobo)
  })

  it('aplicarResultado sincroniza salud y otorga XP a la partida', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.heroe().vida = 25
    c.resultado = 'victoria'
    c.xpGanada = 20

    const res = c.aplicarResultado()
    expect(p.stats.vida).toBe(25)
    expect(p.xp).toBe(20)
    expect(res.resultado).toBe('victoria')
  })

  it('ganarXp() con suficiente experiencia sube nivel y mejora estadísticas', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    const vidaMaxPrevia = p.stats.vidaMax
    const ataquePrevio = p.stats.ataque

    // Subir de nivel 1 a 2 requiere 30 XP
    const subidas = c.ganarXp(35)
    expect(subidas).toBe(1)
    expect(p.nivel).toBe(2)
    expect(p.xp).toBe(5)
    expect(p.stats.vidaMax).toBe(vidaMaxPrevia + 5)
    expect(p.stats.ataque).toBe(ataquePrevio + 1) // Nivel par aumenta ataque
  })

  it('derrota del héroe marca fin de combate y estado derrota', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    c.heroe().vida = 0

    const ev = c.chequearFinHeroes()
    expect(ev.some((e) => e.tipo === 'fin' && e.resultado === 'derrota')).toBe(true)
    expect(c.resultado).toBe('derrota')
    expect(c.estado).toBe('fin')
  })
})
