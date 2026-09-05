import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  esDispositivoTactil,
  estaPantallaCompleta,
  alternarPantallaCompleta,
  pedirPantallaCompletaEnPrimerGesto,
} from '../src/core/pantalla.js'

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('Detección de dispositivo (pantalla.js)', () => {
  it('pointer coarse (móvil/tablet) → táctil', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    })
    expect(esDispositivoTactil()).toBe(true)
  })

  it('pointer fine (escritorio) → no táctil', () => {
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    })
    expect(esDispositivoTactil()).toBe(false)
  })

  it('sin window (SSR/tests) → no táctil y no explota', () => {
    vi.stubGlobal('window', undefined)
    expect(esDispositivoTactil()).toBe(false)
  })
})

describe('Pantalla completa (pantalla.js)', () => {
  it('sin document: estado false y alternar resuelve false', async () => {
    vi.stubGlobal('window', undefined)
    vi.stubGlobal('document', undefined)
    expect(estaPantallaCompleta()).toBe(false)
    await expect(alternarPantallaCompleta()).resolves.toBe(false)
  })

  it('en escritorio se pide pantalla completa al primer gesto (once)', () => {
    const addEventListener = vi.fn()
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
      addEventListener,
    })
    vi.stubGlobal('document', { fullscreenElement: null })

    pedirPantallaCompletaEnPrimerGesto()
    expect(addEventListener).toHaveBeenCalledTimes(1)
    expect(addEventListener.mock.calls[0][0]).toBe('pointerdown')
    expect(addEventListener.mock.calls[0][2]).toEqual({ once: true })
  })

  it('en móvil no se pide pantalla completa automática', () => {
    const addEventListener = vi.fn()
    vi.stubGlobal('window', {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
      addEventListener,
    })

    pedirPantallaCompletaEnPrimerGesto()
    expect(addEventListener).not.toHaveBeenCalled()
  })
})
