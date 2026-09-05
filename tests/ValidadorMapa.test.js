import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import ValidadorMapa from '../src/core/ValidadorMapa.js'
import Datos from '../src/core/Datos.js'

describe('ValidadorMapa — coherencia mapa↔JSON de las 4 aventuras (Fase G)', () => {
  const aventurasEsperadas = {
    corazon_ceniza: 12,
    brasa_vegaverde: 5,
    sal_y_ceniza: 9,
    aguja_sin_sombra: 13,
  }

  it('las 4 aventuras suman exactamente 39 lugares en los JSON de aventura', () => {
    let totalLugares = 0
    for (const [avId, cant] of Object.entries(aventurasEsperadas)) {
      const av = Datos.aventura(avId)
      const lugares = Object.keys(av.lugares)
      expect(lugares).toHaveLength(cant)
      totalLugares += lugares.length
    }
    expect(totalLugares).toBe(39)
  })

  for (const [avId, cant] of Object.entries(aventurasEsperadas)) {
    describe(`Aventura: ${avId} (${cant} mapas)`, () => {
      const av = Datos.aventura(avId)
      const lugares = Object.keys(av.lugares)

      for (const lugarId of lugares) {
        it(`[${avId}] el mapa de «${lugarId}» no tiene incoherencias con el JSON`, () => {
          const rutaMapa = `public/maps/${avId}/${lugarId}.json`
          expect(fs.existsSync(rutaMapa)).toBe(true)

          const mapaJson = JSON.parse(fs.readFileSync(rutaMapa, 'utf-8'))
          const lugarDato = Datos.lugar(avId, lugarId)

          const avisos = ValidadorMapa.validar(lugarId, lugarDato, mapaJson, avId)
          expect(avisos).toEqual([])
        })
      }
    })
  }

  it('detecta discrepancias simuladas (NPC no pintado, enemigo sobrante, falta de gatillo)', () => {
    const lugarDatoFalso = {
      npcs: { npc_inexistente: 'dialogo_falso' },
      enemigos: ['lobo'],
      objetos: ['pocion_fantasma'],
      monedas: 10,
      eventos: ['decision_fantasma'],
      salidas: { norte: 'no_existe' },
    }
    const mapaVacio = {
      layers: [
        { name: 'suelo', type: 'tilelayer' },
        { name: 'obstaculos', type: 'tilelayer' },
        { name: 'decoracion', type: 'tilelayer' },
        { name: 'frente', type: 'tilelayer' },
        { name: 'spawns', type: 'objectgroup', objects: [] },
        { name: 'salidas', type: 'objectgroup', objects: [] },
        { name: 'npcs', type: 'objectgroup', objects: [] },
        { name: 'enemigos', type: 'objectgroup', objects: [{ name: 'dragón' }] },
        { name: 'objetos', type: 'objectgroup', objects: [] },
        { name: 'monedas', type: 'objectgroup', objects: [] },
        { name: 'eventos', type: 'objectgroup', objects: [] },
      ],
    }

    const avisos = ValidadorMapa.validar('test', lugarDatoFalso, mapaVacio, 'corazon_ceniza')
    expect(avisos.some((a) => a.includes('NPC declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('enemigo declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('enemigo en el mapa sin declarar'))).toBe(true)
    expect(avisos.some((a) => a.includes('objeto declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('monedas declaradas'))).toBe(true)
    expect(avisos.some((a) => a.includes('salida declarada'))).toBe(true)
  })
})
