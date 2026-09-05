import { describe, it, expect, beforeEach } from 'vitest'
import Datos from '../src/core/Datos.js'
import { GameState } from '../src/core/GameState.js'

describe('Secretos v1 (El Cuervo de Corazón de Ceniza)', () => {
  let av
  let sec

  beforeEach(() => {
    localStorage.clear()
    av = Datos.aventura('corazon_ceniza')
    sec = av.secretos?.cuervo
  })

  it('La aventura corazon_ceniza define el secreto del cuervo', () => {
    expect(sec).toBeDefined()
    expect(sec.comando).toBe('cuervo')
    expect(Array.isArray(sec.textos)).toBe(true)
    expect(sec.textos.length).toBe(3)
    expect(sec.texto_combate).toContain('Un cuervo planea sobre el combate')
    expect(sec.semillas?.['42']).toContain('pluma plateada')
  })

  it('Los textos del cuervo rotan secuencialmente y ciclan', () => {
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
    gs.npcVistos = {}

    // Primera interacción
    const idx0 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
    expect(idx0).toBe(0)
    expect(sec.textos[idx0]).toContain('Un cuervo ceniciento se posa')
    gs.npcVistos['secreto:cuervo'] = idx0 + 1

    // Segunda interacción
    const idx1 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
    expect(idx1).toBe(1)
    expect(sec.textos[idx1]).toContain('Caw')
    gs.npcVistos['secreto:cuervo'] = idx1 + 1

    // Tercera interacción
    const idx2 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
    expect(idx2).toBe(2)
    expect(sec.textos[idx2]).toContain('El cuervo ni se inmuta')
    gs.npcVistos['secreto:cuervo'] = idx2 + 1

    // Cuarta interacción (vuelve al primero)
    const idx3 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
    expect(idx3).toBe(0)
    expect(sec.textos[idx3]).toContain('Un cuervo ceniciento se posa')
  })

  it('Semilla 42 activa el texto secreto especial de la pluma plateada', () => {
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 42)
    gs.semilla = 42

    const textoEspecial =
      gs.semilla === 42 && sec.semillas?.['42'] ? sec.semillas['42'] : null

    expect(textoEspecial).toBeDefined()
    expect(textoEspecial).toContain('pluma plateada en el ala')
    expect(textoEspecial).toContain('suelta una nuez redonda')
  })
})
