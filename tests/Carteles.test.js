import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import Datos from '../src/core/Datos.js'
import {
  nombreCorto,
  posicionCartel,
  posicionPoste,
  ordenarTablas,
  flechaDe,
} from '../src/core/Carteles.js'

describe('Carteles — nombreCorto', () => {
  it('usa nombre_corto del lugar si existe', () => {
    expect(
      nombreCorto({ nombre: 'la Ciudad Dorada de Valoria', nombre_corto: 'Valoria' })
    ).toBe('Valoria')
  })

  it('deriva del nombre completo quitando el artículo inicial', () => {
    expect(nombreCorto({ nombre: 'el Ejido' })).toBe('Ejido')
    expect(nombreCorto({ nombre: 'Vegaverde' })).toBe('Vegaverde')
  })

  it('trunca con elipsis los nombres que no caben en una tabla', () => {
    expect(nombreCorto({ nombre: 'la Aldea de Ríoclaro' })).toBe('Aldea de…')
  })

  it('devuelve cadena vacía sin lugar', () => {
    expect(nombreCorto(undefined)).toBe('')
    expect(nombreCorto({})).toBe('')
  })
})

describe('Carteles — posicionCartel (salidas simples)', () => {
  const mapa = { width: 640, height: 448 }

  it('coloca el cartel de una salida oeste hacia el interior, centrado en el hueco', () => {
    expect(posicionCartel({ x: 0, y: 192, width: 16, height: 64, dir: 'O' }, mapa)).toEqual({
      x: 24,
      y: 224,
    })
  })

  it('salida este: 1,5 tiles hacia dentro desde el borde derecho', () => {
    expect(posicionCartel({ x: 624, y: 192, width: 16, height: 64, dir: 'E' }, mapa)).toEqual({
      x: 616,
      y: 224,
    })
  })

  it('salidas norte y sur: bajan y suben respectivamente hacia el interior', () => {
    expect(posicionCartel({ x: 288, y: 0, width: 64, height: 16, dir: 'N' }, mapa)).toEqual({
      x: 320,
      y: 24,
    })
    expect(posicionCartel({ x: 288, y: 432, width: 64, height: 16, dir: 'S' }, mapa)).toEqual({
      x: 320,
      y: 424,
    })
  })

  it('no sale de los límites del mapa en mapas pequeños', () => {
    const mini = { width: 32, height: 48 }
    expect(
      posicionCartel({ x: 16, y: 8, width: 16, height: 16, dir: 'E' }, mini)
    ).toEqual({ x: 16, y: 16 })
  })
})

describe('Carteles — posicionPoste (bifurcaciones)', () => {
  const mapa = { width: 640, height: 448 }

  it('devuelve el centro (alineado a 8 px) si el tile central está libre', () => {
    expect(posicionPoste(mapa, () => true)).toEqual({ x: 320, y: 224 })
  })

  it('busca en anillos concéntricos el tile libre más cercano', () => {
    const esLibre = (x, y) => !(x === 320 && y === 224)
    expect(posicionPoste(mapa, esLibre)).toEqual({ x: 304, y: 208 })
  })

  it('cae en el centro si ningún tile está libre', () => {
    expect(posicionPoste(mapa, () => false)).toEqual({ x: 320, y: 224 })
  })
})

describe('Carteles — orden y flechas del poste', () => {
  it('ordena las tablas N → O → E → S sin mutar la entrada', () => {
    const salidas = [{ dir: 'S' }, { dir: 'E' }, { dir: 'N' }, { dir: 'O' }]
    expect(ordenarTablas(salidas).map((s) => s.dir)).toEqual(['N', 'O', 'E', 'S'])
    expect(salidas.map((s) => s.dir)).toEqual(['S', 'E', 'N', 'O'])
  })

  it('mapea cada dirección a su flecha', () => {
    expect(flechaDe('N')).toBe('arriba')
    expect(flechaDe('S')).toBe('abajo')
    expect(flechaDe('E')).toBe('derecha')
    expect(flechaDe('O')).toBe('izquierda')
    expect(flechaDe(undefined)).toBe('plana')
  })
})

describe('Carteles — datos: nombre_corto en todos los destinos de salida', () => {
  const aventuras = ['corazon_ceniza', 'brasa_vegaverde', 'sal_y_ceniza', 'aguja_sin_sombra']

  for (const avId of aventuras) {
    it(`[${avId}] cada salida pintada apunta a un lugar con nombre_corto que cabe en una tabla`, () => {
      const dir = path.join('public/maps', avId)
      for (const archivo of fs.readdirSync(dir)) {
        const mapa = JSON.parse(fs.readFileSync(path.join(dir, archivo), 'utf-8'))
        const capa = mapa.layers.find((l) => l.name === 'salidas')
        if (!capa) continue
        for (const o of capa.objects) {
          const props = {}
          for (const p of o.properties || []) props[p.name] = p.value
          if (!props.hacia) continue
          const lugar = Datos.lugar(avId, props.hacia)
          expect(lugar, `${archivo} → ${props.hacia}`).toBeTruthy()
          expect(lugar.nombre_corto, `${archivo} → ${props.hacia}`).toBeTruthy()
          expect(lugar.nombre_corto.length).toBeLessThanOrEqual(9)
        }
      }
    })
  }

  it('los 39 lugares declarados tienen nombre_corto', () => {
    let total = 0
    for (const avId of aventuras) {
      for (const [id, lugar] of Object.entries(Datos.aventura(avId).lugares)) {
        expect(lugar.nombre_corto, `${avId}/${id}`).toBeTruthy()
        total++
      }
    }
    expect(total).toBe(39)
  })
})
