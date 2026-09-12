import { describe, it, expect, vi } from 'vitest'
import { puedeIniciarCombate } from '../../../src/scenes/mundo/enemigos.js'

describe('enemigos.js - puedeIniciarCombate', () => {
  it('return false if escena.enemigosMapa is undefined', () => {
    const escena = {}
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if escena.enemigosMapa is empty', () => {
    const escena = { enemigosMapa: [] }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if all enemies are defeated', () => {
    const escena = { enemigosMapa: [{ derrotado: true }, { derrotado: true }] }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if escena is transitioning', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      transicionando: true,
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if escena is paused', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      pausado: true,
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if a UI modal is active', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      ui: { modal: true },
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if fleeing grace period is still active', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      graciaHuida: 1500, // greater than ahora (1000)
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
  })

  it('return false if Battle scene is currently active', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      scene: { isActive: vi.fn().mockImplementation((name) => name === 'Battle') }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(false)
    expect(escena.scene.isActive).toHaveBeenCalledWith('Battle')
  })

  it('return true if there is at least one living enemy and no blocking conditions are met', () => {
    const escena = {
      enemigosMapa: [{ derrotado: true }, { derrotado: false }],
      transicionando: false,
      pausado: false,
      ui: { modal: false },
      graciaHuida: 500, // less than ahora
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(true)
  })

  it('return true if there is at least one living enemy, no blocking conditions, and graciaHuida/ui is undefined', () => {
    const escena = {
      enemigosMapa: [{ derrotado: false }],
      scene: { isActive: vi.fn().mockReturnValue(false) }
    }
    const ahora = 1000
    expect(puedeIniciarCombate(escena, ahora)).toBe(true)
  })
})
