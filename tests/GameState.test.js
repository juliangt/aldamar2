import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../src/core/GameState.js'

function partidaNueva(overrides = {}) {
  const p = new GameState()
  p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-fija')
  Object.assign(p, overrides)
  return p
}

describe('GameState', () => {
  let p
  beforeEach(() => {
    p = partidaNueva()
    localStorage.clear()
  })

  it('nuevaPartida inicializa stats, lugar y semilla', () => {
    expect(p.aventura).toBe('corazon_ceniza')
    expect(p.heroe).toBe('tilo')
    expect(p.stats).toEqual({ vida: 45, vidaMax: 45, ataque: 4 })
    expect(p.lugar).toBe('vegaverde')
    expect(p.monedas).toBe(10)
    expect(p.inventario).toEqual(['corazon'])
    expect(p.nivel).toBe(1)
    expect(p.semilla).toBeGreaterThan(0)
  })

  it('nuevaPartida lanza con héroe desconocido', () => {
    expect(() => p.nuevaPartida('corazon_ceniza', 'nadie')).toThrow(/Héroe desconocido/)
  })

  it('serializar/restaurar hace round-trip del estado', () => {
    p.monedas = 77
    p.grieta = 12
    p.guardar()
    const r = GameState.restaurar('corazon_ceniza')
    expect(r.monedas).toBe(77)
    expect(r.grieta).toBe(12)
    expect(r.aventura).toBe('corazon_ceniza')
  })

  it('restaurar devuelve null sin save o con JSON roto', () => {
    expect(GameState.restaurar('brasa_vegaverde')).toBeNull()
    localStorage.setItem('aldamar:save:sal_y_ceniza', '{no json')
    expect(GameState.restaurar('sal_y_ceniza')).toBeNull()
  })

  it('borrar elimina el save', () => {
    p.guardar()
    GameState.borrar('corazon_ceniza')
    expect(GameState.restaurar('corazon_ceniza')).toBeNull()
  })

  describe('inventario', () => {
    it('itemsApilados agrupa por id en orden de llegada', () => {
      p.inventario = ['hierbas', 'provisiones', 'hierbas']
      expect(p.itemsApilados()).toEqual([
        { id: 'hierbas', n: 2 },
        { id: 'provisiones', n: 1 },
      ])
    })

    it('quitarItem resta una unidad y avisa si no queda', () => {
      p.inventario = ['hierbas', 'hierbas']
      expect(p.quitarItem('hierbas')).toBe(true)
      expect(p.cantidad('hierbas')).toBe(1)
      expect(p.quitarItem('antorcha')).toBe(false)
    })

    it('usarItem cura con tope a vida máxima y consume la unidad', () => {
      p.stats.vida = 40
      p.inventario.push('provisiones')
      const res = p.usarItem('provisiones')
      expect(res.cura).toBe(5)
      expect(p.stats.vida).toBe(45)
      expect(p.cantidad('provisiones')).toBe(0)
    })

    it('usarItem con ítem no consumible devuelve null', () => {
      const res = p.usarItem('corazon')
      expect(res).toBeNull()
      expect(p.cantidad('corazon')).toBe(1)
    })
  })

  describe('equipo', () => {
    it('equipar arma sube el ataque efectivo y devuelve la anterior al inventario', () => {
      const espada = Datos_item('espada_corta')
      p.inventario.push('espada_corta', 'hoja_sylva')
      p.equipar('espada_corta')
      expect(p.ataqueEfectivo()).toBe(4 + espada.bonus)
      p.equipar('hoja_sylva')
      expect(p.inventario).toContain('espada_corta')
      expect(p.inventario).not.toContain('hoja_sylva')
    })

    it('desequipar devuelve el ítem y anula el bonus', () => {
      p.inventario.push('capa_gris')
      p.equipar('capa_gris')
      expect(p.defensa()).toBeGreaterThan(0)
      p.desequipar('armadura')
      expect(p.defensa()).toBe(0)
      expect(p.inventario).toContain('capa_gris')
    })

    it('equipar algo que no es arma/armadura falla', () => {
      expect(p.equipar('provisiones')).toBe(false)
    })
  })

  describe('economía', () => {
    it('comprar resta monedas y añade al inventario', () => {
      p.inventario.push('provisiones') // para conocer el precio
      const precio = p.precioEfectivo('hierbas')
      p.monedas = precio + 3
      expect(p.comprar('hierbas')).toBe(true)
      expect(p.monedas).toBe(3)
      expect(p.inventario).toContain('hierbas')
    })

    it('comprar sin monedas suficientes falla', () => {
      p.monedas = 0
      expect(p.comprar('espada_corta')).toBe(false)
      expect(p.inventario).not.toContain('espada_corta')
    })
  })

  it('descansar cura al héroe y a los compañeros', () => {
    p.stats.vida = 1
    p.companeros = ['sylvana']
    p.descansar()
    expect(p.stats.vida).toBe(p.stats.vidaMax)
    expect(p.companerosSalud.sylvana.vida).toBe(p.companerosSalud.sylvana.vidaMax)
  })
})

// El bonus del ítem viene del JSON: lo leemos con Datos para no duplicar.
import Datos from '../src/core/Datos.js'
function Datos_item(id) {
  return Datos.item('corazon_ceniza', id)
}
