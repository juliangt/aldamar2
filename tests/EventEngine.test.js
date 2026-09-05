import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../src/core/GameState.js'
import EventEngine from '../src/core/EventEngine.js'
import Datos from '../src/core/Datos.js'

function partidaNueva(overrides = {}) {
  const p = new GameState()
  p.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 'semilla-fija')
  Object.assign(p, overrides)
  return p
}

// Interfaz ui de prueba: registra todo lo que se muestra y deja programar
// las respuestas del jugador.
function uiFalsa({ elecciones = [], resultadosBatalla = [] } = {}) {
  const ui = {
    dichos: [],
    toasts: [],
    decisiones: [],
    batallas: [],
    refrescos: 0,
    caidas: 0,
    finales: [],
    decir: (t) => {
      ui.dichos.push(t)
      return Promise.resolve()
    },
    decidir: (pregunta, opciones) => {
      ui.decisiones.push({ pregunta, opciones })
      return Promise.resolve(elecciones.length ? elecciones.shift() : opciones[0])
    },
    batalla: (enemigos) => {
      ui.batallas.push(enemigos)
      return Promise.resolve(resultadosBatalla.length ? resultadosBatalla.shift() : 'victoria')
    },
    toast: (m) => ui.toasts.push(m),
    refrescar: () => ui.refrescos++,
    caida: () => ui.caidas++,
    final: (elegida, evento) => ui.finales.push(elegida.clave),
  }
  return ui
}

describe('EventEngine — condiciones y textos', () => {
  let p
  beforeEach(() => {
    p = partidaNueva()
    localStorage.clear()
  })

  it('condicionCumplida: sin condición, flag y no_flag', () => {
    expect(EventEngine.condicionCumplida(p, null)).toBe(true)
    expect(EventEngine.condicionCumplida(p, { flag: 'alianza' })).toBe(false)
    p.flags.alianza = true
    expect(EventEngine.condicionCumplida(p, { flag: 'alianza' })).toBe(true)
    expect(EventEngine.condicionCumplida(p, { no_flag: 'alianza' })).toBe(false)
    expect(EventEngine.condicionCumplida(p, { no_flag: 'otra' })).toBe(true)
  })

  it('textoDe elige la variante de grieta a partir de grieta_desde', () => {
    const ev = DatosEvento('forja')
    expect(EventEngine.textoDe(ev, p)).toBe(ev.texto)
    p.grieta = 12
    expect(EventEngine.textoDe(ev, p)).toBe(ev.texto_grieta)
  })
})

describe('EventEngine — eventos al entrar', () => {
  let p, ui
  beforeEach(() => {
    p = partidaNueva()
    ui = uiFalsa()
    localStorage.clear()
  })

  it('narrar se muestra una vez (una_vez) y no al re-entrar', async () => {
    await EventEngine.alEntrar(p, 'minas', ui)
    expect(ui.dichos).toHaveLength(1)
    expect(p.vistos['evt:forja']).toBe(true)
    const ui2 = uiFalsa()
    await EventEngine.alEntrar(p, 'minas', ui2)
    expect(ui2.dichos).toHaveLength(0)
  })

  it('corrupcion suma puntos × Balance y avisa', async () => {
    p.dificultad = 'ceniza' // corrupción 1.25 → 8 × 1.25 = 10
    await EventEngine.alEntrar(p, 'cienagas', ui)
    expect(p.grieta).toBe(10)
    expect(ui.dichos[0]).toContain('La grieta se abre')
  })

  it('curar_grupo cura y resta corrupción (ritual −15), una sola vez', async () => {
    p.stats.vida = 3
    p.grieta = 40
    await EventEngine.alEntrar(p, 'refugio', ui)
    expect(p.stats.vida).toBe(p.stats.vidaMax)
    expect(p.grieta).toBe(25)
    expect(p.vistos['evt:ritual']).toBe(true)
    // entrega requiere flag promesa: sin ella solo corre el ritual
    expect(ui.dichos).toHaveLength(1)
  })

  it('narrar con condicion flag queda latente sin la flag', async () => {
    await EventEngine.alEntrar(p, 'refugio', ui)
    expect(ui.dichos.every((t) => !t.includes('Dorotea'))).toBe(true)
    p.flags.promesa = true
    p.vistos['evt:ritual'] = true // ya consumido
    await EventEngine.alEntrar(p, 'refugio', ui)
    expect(ui.dichos.some((t) => t.includes('tercio'))).toBe(true)
  })

  it('emboscar lanza batalla forzada con sus enemigos', async () => {
    await EventEngine.ejecutar(p, 'ceniza_sabe', DatosEvento('ceniza_sabe'), ui)
    expect(ui.batallas).toEqual([['espectro', 'espectro']])
  })

  it('grieta ≥ 100 por corrupción dispara la caída', async () => {
    p.grieta = 95
    await EventEngine.alEntrar(p, 'cienagas', ui)
    expect(p.grieta).toBe(100)
    expect(ui.caidas).toBe(1)
  })
})

