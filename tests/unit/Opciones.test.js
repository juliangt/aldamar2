import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CLAVE_MINIMAPA,
  CLAVE_MODO_MINIMAPA,
  obtenerMinimapaHabilitado,
  guardarMinimapaHabilitado,
  obtenerModoMinimapa,
  guardarModoMinimapa,
} from '../../src/core/opciones.js'

describe('Opciones Unit Tests', () => {
  let mockStorage = {}

  beforeEach(() => {
    mockStorage = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => (key in mockStorage ? mockStorage[key] : null)),
      setItem: vi.fn((key, val) => {
        mockStorage[key] = String(val)
      }),
      removeItem: vi.fn((key) => {
        delete mockStorage[key]
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('obtenerMinimapaHabilitado devuelve true por defecto si no hay nada guardado', () => {
    expect(obtenerMinimapaHabilitado()).toBe(true)
    expect(localStorage.getItem).toHaveBeenCalledWith(CLAVE_MINIMAPA)
  })

  it('guardarMinimapaHabilitado guarda 0 para false y 1 para true', () => {
    guardarMinimapaHabilitado(false)
    expect(localStorage.setItem).toHaveBeenCalledWith(CLAVE_MINIMAPA, '0')
    expect(obtenerMinimapaHabilitado()).toBe(false)

    guardarMinimapaHabilitado(true)
    expect(localStorage.setItem).toHaveBeenCalledWith(CLAVE_MINIMAPA, '1')
    expect(obtenerMinimapaHabilitado()).toBe(true)
  })

  it('devuelve true si localStorage no está definido (fallback seguro)', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(obtenerMinimapaHabilitado()).toBe(true)
    expect(() => guardarMinimapaHabilitado(false)).not.toThrow()
  })

  it('obtenerModoMinimapa devuelve "local" por defecto', () => {
    expect(obtenerModoMinimapa()).toBe('local')
    expect(localStorage.getItem).toHaveBeenCalledWith(CLAVE_MODO_MINIMAPA)
  })

  it('guardarModoMinimapa guarda y valida valores "local" y "aventura"', () => {
    guardarModoMinimapa('aventura')
    expect(localStorage.setItem).toHaveBeenCalledWith(CLAVE_MODO_MINIMAPA, 'aventura')
    expect(obtenerModoMinimapa()).toBe('aventura')

    guardarModoMinimapa('local')
    expect(localStorage.setItem).toHaveBeenCalledWith(CLAVE_MODO_MINIMAPA, 'local')
    expect(obtenerModoMinimapa()).toBe('local')

    // Valores no reconocidos deben normalizarse a 'local'
    guardarModoMinimapa('desconocido')
    expect(localStorage.setItem).toHaveBeenCalledWith(CLAVE_MODO_MINIMAPA, 'local')
    expect(obtenerModoMinimapa()).toBe('local')
  })

  it('devuelve "local" si localStorage no está definido para modo', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(obtenerModoMinimapa()).toBe('local')
    expect(() => guardarModoMinimapa('aventura')).not.toThrow()
  })
})
