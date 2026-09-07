import { describe, it, expect } from 'vitest'
import {
  NOTAS_FREQ,
  TEMAS_MEDIEVALES,
  BIOMAS_PADS,
  obtenerBioma,
  JINGLE,
  DURACION_JINGLE,
} from '../../src/core/Temas.js'

const PERCUSION_VALIDA = new Set(['tabor', 'tabor_suave', 'tap', null])

describe('Temas musicales (integridad de datos)', () => {
  it('NOTAS_FREQ define el silencio "_" como 0 y frecuencias positivas', () => {
    expect(NOTAS_FREQ._).toBe(0)
    for (const [nota, freq] of Object.entries(NOTAS_FREQ)) {
      if (nota === '_') continue
      expect(freq, `nota ${nota}`).toBeGreaterThan(0)
    }
  })

  it('cada bioma mapea a un tema con pistas completas y notas válidas', () => {
    for (const [bioma, tema] of Object.entries(TEMAS_MEDIEVALES)) {
      expect(tema.stepSec, `${bioma} stepSec`).toBeGreaterThan(0)
      expect(tema.laud, `${bioma} laud`).toHaveLength(tema.longitud)
      expect(tema.bajo, `${bioma} bajo`).toHaveLength(tema.longitud)

      for (const pista of ['laud', 'bajo']) {
        for (const nota of tema[pista]) {
          expect(NOTAS_FREQ[nota], `${bioma} ${pista} nota "${nota}"`).toBeDefined()
        }
      }

      expect(tema.flauta.length, `${bioma} flauta`).toBeGreaterThan(0)
      for (const f of tema.flauta) {
        expect(f.s, `${bioma} flauta s`).toBeLessThan(tema.longitud)
        expect(f.d, `${bioma} flauta d`).toBeGreaterThan(0)
        expect(NOTAS_FREQ[f.n], `${bioma} flauta nota "${f.n}"`).toBeDefined()
        expect(tema.flautaPorPaso[f.s], `${bioma} flautaPorPaso[${f.s}]`).toContain(f)
      }

      expect(typeof tema.perc, `${bioma} perc`).toBe('function')
      for (let s = 0; s < tema.longitud; s++) {
        expect(PERCUSION_VALIDA.has(tema.perc(s)), `${bioma} perc(${s})`).toBe(true)
      }
    }
  })

  it('BIOMAS_PADS cubre todos los biomas con tríos de frecuencias', () => {
    expect(Object.keys(BIOMAS_PADS).sort()).toEqual(Object.keys(TEMAS_MEDIEVALES).sort())
    for (const [bioma, pad] of Object.entries(BIOMAS_PADS)) {
      expect(pad, `${bioma} pad`).toHaveLength(3)
      pad.forEach((f) => expect(f, `${bioma} pad freq`).toBeGreaterThan(0))
    }
  })

  it('obtenerBioma mapea lugares conocidos y cae a camino', () => {
    expect(obtenerBioma('vegaverde')).toBe('huerto')
    expect(obtenerBioma('faro')).toBe('costa')
    expect(obtenerBioma('aguja_cima')).toBe('aguja')
    expect(obtenerBioma('lugar_inexistente')).toBe('camino')
  })

  it('el jingle es una secuencia temporal creciente dentro de su duración', () => {
    expect(JINGLE.length).toBeGreaterThan(0)
    for (let i = 1; i < JINGLE.length; i++) {
      expect(JINGLE[i].t).toBeGreaterThan(JINGLE[i - 1].t)
    }
    const ultima = JINGLE[JINGLE.length - 1]
    expect(ultima.t + ultima.d).toBeLessThanOrEqual(DURACION_JINGLE)
  })
})
