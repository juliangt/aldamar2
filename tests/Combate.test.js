import { describe, it, expect, beforeEach } from 'vitest'
import { Combate } from '../src/core/Combate.js'
import { GameState } from '../src/core/GameState.js'
import { Rng } from '../src/core/Rng.js'

// Tilo (camino): vida 45, ataque 4. Lobo: vida 9, ataque 3, xp 12.
function partida() {
  const p = new GameState()
  p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-fija')
  return p
}

// RNG con respuestas guionizadas: chance() y next() devuelven lo que diga la cola.
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

describe('Combate', () => {
  let p
  beforeEach(() => {
    p = partida()
    localStorage.clear()
  })

  it('construye héroe y enemigos desde el estado de partida', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    expect(c.heroes[0]).toMatchObject({ tipo: 'heroe', vida: 45, ataque: 4 })
    expect(c.enemigos[0]).toMatchObject({ id: 'lobo', vida: 9, ataque: 3, vivo: true })
    expect(c.estado).toBe('intro')
  })

  it('incluir un compañero lo añade como aliado con su salud', () => {
    p.companeros = ['sylvana']
    p.companerosSalud = { sylvana: { vida: 10, vidaMax: 18 } }
    const c = new Combate(p, ['lobo'], new Rng(1))
    expect(c.heroes).toHaveLength(2)
    expect(c.heroes[1]).toMatchObject({ tipo: 'aliado', id: 'sylvana', vida: 10, vidaMax: 18 })
  })

  it('flujo completo contra un lobo termina en victoria con su XP', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    const ronda = c.iniciarRonda()
    expect(ronda.at(-1)).toEqual({ tipo: 'ronda', numero: 1 })
    expect(c.estado).toBe('menu')

    // Daño héroe: 4 − 0 = 4 por golpe; el lobo (9 PV) cae al tercero.
    const golpes = []
    for (let i = 0; i < 3 && c.estado !== 'fin'; i++) {
      golpes.push(...c.accionHeroe('atacar'))
      c.turnoAliados()
      c.turnoEnemigos()
    }
    expect(golpes.some((e) => e.tipo === 'muerte')).toBe(true)
    expect(c.resultado).toBe('victoria')
    expect(c.xpGanada).toBe(12)
  })

  it('la derrota del héroe termina el combate', () => {
    const c = new Combate(p, ['custodio'], new Rng(1))
    c.iniciarRonda()
    c.heroe().vida = 1
    c.accionHeroe('atacar')
    const ev = c.turnoEnemigos()
    expect(ev.some((e) => e.tipo === 'derrota')).toBe(true)
    expect(c.resultado).toBe('derrota')
    expect(c.estado).toBe('fin')
  })

  it('aplicarResultado sincroniza PV y otorga XP con subidas de nivel', () => {
    p.xp = 20 // a 30 sube de nivel
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    c.accionHeroe('atacar')
    c.accionHeroe('atacar')
    c.accionHeroe('atacar')
    expect(c.resultado).toBe('victoria')
    const res = c.aplicarResultado()
    expect(res.xp).toBe(12)
    expect(res.subidasNivel).toBe(1)
    expect(p.nivel).toBe(2)
    expect(p.stats.vidaMax).toBe(50) // +5 PV por nivel
  })

  it('ganarXp encadena varias subidas y sube ataque en niveles pares', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    expect(c.ganarXp(100)).toBe(2) // 30 (nivel 1) + 60 (nivel 2), sobran 10
    expect(p.nivel).toBe(3)
    expect(p.stats.ataque).toBe(5) // +1 solo al subir al nivel 2 (par)
  })

  it('huida con éxito y fracaso según el rng', () => {
    const ok = new Combate(p, ['lobo'], new RngGuion([0.4]))
    expect(ok.intentarHuida().huida).toBe(true)
    expect(ok.resultado).toBe('huida')

    const ko = new Combate(p, ['lobo'], new RngGuion([0.6]))
    ko.iniciarRonda()
    expect(ko.intentarHuida().huida).toBe(false)
    expect(ko.estado).toBe('menu')
  })

  it('no se puede huir de enemigos sin_huida', () => {
    const c = new Combate(p, ['capitan'], new Rng(1))
    c.iniciarRonda()
    expect(c.puedeHuir()).toBe(false)
    const r = c.intentarHuida()
    expect(r.huida).toBe(false)
    expect(c.estado).toBe('menu')
  })

  it('comando corazon daña, corrompe y provoca la caída al llegar a 100', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    const ev = c.comandoCorazon(0)
    // dano_base 12 sin corrupción previa: mata al lobo (9 PV) de un golpe
    expect(ev.some((e) => e.tipo === 'muerte')).toBe(true)
    expect(p.grieta).toBe(15)

    const c2 = new Combate(p, ['custodio'], new Rng(1))
    c2.iniciarRonda()
    p.grieta = 90
    c2.comandoCorazon(0)
    expect(p.grieta).toBe(100)
    expect(c2.resultado).toBe('caida')
  })

  it('comando marea en Sal y Ceniza calcula dano_base 10 + 3*floor(g/10)', () => {
    const pSal = new GameState()
    pSal.nuevaPartida('sal_y_ceniza', 'bruna', 'camino')
    pSal.grieta = 20
    const c = new Combate(pSal, ['cangrejo'], new Rng(1))
    c.iniciarRonda()
    const ev = c.accionHeroe('marea', { objetivoIdx: 0 })
    // dano = 10 + 3 * 2 = 16. Cangrejo tiene vida 14, muere.
    const danoEv = ev.find((e) => e.tipo === 'dano')
    expect(danoEv.cantidad).toBe(16)
    expect(ev.some((e) => e.tipo === 'muerte')).toBe(true)
    // coste corrupción 12 * 1 en camino = 12. Grieta = 20 + 12 = 32.
    expect(pSal.grieta).toBe(32)
  })

  it('comando eco en Aguja sin Sombra calcula dano_base 12 + 3*floor(g/10)', () => {
    const pAguja = new GameState()
    pAguja.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')
    pAguja.grieta = 10
    const c = new Combate(pAguja, ['sombra'], new Rng(1))
    c.iniciarRonda()
    const ev = c.accionHeroe('eco', { objetivoIdx: 0 })
    // dano = 12 + 3 * 1 = 15. Sombra tiene vida 12, muere.
    const danoEv = ev.find((e) => e.tipo === 'dano')
    expect(danoEv.cantidad).toBe(15)
    expect(ev.some((e) => e.tipo === 'muerte')).toBe(true)
    // coste 12 * 1 = 12. Grieta = 10 + 12 = 22.
    expect(pAguja.grieta).toBe(22)
  })

  it('en Brasa de Vegaverde no hay comando especial y devuelve vacio', () => {
    const pBrasa = new GameState()
    pBrasa.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')
    const c = new Combate(pBrasa, ['mirlo'], new Rng(1))
    c.iniciarRonda()
    expect(c.comandoEspecial(0)).toEqual([])
  })

  it('el cuerno dispersa criaturas menores pero no a jefes', () => {
    p.inventario.push('cuerno_valoria')
    const c = new Combate(p, ['lobo', 'trasgo'], new Rng(1))
    c.iniciarRonda()
    const ev = c.usarCuerno()
    expect(ev.some((e) => e.tipo === 'muerte')).toBe(true)
    expect(c.resultado).toBe('victoria')
    expect(p.cantidad('cuerno_valoria')).toBe(0)

    p.inventario.push('cuerno_valoria') // otro cuerno para la prueba del jefe
    const cJefe = new Combate(p, ['capitan'], new Rng(1))
    cJefe.iniciarRonda()
    cJefe.usarCuerno()
    expect(cJefe.estado).toBe('menu')
    expect(p.cantidad('cuerno_valoria')).toBe(1) // no se consume contra jefes
  })

  it('el veneno hace tick al inicio del turno y expira', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    c.heroe().veneno = { dano: 2, turnos: 2 }
    const ev = c.iniciarRonda()
    expect(ev.some((e) => e.tipo === 'dano' && e.lado === 'heroes' && e.cantidad === 2)).toBe(true)
    expect(c.heroe().vida).toBe(45 - 2)
    expect(c.heroe().veneno).toEqual({ dano: 2, turnos: 1 })
    c.iniciarRonda()
    expect(c.heroe().veneno).toBeNull()
  })

  it('usar objeto cura al héroe dentro del combate', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    c.heroe().vida = 30
    p.stats.vida = 30
    p.inventario.push('provisiones')
    const ev = c.usarObjeto('provisiones')
    expect(ev.some((e) => e.tipo === 'curar' && e.cantidad === 15)).toBe(true)
    expect(c.heroe().vida).toBe(45)
  })

  it('con varios enemigos vivos el estado es objetivo (elegir a quién golpear)', () => {
    const c = new Combate(p, ['lobo', 'trasgo'], new Rng(1))
    c.iniciarRonda()
    expect(c.estado).toBe('objetivo')
  })

  it('las acciones tras el fin no hacen nada', () => {
    const c = new Combate(p, ['lobo'], new Rng(1))
    c.iniciarRonda()
    c.accionHeroe('atacar')
    c.accionHeroe('atacar')
    c.accionHeroe('atacar')
    expect(c.estado).toBe('fin')
    expect(c.accionHeroe('atacar')).toEqual([])
  })
})
