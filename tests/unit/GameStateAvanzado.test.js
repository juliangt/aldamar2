import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../src/core/GameState.js'
import Datos from '../../src/core/Datos.js'

describe('GameStateAvanzado Unit Tests', () => {
  let p

  beforeEach(() => {
    localStorage.clear()
    p = new GameState()
    p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-123')
  })

  it('equipar y desequipar intercambia armas y armaduras con el inventario', () => {
    p.inventario = ['espada_corta', 'hoja_sylva']

    // Equipar primera espada
    const exito1 = p.equipar('espada_corta')
    expect(exito1).toBe(true)
    expect(p.equipo.arma).toBe('espada_corta')
    expect(p.inventario).toEqual(['hoja_sylva'])

    // Equipar segunda espada devuelve la anterior al inventario
    const exito2 = p.equipar('hoja_sylva')
    expect(exito2).toBe(true)
    expect(p.equipo.arma).toBe('hoja_sylva')
    expect(p.inventario).toContain('espada_corta')

    // Desequipar el arma la manda de vuelta al inventario
    const desequipado = p.desequipar('arma')
    expect(desequipado).toBe(true)
    expect(p.equipo.arma).toBeUndefined()
    expect(p.inventario).toContain('hoja_sylva')
  })

  it('ataqueEfectivo y defensa reflejan bonificaciones de equipo', () => {
    const ataqueBase = p.stats.ataque
    expect(p.defensa()).toBe(0)

    p.inventario = ['espada_corta', 'capa_gris']
    p.equipar('espada_corta') // bonus +2
    p.equipar('capa_gris') // bonus +1

    expect(p.ataqueEfectivo()).toBe(ataqueBase + 2)
    expect(p.defensa()).toBe(1)
  })

  it('sumarGrieta aumenta corrupción y detecta caída a 100', () => {
    expect(p.grieta).toBe(0)

    const res1 = p.sumarGrieta(50)
    expect(res1.grieta).toBe(50)
    expect(res1.caida).toBe(false)

    // Sumar más allá de 100 queda acotado a 100 y marca caída
    const res2 = p.sumarGrieta(80)
    expect(res2.grieta).toBe(100)
    expect(res2.caida).toBe(true)

    // Reducir corrupción
    const res3 = p.sumarGrieta(-30)
    expect(res3.grieta).toBe(70)
    expect(res3.caida).toBe(false)
  })

  it('descansar() restaura al máximo la salud del héroe y de los compañeros', () => {
    p.companeros = ['sylvana']
    p.stats.vida = 12
    p.companerosSalud = { sylvana: { vida: 4, vidaMax: 18 } }

    p.descansar()

    expect(p.stats.vida).toBe(p.stats.vidaMax)
    expect(p.companerosSalud.sylvana.vida).toBe(18)
  })

  it('restaurar maneja JSON corrupto retornando null con resiliencia', () => {
    localStorage.setItem('aldamar:save:corazon_ceniza', '{json_invalido_corrupto')

    const cargado = GameState.restaurar('corazon_ceniza')
    expect(cargado).toBeNull()
  })

  it('guardar y restaurar mantiene estado fielmente en localStorage', () => {
    p.monedas = 99
    p.flags['secreto_encontrado'] = true
    p.guardar()

    const recuperado = GameState.restaurar('corazon_ceniza')
    expect(recuperado).not.toBeNull()
    expect(recuperado.monedas).toBe(99)
    expect(recuperado.tieneFlag('secreto_encontrado')).toBe(true)

    GameState.borrar('corazon_ceniza')
    expect(GameState.restaurar('corazon_ceniza')).toBeNull()
  })
})
