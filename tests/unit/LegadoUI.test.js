import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

vi.mock('../../src/core/Legacy.js', () => ({
  default: {
    cargar: vi.fn(() => ({
      juramento: false,
      grieta: false,
      heroes: [],
      finales: {},
    })),
  },
}))

vi.mock('../../src/core/resolucion.js', () => ({
  VISTA: { width: 800, height: 600 },
  esVistaVertical: vi.fn(() => false),
}))

import { LegadoUI } from '../../src/ui/LegadoUI.js'
import Legacy from '../../src/core/Legacy.js'
import { esVistaVertical } from '../../src/core/resolucion.js'
import { crearMockEscena } from '../helpers/phaser.js'

describe('LegadoUI Unit Tests', () => {
  let escena
  let onCerrar
  let contenedorMock

  beforeEach(() => {
    escena = crearMockEscena()
    onCerrar = vi.fn()
    contenedorMock = { add: vi.fn() }

    // reset mocks
    vi.clearAllMocks()
    Legacy.cargar.mockReturnValue({
      juramento: false,
      grieta: false,
      heroes: [],
      finales: {},
    })
    esVistaVertical.mockReturnValue(false)
  })

  it('inicializa correctamente los elementos básicos y los añade al contenedor', () => {
    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    expect(contenedorMock.add).toHaveBeenCalledTimes(1)

    const elements = contenedorMock.add.mock.calls[0][0]
    expect(elements).toBeInstanceOf(Array)
    expect(elements.length).toBe(10) // fondo, titLegado, subtit, txtJuramento, txtGrieta, txtTitHeroes, txtHeroes, txtTitFinales, txtFinales, btnCerrar
  })

  it('muestra juramento y grieta inactivos cuando son falsos en Legacy', () => {
    Legacy.cargar.mockReturnValue({
      juramento: false,
      grieta: false,
      heroes: [],
      finales: {},
    })

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    const txtJuramento = escena.add.text.mock.calls.find(call => call[2].includes('JURAMENTO'))
    const txtGrieta = escena.add.text.mock.calls.find(call => call[2].includes('GRIETA'))

    expect(txtJuramento[2]).toContain('INACTIVO')
    expect(txtGrieta[2]).toContain('INACTIVA')
  })

  it('muestra juramento y grieta activos cuando son verdaderos en Legacy', () => {
    Legacy.cargar.mockReturnValue({
      juramento: true,
      grieta: true,
      heroes: [],
      finales: {},
    })

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    const txtJuramento = escena.add.text.mock.calls.find(call => call[2].includes('JURAMENTO'))
    const txtGrieta = escena.add.text.mock.calls.find(call => call[2].includes('GRIETA'))

    expect(txtJuramento[2]).toContain('ACTIVO (ENCENDIDO)')
    expect(txtGrieta[2]).toContain('ACTIVA (ENCENDIDA)')
  })

  it('muestra mensaje por defecto si no hay héroes', () => {
    Legacy.cargar.mockReturnValue({
      juramento: false,
      grieta: false,
      heroes: [],
      finales: {},
    })

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    const txtHeroes = escena.add.text.mock.calls.find(call => call[2].includes('Ningún héroe ha culminado un cantar todavía.'))
    expect(txtHeroes).toBeDefined()
  })

  it('muestra hasta 4 héroes si la lista está poblada', () => {
    Legacy.cargar.mockReturnValue({
      juramento: false,
      grieta: false,
      heroes: [
        { nombre: 'Hero 1', aventura: 'Aventura 1', final: 'Final 1' },
        { nombre: 'Hero 2', aventura: 'Aventura 2', final: 'Final 2' },
        { nombre: 'Hero 3', aventura: 'Aventura 3', final: 'Final 3' },
        { nombre: 'Hero 4', aventura: 'Aventura 4', final: 'Final 4' },
        { nombre: 'Hero 5', aventura: 'Aventura 5', final: 'Final 5' },
      ],
      finales: {},
    })

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    const txtHeroesCall = escena.add.text.mock.calls.find(call => call[2].includes('Hero 5')) // Should include the last one
    expect(txtHeroesCall).toBeDefined()

    const heroesText = txtHeroesCall[2]
    expect(heroesText).toContain('Hero 2')
    expect(heroesText).toContain('Hero 3')
    expect(heroesText).toContain('Hero 4')
    expect(heroesText).toContain('Hero 5')
    expect(heroesText).not.toContain('Hero 1') // Should slice and only show last 4
  })

  it('muestra los finales alcanzados por campaña', () => {
    Legacy.cargar.mockReturnValue({
      juramento: false,
      grieta: false,
      heroes: [],
      finales: {
        corazon_ceniza: 'bueno',
      },
    })

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })

    const txtFinalesCall = escena.add.text.mock.calls.find(call => call[2].includes('Corazón de Ceniza: BUENO'))
    expect(txtFinalesCall).toBeDefined()

    const finalesText = txtFinalesCall[2]
    expect(finalesText).toContain('El Corazón de Ceniza: BUENO')
    expect(finalesText).toContain('La Sal y la Ceniza: Pendiente') // Other should be pending
  })


  it('ajusta el layout para vista vertical', () => {
    esVistaVertical.mockReturnValue(true)

    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })
    // Comprobar diferencias en el layout en vista vertical.
    // px pasa de 28 a 12
    // dy pasa de 0 a 26
    const txtJuramento = escena.add.text.mock.calls.find(call => call[2].includes('JURAMENTO'))
    expect(txtJuramento[0]).toBe(12) // px
    expect(txtJuramento[1]).toBe(54 + 26) // 54 + dy
  })

  it('el botón de cerrar ejecuta el callback onCerrar', () => {
    new LegadoUI(escena, { contenedor: contenedorMock, onCerrar })

    // Find the btnCerrar object that was returned by escena.add.text
    // The last call to add.text is the button
    const elements = contenedorMock.add.mock.calls[0][0]
    const btnCerrar = elements[elements.length - 1]

    // Simulate clicking the button
    // It should have called `on` with 'pointerdown' and a callback
    const pointerdownCallback = btnCerrar.on.mock.calls.find(call => call[0] === 'pointerdown')[1]

    pointerdownCallback()

    expect(onCerrar).toHaveBeenCalledTimes(1)
  })
})
