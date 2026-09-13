import { describe, it, expect } from 'vitest'
import {
  obtenerLugarFinal,
  distanciaAlFinal,
  caminoAlFinal,
  calcularGrafoAventura,
} from '../../src/core/aventuraGrafo.js'

describe('aventuraGrafo Unit Tests', () => {
  describe('obtenerLugarFinal', () => {
    it('identifica correctamente el lugar final de cada aventura', () => {
      expect(obtenerLugarFinal('corazon_ceniza')).toBe('umbak')
      expect(obtenerLugarFinal('brasa_vegaverde')).toBe('colmenar')
      expect(obtenerLugarFinal('sal_y_ceniza')).toBe('salina_vieja')
      expect(obtenerLugarFinal('aguja_sin_sombra')).toBe('aguja_cima')
    })

    it('devuelve null si la aventura no existe', () => {
      expect(obtenerLugarFinal('aventura_falsa')).toBeNull()
    })
  })

  describe('distanciaAlFinal y caminoAlFinal', () => {
    it('calcula la distancia exacta desde el inicio al final en las 4 aventuras', () => {
      expect(distanciaAlFinal('corazon_ceniza', 'vegaverde')).toBe(8)
      expect(distanciaAlFinal('brasa_vegaverde', 'vegaverde')).toBe(3)
      expect(distanciaAlFinal('sal_y_ceniza', 'rioclaro')).toBe(6)
      expect(distanciaAlFinal('aguja_sin_sombra', 'vegaverde')).toBe(8)
    })

    it('calcula distancia 0 cuando el jugador ya está en el lugar final', () => {
      expect(distanciaAlFinal('corazon_ceniza', 'umbak')).toBe(0)
      expect(caminoAlFinal('corazon_ceniza', 'umbak')).toEqual(['umbak'])
    })

    it('calcula distancias intermedias decrecientes al avanzar', () => {
      // vegaverde (8) -> molino (7) -> puente (6) -> bosque/rioclaro (5) ... -> yerma (1) -> umbak (0)
      expect(distanciaAlFinal('corazon_ceniza', 'molino')).toBe(7)
      expect(distanciaAlFinal('corazon_ceniza', 'puente')).toBe(6)
      expect(distanciaAlFinal('corazon_ceniza', 'yerma')).toBe(1)
    })

    it('caminoAlFinal devuelve la secuencia ordenada de pantallas de la ruta más corta', () => {
      const camino = caminoAlFinal('corazon_ceniza', 'yerma')
      expect(camino).toEqual(['yerma', 'umbak'])

      const caminoLargo = caminoAlFinal('corazon_ceniza', 'vegaverde')
      expect(caminoLargo[0]).toBe('vegaverde')
      expect(caminoLargo[caminoLargo.length - 1]).toBe('umbak')
      expect(caminoLargo.length).toBe(9) // 8 transiciones entre 9 pantallas
    })
  })

  describe('calcularGrafoAventura', () => {
    it('genera nodos y conexiones válidos para una aventura', () => {
      const grafo = calcularGrafoAventura('corazon_ceniza', 'puente', { vegaverde: true, molino: true })

      expect(grafo).toBeDefined()
      expect(grafo.totalLugares).toBe(12)
      expect(grafo.distancia).toBe(6)
      expect(grafo.finalId).toBe('umbak')
      expect(grafo.actualId).toBe('puente')

      expect(grafo.nodos.length).toBe(12)
      const nodoActual = grafo.nodosPorId['puente']
      expect(nodoActual.esActual).toBe(true)
      expect(nodoActual.visitado).toBe(true)

      const nodoFinal = grafo.nodosPorId['umbak']
      expect(nodoFinal.esFinal).toBe(true)

      expect(grafo.conexiones.length).toBeGreaterThan(0)
      // Debe haber al menos una conexión marcada en el camino final
      const conexionEnCamino = grafo.conexiones.some((c) => c.enCaminoFinal)
      expect(conexionEnCamino).toBe(true)
    })
  })
})