describe('EventEngine — decisiones por gatillo', () => {
  let p, ui
  beforeEach(() => {
    p = partidaNueva()
    ui = uiFalsa()
    localStorage.clear()
  })

  it('encargo: prometer entrega tercio + flag promesa; esquivar no entrega', async () => {
    const ev = DatosEvento('encargo')
    const elegida = await EventEngine.decision(p, ev, ui)
    expect(elegida.clave).toBe('prometer') // primera opción por defecto
    expect(p.inventario).toContain('tercio')
    expect(p.flags.promesa).toBe(true)
    expect(ui.toasts[0]).toContain('tercio')

    const p2 = partidaNueva()
    const ui2 = uiFalsa({ elecciones: [ev.opciones[1]] })
    await EventEngine.decision(p2, ev, ui2)
    expect(p2.inventario).not.toContain('tercio')
    expect(p2.flags.promesa).toBeUndefined()
  })

  it('gatillo de decisión se consume: no re-entrega ítems', async () => {
    const r1 = await EventEngine.gatillo(p, 'consejo', ui)
    expect(r1).toBe('ejecutado')
    expect(p.inventario.filter((i) => i === 'estandarte')).toHaveLength(1)
    const r2 = await EventEngine.gatillo(p, 'consejo', uiFalsa())
    expect(r2).toBe('no-aplica')
    expect(p.inventario.filter((i) => i === 'estandarte')).toHaveLength(1)
  })

  it('corona: tomarla suma ítem, flag y 6 de grieta', async () => {
    await EventEngine.gatillo(p, 'corona', ui)
    expect(p.inventario).toContain('corona_plata')
    expect(p.flags.coronado).toBe(true)
    expect(p.grieta).toBe(6)
  })

  it('final queda pendiente si el lugar no está limpio y dispara ui.final si lo está', async () => {
    expect(await EventEngine.gatillo(p, 'final', ui, {}, { limpio: false })).toBe('pendiente')
    expect(ui.finales).toHaveLength(0)
    expect(await EventEngine.gatillo(p, 'final', ui, {}, { limpio: true })).toBe('ejecutado')
    expect(ui.finales).toEqual(['destruir'])
  })

  it('emboscada condicionada: coronado solo con la flag', async () => {
    expect(await EventEngine.gatillo(p, 'coronado', ui)).toBe('no-aplica')
    expect(ui.batallas).toHaveLength(0)
    p.flags.coronado = true
    expect(await EventEngine.gatillo(p, 'coronado', ui)).toBe('ejecutado')
    expect(ui.batallas).toEqual([['espectro', 'espectro']])
  })

  it('consejo: ambas ramas entregan estandarte con distinta flag (alianza vs deposito)', async () => {
    const ev = DatosEvento('consejo')

    // Rama 1: Jurar alianza
    const p1 = partidaNueva()
    const ui1 = uiFalsa({ elecciones: [ev.opciones[0]] })
    await EventEngine.gatillo(p1, 'consejo', ui1)
    expect(p1.inventario).toContain('estandarte')
    expect(p1.flags.alianza).toBe(true)
    expect(p1.flags.deposito).toBeUndefined()

    // Rama 2: Depósito
    const p2 = partidaNueva()
    const ui2 = uiFalsa({ elecciones: [ev.opciones[1]] })
    await EventEngine.gatillo(p2, 'consejo', ui2)
    expect(p2.inventario).toContain('estandarte')
    expect(p2.flags.deposito).toBe(true)
    expect(p2.flags.alianza).toBeUndefined()
  })

  it('corona: la rama de dejarla no otorga item ni flag ni grieta', async () => {
    const ev = DatosEvento('corona')
    const uiDejar = uiFalsa({ elecciones: [ev.opciones[1]] })
    await EventEngine.gatillo(p, 'corona', uiDejar)
    expect(p.inventario).not.toContain('corona_plata')
    expect(p.flags.coronado).toBeUndefined()
    expect(p.grieta).toBe(0)
  })

  it('umbral: texto alternativo a partir de grieta 40', () => {
    const ev = DatosEvento('umbral')
    p.grieta = 39
    expect(EventEngine.textoDe(ev, p)).toBe(ev.texto)
    p.grieta = 40
    expect(EventEngine.textoDe(ev, p)).toBe(ev.texto_grieta)
  })

  it('ceniza_sabe: embosca si no_flag alianza y se desactiva si hay alianza', async () => {
    const ev = DatosEvento('ceniza_sabe')
    // Sin alianza -> condición cumplida -> emboscada
    expect(EventEngine.condicionCumplida(p, ev.condicion)).toBe(true)
    await EventEngine.ejecutar(p, 'ceniza_sabe', ev, ui)
    expect(ui.batallas).toEqual([['espectro', 'espectro']])

    // Con alianza -> condición no cumplida -> se desactiva
    p.flags.alianza = true
    expect(EventEngine.condicionCumplida(p, ev.condicion)).toBe(false)
  })

  it('otorgar: entrega ítem, muestra texto y emite toast', async () => {
    const evOtorgar = {
      tipo: 'otorgar',
      item: 'provisiones',
      texto: 'Un ermitaño te tiende un saco con provisiones.',
    }
    await EventEngine.ejecutar(p, 'test_otorgar', evOtorgar, ui)
    expect(p.inventario).toContain('provisiones')
    expect(ui.dichos[0]).toBe(evOtorgar.texto)
    expect(ui.toasts[0]).toContain('provisiones')
    expect(ui.refrescos).toBe(1)
  })
})

