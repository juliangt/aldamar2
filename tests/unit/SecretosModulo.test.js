import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../../src/core/GameState.js'
import {
  LUGARES_POR_SECRETO,
  secretoActivo,
  secretoDisponible,
  secretoEnLugar,
  resolverTextoSecreto,
} from '../../src/scenes/secretos.js'

describe('Módulo de secretos compartido (World/Battle)', () => {
  let gs
  beforeEach(() => {
    localStorage.clear()
    gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo')
  })

  it('secretoActivo resuelve el primer secreto de la aventura', () => {
    const activo = secretoActivo('corazon_ceniza')
    expect(activo.tipo).toBe('cuervo')
    expect(activo.sec.textos.length).toBeGreaterThan(0)
  })

  it('los tipos de secreto no campanilla están siempre disponibles', () => {
    expect(secretoDisponible(gs, 'cuervo')).toBe(true)
  })

  it('la campanilla requiere flag o inventario', () => {
    expect(secretoDisponible(gs, 'campanilla')).toBe(false)
    gs.flags = { campanilla: true }
    expect(secretoDisponible(gs, 'campanilla')).toBe(true)
  })

  it('secretoEnLugar aparece solo en los lugares permitidos del tipo', () => {
    expect(secretoEnLugar(gs, 'corazon_ceniza', 'vegaverde')?.tipo).toBe('cuervo')
    expect(secretoEnLugar(gs, 'corazon_ceniza', 'faro')).toBeNull()
    // La campanilla vive en sus lugares pero sin flag no aparece.
    expect(LUGARES_POR_SECRETO.campanilla).toContain('refugio')
    gs.inventario.push('campanilla')
    expect(secretoDisponible(gs, 'campanilla')).toBe(true)
  })

  it('resolverTextoSecreto rota los textos y persiste el contador', () => {
    const { tipo, sec } = secretoActivo('corazon_ceniza')
    gs.npcVistos = {}

    const t0 = resolverTextoSecreto(gs, tipo, sec)
    expect(t0).toBe(sec.textos[0])
    expect(gs.npcVistos['secreto:cuervo']).toBe(1)

    resolverTextoSecreto(gs, tipo, sec)
    expect(resolverTextoSecreto(gs, tipo, sec)).toBe(sec.textos[2])
    // Cuarta lectura: cicla de vuelta al primer texto y el contador vuelve a 1
    // (se persiste idx+1 con idx ya reducido módulo length, como el original).
    expect(resolverTextoSecreto(gs, tipo, sec)).toBe(sec.textos[0])
    expect(gs.npcVistos['secreto:cuervo']).toBe(1)
  })

  it('la variante por semilla gana sobre la rotación y no avanza el contador', () => {
    const { tipo, sec } = secretoActivo('corazon_ceniza')
    gs.npcVistos = {}
    gs.semilla = 42

    const texto = resolverTextoSecreto(gs, tipo, sec)
    expect(texto).toBe(sec.semillas['42'])
    expect(gs.npcVistos['secreto:cuervo']).toBeUndefined()
  })
})
