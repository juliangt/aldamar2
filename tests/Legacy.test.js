import { describe, it, expect, beforeEach } from 'vitest'
import { Legacy } from '../src/core/Legacy.js'
import { GameState } from '../src/core/GameState.js'

describe('Legacy (persistencia global entre aventuras)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('cargar() inicializa estado vacío por defecto', () => {
    const legado = Legacy.cargar()
    expect(legado.juramento).toBe(false)
    expect(legado.grieta).toBe(false)
    expect(legado.heroes).toEqual([])
    expect(legado.finales).toEqual({})
  })

  it('cargar() recupera un estado vacío si el JSON en localStorage está malformado', () => {
    localStorage.setItem('aldamar:legado', '{malformed JSON')
    const legado = Legacy.cargar()
    expect(legado.juramento).toBe(false)
    expect(legado.grieta).toBe(false)
    expect(legado.heroes).toEqual([])
    expect(legado.finales).toEqual({})
  })

  it('exportar() mapea flags de la aventura y anota héroe y final', () => {
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
    gs.flags.alianza = true
    gs.flags.coronado = true
    gs.nombre = 'Tilo de Vegaverde'

    const exportado = Legacy.exportar(gs, 'victoria pura')
    expect(exportado.juramento).toBe(true)
    expect(exportado.grieta).toBe(true)
    expect(exportado.finales.corazon_ceniza).toBe('victoria pura')
    expect(exportado.heroes).toHaveLength(1)
    expect(exportado.heroes[0]).toEqual({
      heroe: 'tilo',
      nombre: 'Tilo de Vegaverde',
      aventura: 'corazon_ceniza',
      final: 'victoria pura',
    })

    // Debe persistir en localStorage
    const recargado = Legacy.cargar()
    expect(recargado.juramento).toBe(true)
    expect(recargado.grieta).toBe(true)
    expect(recargado.finales.corazon_ceniza).toBe('victoria pura')
  })

  it('exportar() no activa banderas si los flags no se consiguieron', () => {
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'ithel', 'camino')
    // Sin flags alianza ni coronado

    const exportado = Legacy.exportar(gs, 'victoria pura')
    expect(exportado.juramento).toBe(false)
    expect(exportado.grieta).toBe(false)
    expect(exportado.finales.corazon_ceniza).toBe('victoria pura')
    expect(exportado.heroes[0].heroe).toBe('ithel')
  })

  it('importar() en brasa_vegaverde inyecta flags importados activos', () => {
    // Primero simulamos legado existente con juramento y grieta activos
    const previo = Legacy.cargar()
    previo.juramento = true
    previo.grieta = true
    previo.guardar()

    const gsBrasa = new GameState()
    gsBrasa.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')

    // brasa_vegaverde tiene importa: ["juramento", "grieta"]
    expect(gsBrasa.flags.juramento).toBe(true)
    expect(gsBrasa.flags.grieta).toBe(true)
  })

  it('tieneBanderasImportadas() detecta si alguna bandera aplica a la aventura', () => {
    const legado = Legacy.cargar()
    expect(legado.tieneBanderasImportadas('brasa_vegaverde')).toBe(false)

    legado.juramento = true
    legado.guardar()
    expect(legado.tieneBanderasImportadas('brasa_vegaverde')).toBe(true)
  })

  it('limpiar() borra el legado guardado', () => {
    const legado = Legacy.cargar()
    legado.juramento = true
    legado.guardar()
    expect(Legacy.cargar().juramento).toBe(true)

    Legacy.limpiar()
    expect(Legacy.cargar().juramento).toBe(false)
  })
})
