import { describe, it, expect } from 'vitest'
import Balance from '../src/core/Balance.js'

describe('Balance', () => {
  it('camino es la identidad (mismo valor)', () => {
    expect(Balance.statJugador(45, 'vida_jugador', 'camino')).toBe(45)
    expect(Balance.statEnemigo(9, 'vida_enemigos', 'camino')).toBe(9)
  })

  it('paseo escala vida de jugador hacia arriba y vida de enemigo hacia abajo', () => {
    expect(Balance.statJugador(45, 'vida_jugador', 'paseo')).toBe(Math.max(1, Math.round(45 * 1.3)))
    expect(Balance.statEnemigo(9, 'vida_enemigos', 'paseo')).toBe(Math.max(1, Math.round(9 * 0.75)))
  })

  it('ceniza escala enemigos hacia arriba', () => {
    expect(Balance.statEnemigo(9, 'vida_enemigos', 'ceniza')).toBe(Math.max(1, Math.round(9 * 1.35)))
  })

  it('nunca devuelve menos de 1', () => {
    expect(Balance.statJugador(0, 'monedas', 'ceniza')).toBeGreaterThanOrEqual(1)
  })

  it('dificultad desconocida aplica multiplicador 1', () => {
    expect(Balance.curacion(10, 'no_existe')).toBe(10)
  })
})
