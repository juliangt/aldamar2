import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Text: class Text {},
      Container: class Container {},
    },
  },
}))

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import SelectorOpciones from '../../src/ui/SelectorOpciones.js'
import { audio8 } from '../../src/core/Audio8.js'

function crearMockEscena() {
  const pointerListeners = new Map()

  const crearElemento = (props = {}) => ({
    setPosition: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    on: vi.fn(function (ev, cb) {
      pointerListeners.set(cb, ev)
      this._onClick = cb
      return this
    }),
    destroy: vi.fn(),
    input: { enabled: true, hitArea: { setSize: vi.fn() } },
    list: [],
    add: vi.fn(function (items) {
      if (Array.isArray(items)) this.list.push(...items)
      else this.list.push(items)
      return this
    }),
    ...props,
  })

  return {
    add: {
      container: vi.fn(() => crearElemento()),
      zone: vi.fn(() => crearElemento()),
      rectangle: vi.fn(() => crearElemento()),
      text: vi.fn(() => crearElemento()),
    },
    events: {
      on: vi.fn(),
      emit: vi.fn(),
    },
  }
}

describe('SelectorOpciones Unit Tests', () => {
  let escena
  let selector

  beforeEach(() => {
    escena = crearMockEscena()
    selector = new SelectorOpciones(escena)
  })

  it('devuelve null inmediatamente si no hay opciones', async () => {
    const res1 = await selector.elegir('¿Qué haces?', [])
    const res2 = await selector.elegir('¿Qué haces?', null)

    expect(res1).toBeNull()
    expect(res2).toBeNull()
    expect(selector.abierto).toBe(false)
  })

  it('elegir() abre el contenedor y emite dialogo-abierto', () => {
    selector.elegir('¿Qué camino tomas?', [
      { clave: 'norte', titulo: 'Hacia el norte', detalle: 'Camino pedregoso' },
      { clave: 'sur', titulo: 'Hacia el sur', detalle: 'Camino por el río' },
    ])

    expect(selector.abierto).toBe(true)
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-abierto')
    expect(selector.contenedor).toBeDefined()
  })

  it('pulsar una opción resuelve con el objeto elegido y emite dialogo-cerrado', async () => {
    const opciones = [
      { clave: 'atacar', titulo: 'Atacar', daño: 10 },
      { clave: 'huir', titulo: 'Huir', coste: 5 },
    ]

    const promise = selector.elegir('¿Acción?', opciones)

    // Buscar la zona interactiva del segundo botón y simular click
    const zonas = escena.add.zone.mock.results.map((r) => r.value)
    // zonas[0] es el velo, zonas[1] es opción 0, zonas[2] es opción 1
    const zonaHuir = zonas[2]
    expect(zonaHuir._onClick).toBeDefined()

    zonaHuir._onClick()
    const eleccion = await promise

    expect(eleccion).toEqual(opciones[1])
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(selector.abierto).toBe(false)
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-cerrado')
  })

  it('relayout() destruye el contenedor previo y re-renderiza manteniendo los datos', () => {
    selector.elegir('Pregunta', [{ clave: 'a', titulo: 'A' }])
    const primerContenedor = selector.contenedor

    selector.relayout()

    expect(primerContenedor.destroy).toHaveBeenCalled()
    expect(selector.contenedor).toBeDefined()
    expect(selector.abierto).toBe(true)
  })

  it('cerrar() es idempotente y limpia estado', () => {
    selector.elegir('Pregunta', [{ clave: 'a', titulo: 'A' }])
    selector.cerrar()

    expect(selector.abierto).toBe(false)
    expect(selector.contenedor).toBeNull()
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-cerrado')

    // Segunda llamada no debe volver a emitir
    escena.events.emit.mockClear()
    selector.cerrar()
    expect(escena.events.emit).not.toHaveBeenCalled()
  })
})
