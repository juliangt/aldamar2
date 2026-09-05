import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../src/core/GameState.js'
import { Combate } from '../../src/core/Combate.js'
import { Rng } from '../../src/core/Rng.js'
import Legacy from '../../src/core/Legacy.js'
import Datos from '../../src/core/Datos.js'

describe('FlujoPartidaIntegracion Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('simula ciclo de vida completo: creación -> tienda -> combate -> descanso -> guardado -> legado', () => {
    // 1. Crear nueva partida
    const p = new GameState()
    p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-flujo-test')

    expect(p.nivel).toBe(1)
    expect(p.xp).toBe(0)
    const vidaInicial = p.stats.vida
    const ataqueBase = p.stats.ataque

    // 2. Comprar y equipar un arma
    p.monedas = 20
    const compraExitosa = p.comprar('espada_corta')
    expect(compraExitosa).toBe(true)
    expect(p.inventario).toContain('espada_corta')

    const equipado = p.equipar('espada_corta')
    expect(equipado).toBe(true)
    expect(p.equipo.arma).toBe('espada_corta')
    expect(p.ataqueEfectivo()).toBe(ataqueBase + 2) // espada_corta otorga +2

    // 3. Reclutar un compañero
    p.companeros.push('sylvana')
    p.companerosSalud = { sylvana: { vida: 18, vidaMax: 18 } }

    // 4. Enfrentar combate contra enemigo
    const combate = new Combate(p, ['lobo'], new Rng(1))
    combate.iniciarRonda()

    // Ejecutar rondas hasta derrotar al lobo
    let rondas = 0
    while (combate.estado !== 'fin' && rondas < 10) {
      combate.accionHeroe('atacar')
      if (combate.estado !== 'fin') {
        combate.turnoAliados()
        combate.turnoEnemigos()
      }
      rondas++
    }

    expect(combate.resultado).toBe('victoria')

    // Aplicar resultado del combate
    const resCombate = combate.aplicarResultado()
    expect(resCombate.resultado).toBe('victoria')
    expect(p.xp).toBeGreaterThan(0)

    // 5. Descanso en hoguera restaura la salud del grupo al máximo
    p.stats.vida = 5
    p.descansar()
    expect(p.stats.vida).toBe(p.stats.vidaMax)
    expect(p.companerosSalud.sylvana.vida).toBe(18)

    // 6. Guardar partida en localStorage y restaurarla
    p.flags['puerta_abierta'] = true
    p.guardar()

    const partidaCargada = GameState.restaurar('corazon_ceniza')
    expect(partidaCargada).not.toBeNull()
    expect(partidaCargada.nivel).toBe(p.nivel)
    expect(partidaCargada.xp).toBe(p.xp)
    expect(partidaCargada.monedas).toBe(p.monedas)
    expect(partidaCargada.equipo.arma).toBe('espada_corta')
    expect(partidaCargada.companeros).toContain('sylvana')
    expect(partidaCargada.tieneFlag('puerta_abierta')).toBe(true)

    // 7. Registro de legado al completar o avanzar
    const legadoInicial = Legacy.cargar()
    expect(legadoInicial).toBeDefined()

    Legacy.exportar(p, 'victoria')
    const legadoActualizado = Legacy.cargar()
    expect(legadoActualizado.finales?.corazon_ceniza).toBe('victoria')
    expect(legadoActualizado.heroes.some((h) => h.heroe === 'tilo')).toBe(true)
  })
})
