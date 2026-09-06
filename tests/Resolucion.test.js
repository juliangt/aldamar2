import { describe, it, expect, vi, beforeEach } from 'vitest'

// Phaser real no carga en node (usa window); mock mínimo del módulo.
vi.mock('phaser', () => ({
  default: {
    GameObjects: {
      Text: class Text {},
      Container: class Container {},
    },
  },
}))

// Importa resolucion.js fresco con un tamaño de pantalla stubbeado.
async function importarConPantalla(ancho, alto) {
  vi.resetModules()
  vi.stubGlobal('window', { innerWidth: ancho, innerHeight: alto })
  return await import('../src/core/resolucion.js')
}

function gameFake() {
  return {
    scale: { setGameSize: vi.fn() },
    scene: { getScenes: vi.fn().mockReturnValue([]) },
    events: { emit: vi.fn() },
  }
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('Orientación adaptativa (VISTA dinámica)', () => {
  it('móvil en vertical (390×844): VISTA 270×480', async () => {
    const m = await importarConPantalla(390, 844)
    expect(m.VISTA).toEqual({ width: 270, height: 480 })
    expect(m.esPantallaVertical()).toBe(true)
    expect(m.esVistaVertical()).toBe(true)
  })

  it('móvil girado / escritorio (1280×800): VISTA 480×270', async () => {
    const m = await importarConPantalla(1280, 800)
    expect(m.VISTA).toEqual({ width: 480, height: 270 })
    expect(m.esPantallaVertical()).toBe(false)
  })

  it('sin window (SSR/tests): fallback horizontal y RES 1', async () => {
    vi.resetModules()
    vi.stubGlobal('window', undefined)
    const m = await import('../src/core/resolucion.js')
    expect(m.VISTA).toEqual({ width: 480, height: 270 })
    expect(m.calcularRes()).toBe(1)
  })

  it('calcularRes supersamplea según cuántas veces cabe la vista', async () => {
    const m = await importarConPantalla(1920, 1080)
    // min(1920/480, 1080/270) = 4 → RES 4
    expect(m.calcularRes()).toBe(4)
  })

  it('calcularRes respeta limites superior e inferior', async () => {
    // muy pequeño (menor a la vista nativa)
    let m = await importarConPantalla(10, 10)
    expect(m.calcularRes()).toBe(1) // Math.max(1, ...)

    // muy grande (fit > 4)
    m = await importarConPantalla(4000, 4000)
    expect(m.calcularRes()).toBe(4) // Math.min(4, ...)
  })

  it('calcularRes testea el redondeo correcto', async () => {
    // fit 1.49 => 1
    let m = await importarConPantalla(480 * 1.49, 270 * 1.49)
    expect(m.calcularRes()).toBe(1)

    // fit 1.5 => 2
    m = await importarConPantalla(480 * 1.5, 270 * 1.5)
    expect(m.calcularRes()).toBe(2)
  })
})

describe('reajustarRes al girar el dispositivo', () => {
  it('cambia VISTA, redimensiona el juego y emite relayout', async () => {
    const m = await importarConPantalla(390, 844) // vertical
    const game = gameFake()
    // El usuario gira a horizontal
    vi.stubGlobal('window', { innerWidth: 844, innerHeight: 390 })

    const cambio = m.reajustarRes(game)
    expect(cambio).toBe(true)
    // RES en horizontal 844×390: min(844/480, 390/270) = 1.44 → 1
    expect(game.scale.setGameSize).toHaveBeenCalledWith(480, 270)
    expect(game.events.emit).toHaveBeenCalledWith('vista-relayout')
    expect(m.VISTA).toEqual({ width: 480, height: 270 })
  })

  it('emite relayout aunque RES no cambie', async () => {
    const m = await importarConPantalla(480, 270) // RES 1, horizontal
    const game = gameFake()
    vi.stubGlobal('window', { innerWidth: 270, innerHeight: 480 }) // vertical, RES 1

    expect(m.reajustarRes(game)).toBe(true)
    expect(game.events.emit).toHaveBeenCalledWith('vista-relayout')
    expect(m.VISTA).toEqual({ width: 270, height: 480 })
  })

  it('sin cambios de tamaño no toca el juego', async () => {
    const m = await importarConPantalla(1280, 800)
    const game = gameFake()
    expect(m.reajustarRes(game)).toBe(false)
    expect(game.scale.setGameSize).not.toHaveBeenCalled()
    expect(game.events.emit).not.toHaveBeenCalled()
  })

  it('re-encuadra cámaras de escenas dormidas (getScenes(false)) y ajusta textos registrados', async () => {
    const m = await importarConPantalla(1280, 800)
    const cam = { setZoom: vi.fn(), centerOn: vi.fn() }

    // Textos registrados (main.js registra cada texto al crearlo): el ajuste
    // es plano sobre el registro, sin recorrer la jerarquía de la escena.
    const textObj = { scene: {}, active: true, setResolution: vi.fn() }
    const nestedTextObj = { scene: {}, active: true, setResolution: vi.fn() }
    const containerObj = { list: [nestedTextObj] }
    const escenaDormida = {
      cameras: { main: cam },
      zoomBase: 2,
      children: { list: [textObj, containerObj] },
    }
    m.registrarTexto(textObj)
    m.registrarTexto(nestedTextObj)

    const game = gameFake()
    game.scene.getScenes.mockImplementation((soloActivas) => {
      // SceneManager#getScenes(isActive): false ⇒ todas las escenas.
      return soloActivas ? [] : [escenaDormida]
    })
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844 })

    m.reajustarRes(game)
    // Vertical: RES = round(min(390/270, 844/480)) = round(1.44) = 1
    expect(cam.setZoom).toHaveBeenCalledWith(2)
    expect(cam.centerOn).toHaveBeenCalledWith(135, 240)

    // Ambos textos (también el anidado en un Container) actualizan resolución
    expect(textObj.setResolution).toHaveBeenCalledWith(m.RES)
    expect(nestedTextObj.setResolution).toHaveBeenCalledWith(m.RES)
  })

  it('los textos destruidos salen del registro y no se re-ajustan', async () => {
    const m = await importarConPantalla(1280, 800)
    const vivo = { scene: {}, setResolution: vi.fn() }
    const muerto = {
      scene: {},
      setResolution: vi.fn(),
      destroy() {},
    }
    m.registrarTexto(vivo)
    m.registrarTexto(muerto)

    muerto.destroy()
    expect(m.textosRegistrados.has(muerto)).toBe(false)
    expect(m.textosRegistrados.has(vivo)).toBe(true)

    const game = gameFake()
    vi.stubGlobal('window', { innerWidth: 390, innerHeight: 844 })
    m.reajustarRes(game)

    expect(vivo.setResolution).toHaveBeenCalledWith(m.RES)
    expect(muerto.setResolution).not.toHaveBeenCalled()
  })
})