describe('Puertas con requisito (requiere) en Corazón de Ceniza', () => {
  let p
  beforeEach(() => {
    p = partidaNueva()
  })

  it('minas exige antorcha para cruzar', () => {
    const minas = Datos.lugar('corazon_ceniza', 'minas')
    expect(minas.requiere).toBe('antorcha')
    expect(minas.requiere_texto).toContain('antorcha')

    // Sin antorcha: no cumple
    expect(p.inventario.includes(minas.requiere)).toBe(false)

    // Con antorcha: cumple
    p.inventario.push('antorcha')
    expect(p.inventario.includes(minas.requiere)).toBe(true)
  })

  it('yerma exige estandarte para cruzar', () => {
    const yerma = Datos.lugar('corazon_ceniza', 'yerma')
    expect(yerma.requiere).toBe('estandarte')
    expect(yerma.requiere_texto).toContain('estandarte')

    // Sin estandarte: no cumple
    expect(p.inventario.includes(yerma.requiere)).toBe(false)

    // Con estandarte: cumple
    p.inventario.push('estandarte')
    expect(p.inventario.includes(yerma.requiere)).toBe(true)
  })
})

describe('GameState — grieta y curación de grupo (Fase E)', () => {
  let p
  beforeEach(() => {
    p = partidaNueva()
    localStorage.clear()
  })

  it('sumarGrieta multiplica por dificultad y detecta la caída', () => {
    expect(p.sumarGrieta(8)).toEqual({ delta: 8, grieta: 8, caida: false })
    p.dificultad = 'ceniza'
    expect(p.sumarGrieta(8).delta).toBe(10)
    p.grieta = 99
    expect(p.sumarGrieta(5).caida).toBe(true)
    expect(p.grieta).toBe(100)
  })

  it('sumarGrieta negativa remite y nunca baja de 0', () => {
    p.grieta = 20
    expect(p.sumarGrieta(-15)).toEqual({ delta: -15, grieta: 5, caida: false })
    expect(p.sumarGrieta(-99).grieta).toBe(0)
  })

  it('curarGrupo cura al héroe y a los compañeros, y resta grieta', () => {
    p.stats.vida = 1
    p.companeros = ['bruna']
    p.grieta = 30
    const res = p.curarGrupo(-15)
    expect(p.stats.vida).toBe(p.stats.vidaMax)
    expect(p.companerosSalud['bruna'].vida).toBe(p.companerosSalud['bruna'].vidaMax)
    expect(res.grieta).toBe(15)
  })
})

function DatosEvento(id) {
  return Datos.evento('corazon_ceniza', id)
}

