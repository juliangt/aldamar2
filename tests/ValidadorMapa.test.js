import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import ValidadorMapa from '../src/core/ValidadorMapa.js'
import Datos from '../src/core/Datos.js'

describe('ValidadorMapa — coherencia mapa↔JSON de Corazón de Ceniza (Fase E)', () => {
  const aventuraId = 'corazon_ceniza'
  const aventura = Datos.aventura(aventuraId)
  const lugares = Object.keys(aventura.lugares)

  it('los 12 lugares de Corazón de Ceniza están definidos en el JSON de aventura', () => {
    expect(lugares).toHaveLength(12)
    expect(lugares).toEqual([
      'vegaverde',
      'molino',
      'puente',
      'bosque',
      'rioclaro',
      'valoria',
      'minas',
      'cienagas',
      'refugio',
      'yerma',
      'aguja',
      'umbak',
    ])
  })

  for (const lugarId of [
    'vegaverde',
    'molino',
    'puente',
    'bosque',
    'rioclaro',
    'valoria',
    'minas',
    'cienagas',
    'refugio',
    'yerma',
    'aguja',
    'umbak',
  ]) {
    it(`el mapa de ${lugarId} no tiene ninguna incoherencia con el JSON`, () => {
      const rutaMapa = `public/maps/corazon_ceniza/${lugarId}.json`
      expect(fs.existsSync(rutaMapa)).toBe(true)

      const mapaJson = JSON.parse(fs.readFileSync(rutaMapa, 'utf-8'))
      const lugarDato = Datos.lugar(aventuraId, lugarId)

      const avisos = ValidadorMapa.validar(lugarId, lugarDato, mapaJson, aventuraId)
      expect(avisos).toEqual([])
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

    const avisos = ValidadorMapa.validar('test', lugarDatoFalso, mapaVacio, aventuraId)
    expect(avisos.some((a) => a.includes('NPC declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('enemigo declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('enemigo en el mapa sin declarar'))).toBe(true)
    expect(avisos.some((a) => a.includes('objeto declarado sin pintar'))).toBe(true)
    expect(avisos.some((a) => a.includes('monedas declaradas'))).toBe(true)
    expect(avisos.some((a) => a.includes('salida declarada'))).toBe(true)
  })
})
