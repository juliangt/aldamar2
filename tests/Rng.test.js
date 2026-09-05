import { describe, it, expect } from 'vitest'
import { Rng } from '../src/core/Rng.js'

describe('Rng', () => {
  it('misma semilla produce la misma secuencia', () => {
    const a = new Rng(42)
    const b = new Rng(42)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('next() devuelve floats en [0, 1)', () => {
    const rng = new Rng(1)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('int(n) devuelve enteros en [0, n)', () => {
    const rng = new Rng(7)
    for (let i = 0; i < 500; i++) {
      const v = rng.int(6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(6)
    }
  })

  it('chance(0) siempre falso y chance(1) siempre cierto', () => {
    const rng = new Rng(99)
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(1)).toBe(true)
    }
  })

  it('pick() devuelve null con array vacío y elementos del array si no', () => {
    const rng = new Rng(3)
    expect(rng.pick([])).toBeNull()
    expect(rng.pick(null)).toBeNull()
    for (let i = 0; i < 50; i++) expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']))
  })

  it('semillaDe() es determinista y sensible al texto', () => {
    expect(Rng.semillaDe('tilo')).toBe(Rng.semillaDe('tilo'))
    expect(Rng.semillaDe('tilo')).not.toBe(Rng.semillaDe('ithel'))
    expect(Rng.semillaDe('tilo')).toBeLessThanOrEqual(0xffffffff)
  })

  it('semilla numérica se respeta directamente', () => {
    const rng = new Rng(123)
    expect(rng.seed).toBe(123)
  })
})
