import { describe, it, expect, beforeEach } from 'vitest'
import { EventEngine } from '../src/core/EventEngine.js'
import { GameState } from '../src/core/GameState.js'
import { Legacy } from '../src/core/Legacy.js'
import Datos from '../src/core/Datos.js'

describe('Resolución de Finales y Epílogos (Fase F)', () => {
  let gs
  let eventoFinal

  beforeEach(() => {
    localStorage.clear()
    gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
    eventoFinal = Datos.evento('corazon_ceniza', 'final')
  })

  it('1. Victoria pura: destruir con grieta < 60', () => {
    gs.grieta = 20
    const opcionDestruir = eventoFinal.opciones.find((o) => o.clave === 'destruir')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionDestruir)

    expect(res.tipo).toBe('final')
    expect(res.final).toBe('victoria pura')
    expect(res.estilo).toBe('epico')
    expect(res.texto).toContain('El Corazón de Ceniza cae en la Forja Eterna')

    // Exporta legado y borra save
    const legado = Legacy.cargar()
    expect(legado.finales.corazon_ceniza).toBe('victoria pura')
    expect(GameState.restaurar('corazon_ceniza')).toBeNull()
  })

  it('2. Victoria con cicatriz: destruir con grieta >= 60', () => {
    gs.grieta = 65
    const opcionDestruir = eventoFinal.opciones.find((o) => o.clave === 'destruir')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionDestruir)

    expect(res.tipo).toBe('final')
    expect(res.final).toBe('victoria con cicatriz')
    expect(res.estilo).toBe('aviso')
    expect(res.texto).toContain('la grieta quedó')

    const legado = Legacy.cargar()
    expect(legado.finales.corazon_ceniza).toBe('victoria con cicatriz')
  })

  it('3. Victoria compartida: opción brindis con flag promesa', () => {
    gs.flags.promesa = true
    const opcionBrindis = eventoFinal.opciones.find((o) => o.clave === 'brindis')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionBrindis)

    expect(res.tipo).toBe('final')
    expect(res.final).toBe('la victoria compartida')
    expect(res.estilo).toBe('epico')
    expect(res.texto).toContain('Desatas el tercio de Dorotea')
  })

  it('4. La Sombra nueva: opción reclamar el Corazón', () => {
    const opcionReclamar = eventoFinal.opciones.find((o) => o.clave === 'reclamar')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionReclamar)

    expect(res.tipo).toBe('final')
    expect(res.final).toBe('la Sombra nueva')
    expect(res.estilo).toBe('aviso')
    expect(res.texto).toContain('Extiendes la mano y el Corazón ríe')

    // El legado se exporta también con finales oscuros (Apéndice A)
    const legado = Legacy.cargar()
    expect(legado.finales.corazon_ceniza).toBe('la Sombra nueva')
  })

  it('Filtra opción brindis en gatillo si falta la flag promesa', async () => {
    let opcionesPresentadas = null
    const uiMock = {
      decidir: async (_pregunta, opciones) => {
        opcionesPresentadas = opciones
        return null // no elegir nada
      },
      decir: async () => {},
      final: () => {},
    }

    // Sin flag promesa
    gs.flags.promesa = false
    await EventEngine.gatillo(gs, 'final', uiMock, {}, { limpio: true })
    expect(opcionesPresentadas.some((o) => o.clave === 'brindis')).toBe(false)

    // Con flag promesa
    gs.flags.promesa = true
    await EventEngine.gatillo(gs, 'final', uiMock, {}, { limpio: true })
    expect(opcionesPresentadas.some((o) => o.clave === 'brindis')).toBe(true)
  })

  it('Añade nombres de compañeros vivos al epílogo', () => {
    gs.companeros = ['sylvana']
    gs.companerosSalud = { sylvana: { vida: 30, vidaMax: 30 } }
    const opcionDestruir = eventoFinal.opciones.find((o) => o.clave === 'destruir')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionDestruir)

    const nombreSylvana = Datos.recluta('corazon_ceniza', 'sylvana')?.nombre || 'Sylvana'
    expect(res.texto).toContain(nombreSylvana)
  })

  it('Compañero muerto (0 PV) no aparece entre los vivos al alba', () => {
    gs.companeros = ['sylvana']
    gs.companerosSalud = { sylvana: { vida: 0, vidaMax: 30 } }
    const opcionDestruir = eventoFinal.opciones.find((o) => o.clave === 'destruir')
    const res = EventEngine.resolverFinal(gs, eventoFinal, opcionDestruir)

    const nombreSylvana = Datos.recluta('corazon_ceniza', 'sylvana')?.nombre || 'Sylvana'
    expect(res.texto).not.toContain(nombreSylvana)
  })
})
