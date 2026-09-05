import { describe, it, expect } from 'vitest'
import Datos from '../src/core/Datos.js'

const IDS = ['corazon_ceniza', 'brasa_vegaverde', 'sal_y_ceniza', 'aguja_sin_sombra']

describe('Datos', () => {
  it('carga las cuatro aventuras', () => {
    for (const id of IDS) {
      const av = Datos.aventura(id)
      expect(av).toBeTruthy()
      expect(av.personajes).toBeTruthy()
      expect(av.lugares).toBeTruthy()
    }
  })

  it('aventura() lanza con id desconocido', () => {
    expect(() => Datos.aventura('no_existe')).toThrow(/Aventura desconocida/)
  })

  it('orden() ordena las aventuras por su campo orden', () => {
    const ordenes = Datos.orden.map((a) => a.orden)
    expect(ordenes).toEqual([...ordenes].sort((a, b) => a - b))
    expect(Datos.orden).toHaveLength(IDS.length)
  })

  it('resuelve lugares tanto en formato lista de pares como objeto', () => {
    // corazon_ceniza usa lista de pares; el resto objeto plano.
    const lugar = Datos.lugar('corazon_ceniza', 'vegaverde')
    expect(lugar).toBeTruthy()
    expect(Datos.lugar('corazon_ceniza', 'inexistente')).toBeUndefined()
  })

  it('resuelve enemigos, ítems, eventos y diálogos por id', () => {
    expect(Datos.enemigo('corazon_ceniza', 'lobo').vida).toBeGreaterThan(0)
    expect(Datos.item('corazon_ceniza', 'provisiones').tipo).toBe('consumible')
    expect(Datos.dialogo('corazon_ceniza', 'no_existe')).toBeUndefined()
  })

  it('expone dificultades y la dificultad por defecto', () => {
    expect(Datos.dificultad('camino')).toBeTruthy()
    expect(Datos.dificultad('paseo').vida_jugador).toBeGreaterThan(1)
    expect(Datos.dificultadPorDefecto).toBe('camino')
    expect(Datos.dificultad('no_existe')).toBeUndefined()
  })

  it('resuelve rasgos y reclutas', () => {
    expect(Datos.rasgo('ojo_halcon')).toBeTruthy()
    expect(Datos.recluta('corazon_ceniza', 'sylvana').vida).toBeGreaterThan(0)
    expect(Datos.recluta('corazon_ceniza', 'nadie')).toBeUndefined()
  })
})
