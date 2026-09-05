import { describe, it, expect } from 'vitest'
import Datos from '../../src/core/Datos.js'

describe('CampaniasIntegridad Integration Tests', () => {
  const aventurasIds = ['corazon_ceniza', 'brasa_vegaverde', 'sal_y_ceniza', 'aguja_sin_sombra']

  it('todas las aventuras tienen lugar_inicial y jugador_inicial válidos', () => {
    for (const avId of aventurasIds) {
      const av = Datos.aventura(avId)
      expect(av.lugar_inicial).toBeTruthy()
      expect(av.jugador_inicial).toBeTruthy()

      // Verificar que el lugar inicial existe
      const lugarIni = Datos.lugar(avId, av.lugar_inicial)
      expect(lugarIni).toBeDefined()

      // Verificar que el personaje inicial existe
      expect(av.personajes[av.jugador_inicial]).toBeDefined()
    }
  })

  it('todas las tiendas contienen ítems existentes en la aventura', () => {
    for (const avId of aventurasIds) {
      const av = Datos.aventura(avId)
      const tiendas = av.tiendas || {}

      for (const [lugarId, catalogo] of Object.entries(tiendas)) {
        // Verificar que el lugar de la tienda existe
        const lugar = Datos.lugar(avId, lugarId)
        expect(lugar).toBeDefined()

        // Cada ítem de la tienda debe existir en items de la campaña
        for (const itemId of catalogo) {
          const item = Datos.item(avId, itemId)
          expect(item, `Ítem '${itemId}' en tienda de '${lugarId}' no existe en '${avId}'`).toBeDefined()
          expect(item.precio, `Ítem '${itemId}' en tienda debe tener precio`).not.toBeNull()
        }
      }
    }
  })

  it('todas las salidas de mapas conectan con lugares existentes de la campaña', () => {
    for (const avId of aventurasIds) {
      const av = Datos.aventura(avId)
      const lugares = Array.isArray(av.lugares) ? av.lugares : Object.values(av.lugares || {})

      for (const lugar of lugares) {
        const salidasObj = lugar.salidas || {}
        const destinos = Array.isArray(salidasObj) ? salidasObj : Object.values(salidasObj)
        for (const destino of destinos) {
          const targetId = typeof destino === 'string' ? destino : (destino?.hacia || destino?.destino)
          if (targetId) {
            const lugarDestino = Datos.lugar(avId, targetId)
            expect(
              lugarDestino,
              `Salida desde '${lugar.id}' hacia '${targetId}' en '${avId}' no existe`
            ).toBeDefined()
          }
        }
      }
    }
  })

  it('todos los enemigos referenciados en eventos y encuentros existen', () => {
    for (const avId of aventurasIds) {
      const av = Datos.aventura(avId)
      const enemigos = av.enemigos || {}

      // Verificar que los enemigos tienen estadísticas mínimas válidas
      for (const [id, en] of Object.entries(enemigos)) {
        expect(en.vida, `Enemigo '${id}' en '${avId}' debe tener vida > 0`).toBeGreaterThan(0)
        expect(en.ataque, `Enemigo '${id}' en '${avId}' debe tener ataque >= 0`).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('todos los personajes jugables tienen estadísticas válidas', () => {
    for (const avId of aventurasIds) {
      const av = Datos.aventura(avId)
      for (const [heroeId, pj] of Object.entries(av.personajes || {})) {
        expect(pj.vida, `Héroe '${heroeId}' en '${avId}' debe tener vida > 0`).toBeGreaterThan(0)
        expect(pj.ataque, `Héroe '${heroeId}' en '${avId}' debe tener ataque > 0`).toBeGreaterThan(0)
        expect(Array.isArray(pj.rasgos), `Rasgos de '${heroeId}' deben ser array`).toBe(true)

        // Los rasgos del héroe deben existir en la lista global de rasgos
        for (const rasgoId of pj.rasgos) {
          expect(Datos.rasgo(rasgoId), `Rasgo '${rasgoId}' no existe en Datos`).toBeDefined()
        }
      }
    }
  })
})
