import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

import { LogBatalla } from '../../src/scenes/batalla/LogBatalla.js'
import { crearMockEscena } from '../helpers/phaser.js'
import { VISTA } from '../../src/core/resolucion.js'

describe('LogBatalla', () => {
  let escena
  let log

  beforeEach(() => {
    vi.useFakeTimers()
    escena = crearMockEscena()
    // Override delayedCall to use native setTimeout so vi.advanceTimersByTime works
    escena.time.delayedCall = vi.fn((ms, cb) => {
      const timeoutId = setTimeout(cb, ms)
      return { remove: () => clearTimeout(timeoutId) }
    })
    log = new LogBatalla(escena)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes correctly and adds UI elements', () => {
    expect(escena.add.rectangle).toHaveBeenCalled()
    expect(escena.add.text).toHaveBeenCalled()
    expect(escena.add.zone).toHaveBeenCalled()
    expect(log.fondo).toBeDefined()
    expect(log.texto).toBeDefined()
    expect(log.zona).toBeDefined()
  })

  it('relayout updates positions correctly', () => {
    const origHeight = VISTA.height
    VISTA.height = 400
    VISTA.width = 300

    log.relayout()

    expect(log.logY).toBe(334) // 400 - 66
    expect(log.fondo.setPosition).toHaveBeenCalledWith(150, 360) // width/2, logY + 26
    expect(log.texto.setPosition).toHaveBeenCalledWith(12, 340) // 12, logY + 6
    expect(log.zona.setPosition).toHaveBeenCalledWith(150, 360)

    VISTA.height = origHeight
  })

  it('linea() auto-resolves after calculated timeout', async () => {
    const text = 'Una línea de prueba' // length 19
    // Math.min(2600, 750 + 19 * 10) = Math.min(2600, 940) = 940
    let resolved = false
    const promise = log.linea(text).then(() => { resolved = true })

    expect(log.texto.setText).toHaveBeenCalledWith(text)

    expect(resolved).toBe(false)

    // Advance timers just before timeout
    vi.advanceTimersByTime(930)
    await Promise.resolve() // flush microtasks
    expect(resolved).toBe(false)

    // Advance to or past timeout
    vi.advanceTimersByTime(10)
    await Promise.resolve()
    expect(resolved).toBe(true)
    expect(log.resolver).toBeNull()
  })

  it('acelerar() manually resolves a pending line', async () => {
    let resolved = false
    const promise = log.linea('Prueba').then(() => { resolved = true })

    expect(resolved).toBe(false)

    log.acelerar()
    await Promise.resolve() // flush microtasks

    expect(resolved).toBe(true)
    expect(log.resolver).toBeNull()
  })

  it('pointerdown on zone accelerates resolution', async () => {
    let resolved = false
    const promise = log.linea('Prueba').then(() => { resolved = true })

    expect(resolved).toBe(false)

    // Trigger the pointerdown event attached to the zone
    log.zona._handlers['pointerdown']()
    await Promise.resolve()

    expect(resolved).toBe(true)
  })

  it('adding a new line resolves a pending previous line to prevent orphaned promises', async () => {
    let line1Resolved = false
    let line2Resolved = false

    const p1 = log.linea('Primera línea').then(() => { line1Resolved = true })

    expect(line1Resolved).toBe(false)

    // Adding the second line should trigger acelerar() for the first line
    const p2 = log.linea('Segunda línea').then(() => { line2Resolved = true })

    await Promise.resolve()

    // First line should now be resolved
    expect(line1Resolved).toBe(true)
    // Second line should still be pending
    expect(line2Resolved).toBe(false)

    log.acelerar()
    await Promise.resolve()

    expect(line2Resolved).toBe(true)
  })

  it('applies text template context correctly', async () => {
    log.linea('Hola {nombre}', { nombre: 'Jules' })
    expect(log.texto.setText).toHaveBeenCalledWith('Hola Jules')
  })
})
