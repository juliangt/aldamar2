import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Audio8.js', () => ({
  audio8: {
    sfx: vi.fn(),
  },
}))

import DialogBox from '../../src/ui/DialogBox.js'
import { audio8 } from '../../src/core/Audio8.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('DialogBox Unit Tests', () => {
  let escena
  let dialog

  beforeEach(() => {
    escena = crearMockEscena()
    dialog = new DialogBox(escena)
  })

  it('se inicializa oculto y registra listeners de teclado', () => {
    expect(dialog.contenedor.setVisible).toHaveBeenCalledWith(false)
    expect(escena.input.keyboard.on).toHaveBeenCalledWith('keydown-SPACE', expect.any(Function))
    expect(escena.input.keyboard.on).toHaveBeenCalledWith('keydown-ENTER', expect.any(Function))
    expect(escena.input.keyboard.on).toHaveBeenCalledWith('keydown-E', expect.any(Function))
  })

  it('decir() muestra contenedor, emite dialogo-abierto e inicia typewriter', () => {
    dialog.decir('Hola mundo')

    expect(dialog.abierto).toBe(true)
    expect(dialog.contenedor.setVisible).toHaveBeenCalledWith(true)
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-abierto')
    expect(escena.time.addEvent).toHaveBeenCalled()
    expect(dialog.escribiendo).toBe(true)
  })

  it('avanzar() durante escritura completa la página instantáneamente (primer tap)', () => {
    dialog.decir('Texto largo de prueba')
    expect(dialog.escribiendo).toBe(true)

    dialog.avanzar() // 1er tap
    expect(dialog.escribiendo).toBe(false)
    expect(dialog.indicador.setVisible).toHaveBeenCalledWith(true)
  })

  it('avanzar() tras completar página avanza a la siguiente o cierra el diálogo', async () => {
    let resuelto = false
    const promise = dialog.decir('Pagina 1').then(() => {
      resuelto = true
    })

    dialog.avanzar() // completa escritura
    expect(resuelto).toBe(false)

    dialog.avanzar() // cierra diálogo
    await promise

    expect(resuelto).toBe(true)
    expect(dialog.abierto).toBe(false)
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-cerrado')
  })

  it('atajos de teclado (ENTER/SPACE/E) avanzan el diálogo', () => {
    dialog.decir('Prueba de teclas')
    expect(dialog.escribiendo).toBe(true)

    escena.input.keyboard.trigger('keydown-SPACE')
    expect(dialog.escribiendo).toBe(false)
  })

  it('pregunta() crea opciones y resuelve el índice elegido al pulsar', async () => {
    const promise = dialog.pregunta(['Opción A', 'Opción B'])

    expect(dialog.abierto).toBe(true)
    expect(dialog.botones).toHaveLength(2)

    // Simular click en la opción 1 (segunda opción)
    const grupoOpcionB = dialog.botones[1]
    const zonaB = grupoOpcionB[0]
    const clickHandler = zonaB.on.mock.calls.find((c) => c[0] === 'pointerdown')?.[1]
    expect(clickHandler).toBeDefined()

    clickHandler()
    const seleccion = await promise

    expect(seleccion).toBe(1)
    expect(audio8.sfx).toHaveBeenCalledWith('confirmar')
    expect(dialog.abierto).toBe(false)
    expect(escena.events.emit).toHaveBeenCalledWith('dialogo-cerrado')
  })

  it('relayout() preserva texto pendiente y ajusta geometría', () => {
    dialog.decir('Texto largo que necesita ser re-paginado tras girar el dispositivo')
    dialog.relayout()

    expect(dialog.anchoCaja).toBeGreaterThan(0)
    expect(dialog.altoCaja).toBeGreaterThan(0)
    expect(dialog.paginas.length).toBeGreaterThan(0)
  })

  it('aplicarGeometria() define correctamente las dimensiones de la caja de diálogo y componentes', async () => {
    const { VISTA } = await import('../../src/core/resolucion.js')
    dialog.aplicarGeometria()

    const anchoEsperado = VISTA.width - 12
    const altoEsperado = 84

    expect(dialog.anchoCaja).toBe(anchoEsperado)
    expect(dialog.altoCaja).toBe(altoEsperado)

    // El fondo (caja negra) debe medir y posicionarse adecuadamente
    expect(dialog.fondo.setSize).toHaveBeenCalledWith(anchoEsperado, altoEsperado)
    expect(dialog.fondo.setPosition).toHaveBeenCalledWith(
      dialog.x + anchoEsperado / 2,
      dialog.y + altoEsperado / 2
    )

    // El texto y el indicador deben estar dentro de los márgenes
    expect(dialog.texto.setPosition).toHaveBeenCalledWith(dialog.x + 8, dialog.y + 8)
    expect(dialog.indicador.setPosition).toHaveBeenCalledWith(
      dialog.x + anchoEsperado - 12,
      dialog.y + altoEsperado - 12
    )

    // La zona debe cubrir toda la pantalla
    expect(dialog.zona.setSize).toHaveBeenCalledWith(VISTA.width, VISTA.height)
    expect(dialog.zona.setPosition).toHaveBeenCalledWith(VISTA.width / 2, VISTA.height / 2)
  })

  it('relayout() re-posiciona los botones de opciones durante una pregunta', async () => {
    const { VISTA } = await import('../../src/core/resolucion.js')
    dialog.pregunta(['Si', 'No'])

    // Simulamos un cambio de VISTA manipulando dialog.x y dialog.anchoCaja directamente
    // como lo haría aplicarGeometria() si VISTA cambiara
    dialog.relayout()

    // Los botones (en this.botones) deben haber cambiado de posición
    const opciones = ['Si', 'No']
    const n = opciones.length

    dialog.botones.forEach((grupo, i) => {
      const bx = dialog.x + 24 + i * (dialog.anchoCaja / n)
      const by = dialog.y + dialog.altoCaja / 2

      grupo.forEach(obj => {
        expect(obj.setPosition).toHaveBeenCalledWith(bx, by)
      })
    })
  })
})