describe('aplicarRes', () => {
  it('aplica el zoom base multiplicado por RES y centra la cámara', async () => {
    const m = await importarConPantalla(1920, 1080) // 480x270, RES 4
    const cam = { setZoom: vi.fn(), centerOn: vi.fn() }
    const escena = { cameras: { main: cam } }

    m.aplicarRes(escena, 1.5)

    expect(escena.zoomBase).toBe(1.5)
    expect(cam.setZoom).toHaveBeenCalledWith(1.5 * 4)
    expect(cam.centerOn).toHaveBeenCalledWith(240, 135) // 480/2, 270/2
  })

  it('usa zoomBase = 1 por defecto', async () => {
    const m = await importarConPantalla(1920, 1080) // 480x270, RES 4
    const cam = { setZoom: vi.fn(), centerOn: vi.fn() }
    const escena = { cameras: { main: cam } }

    m.aplicarRes(escena)

    expect(escena.zoomBase).toBe(1)
    expect(cam.setZoom).toHaveBeenCalledWith(1 * 4)
    expect(cam.centerOn).toHaveBeenCalledWith(240, 135)
  })
})

describe('alRelayout (suscripción por escena)', () => {
  it('registra en el bus del game y se desuscribe en shutdown', async () => {
    const m = await importarConPantalla(1280, 800)
    const registrados = {}
    const game = { events: { on: vi.fn((ev, fn) => (registrados[ev] = fn)), off: vi.fn() } }
    const apagados = {}
    const escena = {
      game,
      events: { once: vi.fn((ev, fn) => (apagados[ev] = fn)) },
    }
    const fn = () => {}

    m.alRelayout(escena, fn)
    expect(game.events.on).toHaveBeenCalledWith('vista-relayout', fn)
    expect(escena.events.once).toHaveBeenCalledWith('shutdown', expect.any(Function))
    expect(escena.events.once).toHaveBeenCalledWith('destroy', expect.any(Function))

    apagados.shutdown()
    expect(game.events.off).toHaveBeenCalledWith('vista-relayout', fn)
  })
})
