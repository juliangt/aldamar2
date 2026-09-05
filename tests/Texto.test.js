import { describe, it, expect } from 'vitest'
import Texto from '../src/core/Texto.js'

describe('Texto', () => {
  describe('tpl', () => {
    it('interpola las claves presentes y deja el resto', () => {
      expect(Texto.tpl('Hola, {nombre} de {lugar}', { nombre: 'Tilo' })).toBe('Hola, Tilo de {lugar}')
    })
    it('texto vacío devuelve vacío', () => {
      expect(Texto.tpl(null)).toBe('')
      expect(Texto.tpl('')).toBe('')
    })
  })

  describe('paginar', () => {
    it('corta por palabras respetando el ancho', () => {
      const paginas = Texto.paginar('aaaa bbbb cccc', 9, 1)
      expect(paginas).toEqual(['aaaa bbbb', 'cccc'])
    })
    it('agrupa alto líneas por página', () => {
      const paginas = Texto.paginar('a\nb\nc\nd', 10, 2)
      expect(paginas).toEqual(['a\nb', 'c\nd'])
    })
    it('conserva los saltos de párrafo', () => {
      expect(Texto.paginar('uno\n\ndos', 10, 10)).toEqual(['uno\n\ndos'])
    })
  })

  describe('extraerReclutar', () => {
    it('detecta el comando y limpia el texto', () => {
      const r = Texto.extraerReclutar('Ven conmigo. (Escribe reclutar sylvana si la quieres)')
      expect(r.reclutaId).toBe('sylvana')
      expect(r.limpio).toBe('Ven conmigo.')
    })
    it('sin comando devuelve el texto intacto', () => {
      const r = Texto.extraerReclutar('Nada que hacer aquí.')
      expect(r.reclutaId).toBeNull()
      expect(r.limpio).toBe('Nada que hacer aquí.')
    })
  })

  describe('extraerComprar', () => {
    it('detecta la forma entre paréntesis', () => {
      const r = Texto.extraerComprar('Mercancía fina. (Escribe comprar para verla)')
      expect(r.esTienda).toBe(true)
      expect(r.limpio).toBe('Mercancía fina.')
    })
    it('detecta la frase suelta', () => {
      const r = Texto.extraerComprar('Escribe comprar y echa un vistazo.')
      expect(r.esTienda).toBe(true)
      expect(r.limpio).toBe('')
    })
    it('sin mención no es tienda', () => {
      expect(Texto.extraerComprar('Hola, viajero.').esTienda).toBe(false)
    })
  })
})
