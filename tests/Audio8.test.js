import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Audio8, BIOMAS_PADS, obtenerBioma, JINGLE, DURACION_JINGLE } from '../src/core/Audio8.js'

describe('Audio8 — Síntesis y gestión sonora', () => {
  let audio

  beforeEach(() => {
    localStorage.clear()
    audio = new Audio8()
  })

  it('inicializa con volumen 0.8 y mute false por defecto', () => {
    expect(audio.volumenMaster).toBe(0.8)
    expect(audio.mute).toBe(false)
  })

  it('maneja errores de localStorage al inicializar sin fallar y usa valores por defecto', () => {
    const getItemSpy = vi.spyOn(globalThis.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('Acceso denegado')
    })

    const audioConError = new Audio8()
    expect(audioConError.volumenMaster).toBe(0.8)
    expect(audioConError.mute).toBe(false)

    getItemSpy.mockRestore()
  })

  it('setVolumen ajusta y persiste en localStorage entre 0 y 1', () => {
    audio.setVolumen(0.5)
    expect(audio.volumenMaster).toBe(0.5)
    expect(localStorage.getItem('aldamar:audio:volumen')).toBe('0.50')

    audio.setVolumen(1.5)
    expect(audio.volumenMaster).toBe(1.0)

    audio.setVolumen(-0.2)
    expect(audio.volumenMaster).toBe(0.0)
  })

  it('setMute y toggleMute alternan y persisten el estado de silencio', () => {
    expect(audio.toggleMute()).toBe(true)
    expect(audio.mute).toBe(true)
    expect(localStorage.getItem('aldamar:audio:mute')).toBe('1')

    expect(audio.toggleMute()).toBe(false)
    expect(audio.mute).toBe(false)
    expect(localStorage.getItem('aldamar:audio:mute')).toBe('0')

    audio.setMute(true)
    expect(audio.mute).toBe(true)
  })

  it('obtenerBioma mapea correctamente lugares a biomas conocidos', () => {
    expect(obtenerBioma('vegaverde')).toBe('huerto')
    expect(obtenerBioma('ejido')).toBe('huerto')
    expect(obtenerBioma('molino')).toBe('camino')
    expect(obtenerBioma('puente')).toBe('camino')
    expect(obtenerBioma('bosque')).toBe('bosque')
    expect(obtenerBioma('rioclaro')).toBe('aldea')
    expect(obtenerBioma('valoria')).toBe('aldea')
    expect(obtenerBioma('minas')).toBe('mina')
    expect(obtenerBioma('cienagas')).toBe('cienaga')
    expect(obtenerBioma('faro')).toBe('costa')
    expect(obtenerBioma('yerma')).toBe('yermos')
    expect(obtenerBioma('aguja')).toBe('aguja')
    expect(obtenerBioma('lugar_desconocido')).toBe('camino')
  })

  it('todos los biomas tienen acordes definidos en BIOMAS_PADS', () => {
    const biomas = ['huerto', 'camino', 'bosque', 'aldea', 'mina', 'cienaga', 'costa', 'yermos', 'aguja']
    for (const b of biomas) {
      expect(BIOMAS_PADS[b]).toBeDefined()
      expect(Array.isArray(BIOMAS_PADS[b])).toBe(true)
      expect(BIOMAS_PADS[b].length).toBeGreaterThanOrEqual(2)
      for (const f of BIOMAS_PADS[b]) {
        expect(f).toBeGreaterThan(50)
      }
    }
  })

  it('jingle oficial contiene 8 notas y duración ~2 segundos', () => {
    expect(JINGLE).toHaveLength(8)
    expect(DURACION_JINGLE).toBe(2.0)
    expect(JINGLE[0].f).toBe(220.0) // La3
    expect(JINGLE[JINGLE.length - 1].f).toBe(220.0) // La3 cierre
  })

  it('sfx y ambiente se ejecutan con seguridad en entornos sin WebAudio (Node/Vitest)', () => {
    expect(() => {
      audio.sfx('dialogo')
      audio.sfx('confirmar')
      audio.sfx('moneda')
      audio.sfx('golpe')
      audio.sfx('dano')
      audio.sfx('curacion')
      audio.sfx('nivel')
      audio.sfx('victoria')
      audio.sfx('derrota')
      audio.sfx('secreto')
      audio.iniciarAmbiente('huerto')
      audio.detenerAmbiente(false)
    }).not.toThrow()
  })

  it('todos los biomas tienen un tema medieval configurado y coherente', async () => {
    const { TEMAS_MEDIEVALES, NOTAS_FREQ } = await import('../src/core/Audio8.js')
    const biomas = ['huerto', 'camino', 'bosque', 'aldea', 'mina', 'cienaga', 'costa', 'yermos', 'aguja']
    for (const b of biomas) {
      const tema = TEMAS_MEDIEVALES[b]
      expect(tema).toBeDefined()
      expect(tema.nombre).toBeDefined()
      expect(tema.stepSec).toBeGreaterThan(0.1)
      expect(tema.longitud).toBeGreaterThan(0)
      expect(tema.laud).toHaveLength(tema.longitud)
      expect(tema.bajo).toHaveLength(tema.longitud)
      expect(tema.flauta.length).toBeGreaterThan(0)
      expect(tema.flautaPorPaso).toBeDefined()

      // Verificar que todas las notas del tema existen en NOTAS_FREQ
      for (const nota of tema.laud) {
        if (nota !== '_') expect(NOTAS_FREQ[nota]).toBeDefined()
      }
      for (const nota of tema.bajo) {
        if (nota !== '_') expect(NOTAS_FREQ[nota]).toBeDefined()
      }
      for (const f of tema.flauta) {
        expect(NOTAS_FREQ[f.n]).toBeDefined()
        expect(f.s).toBeLessThan(tema.longitud)
        expect(f.d).toBeGreaterThan(0)
      }
    }
  })

  it('iniciarAmbiente y detenerAmbiente gestionan el estado del tema y bioma', () => {
    audio.iniciarAmbiente('bosque')
    expect(audio.biomaActual).toBe('bosque')
    audio.detenerAmbiente(false)
    expect(audio.musicaTimer).toBeNull()
  })
})

