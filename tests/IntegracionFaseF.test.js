import { describe, it, expect, beforeEach } from 'vitest'
import Datos from '../src/core/Datos.js'
import Legacy from '../src/core/Legacy.js'
import GameState from '../src/core/GameState.js'
import EventEngine from '../src/core/EventEngine.js'

describe('Integración Fase F — Bucle de juego completo y legado', () => {
  beforeEach(() => {
    localStorage.clear()
    Legacy.limpiar()
  })

  it('Bucle 1: Campaña 1 con héroe personalizado y final alcanzado', () => {
    // 1. Iniciar partida con héroe Tilo pero nombre personalizado
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 42)
    gs.nombre = 'Tilo el Valiente'
    gs.flags.alianza = true
    gs.flags.coronado = true
    gs.flags.promesa = true
    gs.guardar()

    // 2. Verificar que guardar y restaurar preserva el nombre personalizado y flags
    const restaurada = GameState.restaurar('corazon_ceniza')
    expect(restaurada.nombre).toBe('Tilo el Valiente')
    expect(restaurada.flags.alianza).toBe(true)
    expect(restaurada.flags.coronado).toBe(true)

    // 3. Alcanzar el evento final y elegir opción especial 'brindis'
    const eventoFinal = Datos.evento('corazon_ceniza', 'final')
    const opcionBrindis = eventoFinal.opciones.find((o) => o.clave === 'brindis')
    const resFinal = EventEngine.resolverFinal(gs, eventoFinal, opcionBrindis)

    expect(resFinal.final).toBe('la victoria compartida')
    expect(resFinal.estilo).toBe('epico')

    // 4. Tras el final, el save de la aventura se borra
    expect(GameState.restaurar('corazon_ceniza')).toBeNull()

    // 5. El legado global tiene juramento y grieta activos y héroe registrado
    const legado = Legacy.cargar()
    expect(legado.juramento).toBe(true)
    expect(legado.grieta).toBe(true)
    expect(legado.finales.corazon_ceniza).toBe('la victoria compartida')
    expect(legado.heroes).toHaveLength(1)
    expect(legado.heroes[0].nombre).toBe('Tilo el Valiente')
  })

  it('Bucle 2: Campaña 2 (Brasa de Vegaverde) importa el legado y activa casa_llena', async () => {
    // Simulamos que la Campaña 1 ya se completó con alianza
    const previo = Legacy.cargar()
    previo.juramento = true
    previo.grieta = true
    previo.finales.corazon_ceniza = 'victoria pura'
    previo.guardar()

    // Comprobar que Brasa de Vegaverde detecta que tiene fama / banderas importadas
    expect(previo.tieneBanderasImportadas('brasa_vegaverde')).toBe(true)

    // Iniciar Brasa de Vegaverde
    const gsBrasa = new GameState()
    gsBrasa.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')

    // Al iniciar con nuevaPartida, Legacy.importar se ejecuta automáticamente
    expect(gsBrasa.flags.juramento).toBe(true)
    expect(gsBrasa.flags.grieta).toBe(true)

    // Validar que el evento de cadena 'casa_llena' cumple su condición gracias al legado
    const eventoCasaLlena = Datos.evento('brasa_vegaverde', 'casa_llena')
    expect(eventoCasaLlena.condicion.flag).toBe('juramento')
    expect(EventEngine.condicionCumplida(gsBrasa, eventoCasaLlena.condicion)).toBe(true)

    // Y el evento 'agua_que_cuenta' también cumple su condición
    const eventoAgua = Datos.evento('brasa_vegaverde', 'agua_que_cuenta')
    expect(eventoAgua.condicion.flag).toBe('grieta')
    expect(EventEngine.condicionCumplida(gsBrasa, eventoAgua.condicion)).toBe(true)
  })

  it('Muerte y Caída borran la partida sin otorgar banderas de legado', () => {
    const gs = new GameState()
    gs.nuevaPartida('corazon_ceniza', 'ithel', 'ceniza')
    gs.flags.alianza = true // tenía alianza temporalmente
    gs.guardar()

    expect(GameState.restaurar('corazon_ceniza')).not.toBeNull()

    // Al morir o caer, se borra la partida
    GameState.borrar('corazon_ceniza')
    expect(GameState.restaurar('corazon_ceniza')).toBeNull()

    // El legado no registra final ni activa banderas
    const legado = Legacy.cargar()
    expect(legado.finales.corazon_ceniza).toBeUndefined()
    expect(legado.juramento).toBe(false)
  })
})
