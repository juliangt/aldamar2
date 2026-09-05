import { describe, it, expect, beforeEach } from 'vitest'
import Datos from '../src/core/Datos.js'
import Legacy from '../src/core/Legacy.js'
import GameState from '../src/core/GameState.js'
import EventEngine from '../src/core/EventEngine.js'
import Combate from '../src/core/Combate.js'
import Balance from '../src/core/Balance.js'
import Rng from '../src/core/Rng.js'

describe('Fase G — Pruebas Integrales de las 4 Aventuras y Cadena de Legado', () => {
  beforeEach(() => {
    localStorage.clear()
    Legacy.limpiar()
  })

  describe('1. El Corazón de Ceniza', () => {
    it('Flujo completo de decisiones, ramas y finales condicionales', () => {
      const gs = new GameState()
      gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino')

      // Decisión Consejo: rama 'alianza' vs 'deposito'
      const evConsejo = Datos.evento('corazon_ceniza', 'consejo')
      const opAlianza = evConsejo.opciones.find((o) => o.clave === 'alianza')
      EventEngine.aplicarEfectos(gs, opAlianza)
      expect(gs.tieneFlag('alianza')).toBe(true)
      expect(gs.inventario).toContain('estandarte')

      // Decisión Encargo: rama 'prometer' vs 'esquivar'
      const evEncargo = Datos.evento('corazon_ceniza', 'encargo')
      const opPrometer = evEncargo.opciones.find((o) => o.clave === 'prometer')
      EventEngine.aplicarEfectos(gs, opPrometer)
      expect(gs.tieneFlag('promesa')).toBe(true)
      expect(gs.inventario).toContain('tercio')

      // Final: con flag promesa, 'brindis' da 'la victoria compartida'
      const evFinal = Datos.evento('corazon_ceniza', 'final')
      const opBrindis = evFinal.opciones.find((o) => o.clave === 'brindis')
      const resFinal = EventEngine.resolverFinal(gs, evFinal, opBrindis)
      expect(resFinal.final).toBe('la victoria compartida')
      expect(resFinal.estilo).toBe('epico')

      // Finales alternativos:
      const gsPuro = new GameState()
      gsPuro.nuevaPartida('corazon_ceniza', 'ithel', 'camino')
      gsPuro.grieta = 10
      const opDestruir = evFinal.opciones.find((o) => o.clave === 'destruir')
      const resPuro = EventEngine.resolverFinal(gsPuro, evFinal, opDestruir)
      expect(resPuro.final).toBe('victoria pura')

      const gsTentado = new GameState()
      gsTentado.nuevaPartida('corazon_ceniza', 'dagna', 'camino')
      gsTentado.grieta = 65
      const resTentado = EventEngine.resolverFinal(gsTentado, evFinal, opDestruir)
      expect(resTentado.final).toBe('victoria con cicatriz')

      const opReclamar = evFinal.opciones.find((o) => o.clave === 'reclamar')
      const resReclamar = EventEngine.resolverFinal(gs, evFinal, opReclamar)
      expect(resReclamar.final).toBe('la Sombra nueva')
    })

    it('Jefe Custodio en las 3 dificultades', () => {
      for (const dif of ['camino', 'ceniza', 'hierro']) {
        const gs = new GameState()
        gs.nuevaPartida('corazon_ceniza', 'ruy', dif)
        const puntosCorrupcion = Balance.corrupcion(10, dif)
        expect(puntosCorrupcion).toBeGreaterThan(0)

        const enemigoDef = Datos.enemigo('corazon_ceniza', 'custodio')
        const combate = new Combate(gs, ['custodio'], new Rng(1))
        expect(combate.enemigos[0].vida).toBe(Balance.statEnemigo(enemigoDef.vida, 'vida_enemigos', dif))
        expect(combate.enemigos[0].fases).toBeDefined()
      }
    })
  })

  describe('2. La Brasa de Vegaverde', () => {
    it('Flujo completo: decisión colmena, jefe ahumado (simple) y finales', () => {
      const gs = new GameState()
      gs.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')

      // Decisión colmena: aceptar da panal y flag bruna
      const evColmena = Datos.evento('brasa_vegaverde', 'colmena')
      const opAceptar = evColmena.opciones.find((o) => o.clave === 'aceptar')
      EventEngine.aplicarEfectos(gs, opAceptar)
      expect(gs.tieneFlag('bruna')).toBe(true)
      expect(gs.inventario).toContain('panal')

      // Jefe ahumado: jefe simple sin fases
      const ahumadoDef = Datos.enemigo('brasa_vegaverde', 'ahumado')
      expect(ahumadoDef.fases).toBeUndefined()
      expect(ahumadoDef.sin_huida).toBe(true)
      const combateAhumado = new Combate(gs, ['ahumado'], new Rng(1))
      expect(combateAhumado.enemigos[0].vida).toBe(26)

      // Final: con flag bruna, opción 'cera' da 'la brasa ahogada con cera'
      const evFinal = Datos.evento('brasa_vegaverde', 'final')
      const opCera = evFinal.opciones.find((o) => o.clave === 'cera')
      const resCera = EventEngine.resolverFinal(gs, evFinal, opCera)
      expect(resCera.final).toBe('la brasa ahogada con cera')
      expect(resCera.estilo).toBe('epico')

      // Sin flag bruna: agua pura vs tentado
      const gsSinBruna = new GameState()
      gsSinBruna.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')
      gsSinBruna.grieta = 20
      const opAgua = evFinal.opciones.find((o) => o.clave === 'agua')
      const resAguaPura = EventEngine.resolverFinal(gsSinBruna, evFinal, opAgua)
      expect(resAguaPura.final).toBe('la brasa ahogada en agua limpia')

      gsSinBruna.grieta = 55
      const resAguaTentada = EventEngine.resolverFinal(gsSinBruna, evFinal, opAgua)
      expect(resAguaTentada.final).toBe('la brasa ahogada, la grieta encendida')
    })

    it('Secreto abejas con semilla 20', () => {
      const secAbejas = Datos.aventura('brasa_vegaverde').secretos?.abejas
      expect(secAbejas).toBeDefined()
      expect(secAbejas.comando).toBe('abejas')
      expect(secAbejas.semillas?.['20']).toContain('veinte primaveras')
    })
  })

  describe('3. La Sal y la Ceniza', () => {
    it('Flujo completo: decisión faro, requisitos de entrada, jefes y finales', () => {
      const gs = new GameState()
      gs.nuevaPartida('sal_y_ceniza', 'bruna', 'camino')

      // Decisión faro: encender da farol y flag faro_encendido
      const evFaro = Datos.evento('sal_y_ceniza', 'faro')
      const opEncender = evFaro.opciones.find((o) => o.clave === 'encender')
      EventEngine.aplicarEfectos(gs, opEncender)
      expect(gs.tieneFlag('faro_encendido')).toBe(true)
      expect(gs.inventario).toContain('farol_sal')

      // Salina Vieja requiere farol_sal
      const lugarSalina = Datos.lugar('sal_y_ceniza', 'salina_vieja')
      expect(lugarSalina.requiere).toBe('farol_sal')
      expect(gs.inventario.includes(lugarSalina.requiere)).toBe(true)

      // Jefes: ahogado (con huida) y viuda (sin huida)
      const ahogadoDef = Datos.enemigo('sal_y_ceniza', 'ahogado')
      expect(ahogadoDef.sin_huida).toBe(false)

      const viudaDef = Datos.enemigo('sal_y_ceniza', 'viuda')
      expect(viudaDef.sin_huida).toBe(true)
      expect(viudaDef.defensa).toBe(1)
      const combateViuda = new Combate(gs, ['viuda'], new Rng(1))
      expect(combateViuda.enemigos[0].vida).toBe(36)

      // Final: con flag faro_encendido, opción 'farera' da 'el faro de la ascua'
      const evFinal = Datos.evento('sal_y_ceniza', 'final')
      const opFarera = evFinal.opciones.find((o) => o.clave === 'farera')
      const resFarera = EventEngine.resolverFinal(gs, evFinal, opFarera)
      expect(resFarera.final).toBe('el faro de la ascua')
      expect(resFarera.estilo).toBe('epico')

      // Sin flag faro_encendido: rama salmuera pura y tentada
      const gsRobado = new GameState()
      gsRobado.nuevaPartida('sal_y_ceniza', 'gala', 'camino')
      gsRobado.grieta = 15
      const opSalmuera = evFinal.opciones.find((o) => o.clave === 'salmuera')
      const resSalPura = EventEngine.resolverFinal(gsRobado, evFinal, opSalmuera)
      expect(resSalPura.final).toBe('la sal vuelve a ser sal')

      gsRobado.grieta = 60
      const resSalTentada = EventEngine.resolverFinal(gsRobado, evFinal, opSalmuera)
      expect(resSalTentada.final).toBe('la sal limpia, la grieta nadadora')
    })

    it('Comando especial marea y secreto gaviota semilla 40', () => {
      const gs = new GameState()
      gs.nuevaPartida('sal_y_ceniza', 'tamara', 'camino')
      gs.grieta = 20
      const combate = new Combate(gs, ['cangrejo'], new Rng(1))

      const evsMarea = combate.comandoEspecial()
      const evDanoMarea = evsMarea.find((e) => e.tipo === 'dano')
      expect(evDanoMarea).toBeDefined()
      // daño base 10 + 3 * floor(20/10) = 16
      expect(evDanoMarea.cantidad).toBe(16)

      const secGaviota = Datos.aventura('sal_y_ceniza').secretos?.gaviota
      expect(secGaviota).toBeDefined()
      expect(secGaviota.comando).toBe('gaviota')
      expect(secGaviota.semillas?.['40']).toContain('cuarenta inviernos')
    })
  })

  describe('4. La Aguja sin Sombra', () => {
    it('Flujo completo: decisión estandarte, puertas de yerma/aguja_pies, triple combate y finales', () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')

      // Decisión estandarte en Valoria
      const evEstandarte = Datos.evento('aguja_sin_sombra', 'estandarte')
      const opAlianza = evEstandarte.opciones.find((o) => o.clave === 'alianza')
      EventEngine.aplicarEfectos(gs, opAlianza)
      expect(gs.tieneFlag('consejo')).toBe(true)
      expect(gs.inventario).toContain('estandarte')

      // Evento campanilla en refugio
      const evCampanilla = Datos.evento('aguja_sin_sombra', 'campanilla')
      EventEngine.aplicarEfectos(gs, evCampanilla)
      expect(gs.inventario).toContain('campanilla')

      // Puertas con requisitos: yerma (estandarte), aguja_pies (campanilla)
      const lugarYerma = Datos.lugar('aguja_sin_sombra', 'yerma')
      const lugarPies = Datos.lugar('aguja_sin_sombra', 'aguja_pies')
      expect(lugarYerma.requiere).toBe('estandarte')
      expect(lugarPies.requiere).toBe('campanilla')
      expect(gs.inventario.includes(lugarYerma.requiere)).toBe(true)
      expect(gs.inventario.includes(lugarPies.requiere)).toBe(true)

      // Triple combate secuencial: eco_voz (24), capitan_rehecho (30), morvath (36)
      const defEco = Datos.enemigo('aguja_sin_sombra', 'eco_voz')
      const defCap = Datos.enemigo('aguja_sin_sombra', 'capitan_rehecho')
      const defMor = Datos.enemigo('aguja_sin_sombra', 'morvath')
      expect(defEco.vida).toBe(24)
      expect(defCap.vida).toBe(28)
      expect(defMor.vida).toBe(36)
      expect(defMor.fases).toBeDefined()

      // Final: con flag consejo, opción 'alianza' da 'la Alianza de las Cuatro'
      const evFinal = Datos.evento('aguja_sin_sombra', 'final')
      const opAlianzaFinal = evFinal.opciones.find((o) => o.clave === 'alianza')
      const resAlianza = EventEngine.resolverFinal(gs, evFinal, opAlianzaFinal)
      expect(resAlianza.final).toBe('la Alianza de las Cuatro')
      expect(resAlianza.estilo).toBe('epico')

      // Sin flag consejo: quebrar pura vs quebrar tentada
      const gsQuebrar = new GameState()
      gsQuebrar.nuevaPartida('aguja_sin_sombra', 'vela', 'camino')
      gsQuebrar.grieta = 10
      const opQuebrar = evFinal.opciones.find((o) => o.clave === 'quebrar')
      const resQuebrarPura = EventEngine.resolverFinal(gsQuebrar, evFinal, opQuebrar)
      expect(resQuebrarPura.final).toBe('la Aguja sin Sombra')

      gsQuebrar.grieta = 65
      const resQuebrarTentada = EventEngine.resolverFinal(gsQuebrar, evFinal, opQuebrar)
      expect(resQuebrarTentada.final).toBe('la Aguja calla, la grieta canta')
    })

    it('Comando especial eco y secreto campanilla semilla 100', () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'bram', 'camino')
      gs.grieta = 30
      const combate = new Combate(gs, ['trasgo'], new Rng(1))

      const evsEco = combate.comandoEspecial()
      const evDanoEco = evsEco.find((e) => e.tipo === 'dano')
      expect(evDanoEco).toBeDefined()
      // daño base 12 + 3 * floor(30/10) = 21
      expect(evDanoEco.cantidad).toBe(21)

      const secCampanilla = Datos.aventura('aguja_sin_sombra').secretos?.campanilla
      expect(secCampanilla).toBeDefined()
      expect(secCampanilla.comando).toBe('campanilla')
      expect(secCampanilla.semillas?.['100']).toContain('cien campanadas')
    })
  })

  describe('5. Cadena Real de Legado (Corazón → Brasa → Sal → Aguja)', () => {
    it('Encadena las 4 campañas consecutivas acumulando héroes, fama y banderas de legado', () => {
      // ----------------------------------------------------
      // CAMPAÑA 1: El Corazón de Ceniza
      // ----------------------------------------------------
      const gs1 = new GameState()
      gs1.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      gs1.nombre = 'Tilo el Jardinero'

      // Firma la alianza, promete a Dorotea y toma la corona (para activar juramento y grieta de legado)
      const evConsejo = Datos.evento('corazon_ceniza', 'consejo')
      EventEngine.aplicarEfectos(gs1, evConsejo.opciones.find((o) => o.clave === 'alianza'))
      const evEncargo = Datos.evento('corazon_ceniza', 'encargo')
      EventEngine.aplicarEfectos(gs1, evEncargo.opciones.find((o) => o.clave === 'prometer'))
      const evCorona = Datos.evento('corazon_ceniza', 'corona')
      EventEngine.aplicarEfectos(gs1, evCorona.opciones.find((o) => o.clave === 'tomarla'))

      // Resolver final 'la victoria compartida'
      const evFinal1 = Datos.evento('corazon_ceniza', 'final')
      EventEngine.resolverFinal(gs1, evFinal1, evFinal1.opciones.find((o) => o.clave === 'brindis'))

      // Verificar legado tras Campaña 1
      let legado = Legacy.cargar()
      expect(legado.juramento).toBe(true) // exportado de alianza
      expect(legado.grieta).toBe(true) // exportado de coronado
      expect(legado.finales.corazon_ceniza).toBe('la victoria compartida')
      expect(legado.heroes).toHaveLength(1)
      expect(legado.heroes[0].nombre).toBe('Tilo el Jardinero')

      // ----------------------------------------------------
      // CAMPAÑA 2: La Brasa de Vegaverde
      // ----------------------------------------------------
      const gs2 = new GameState()
      gs2.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')
      gs2.nombre = 'Enebro de Vegaverde'

      // Banderas de legado importadas
      expect(gs2.tieneFlag('juramento')).toBe(true)
      expect(gs2.tieneFlag('grieta')).toBe(true)

      // Eventos de cadena activos
      const evCasaLlena = Datos.evento('brasa_vegaverde', 'casa_llena')
      expect(EventEngine.condicionCumplida(gs2, evCasaLlena.condicion)).toBe(true)
      const evAgua = Datos.evento('brasa_vegaverde', 'agua_que_cuenta')
      expect(EventEngine.condicionCumplida(gs2, evAgua.condicion)).toBe(true)

      // Recluta a Bruna en colmenar
      const evColmena = Datos.evento('brasa_vegaverde', 'colmena')
      EventEngine.aplicarEfectos(gs2, evColmena.opciones.find((o) => o.clave === 'aceptar'))
      expect(gs2.tieneFlag('bruna')).toBe(true)

      // Final con cera
      const evFinal2 = Datos.evento('brasa_vegaverde', 'final')
      EventEngine.resolverFinal(gs2, evFinal2, evFinal2.opciones.find((o) => o.clave === 'cera'))

      // Verificar legado tras Campaña 2
      legado = Legacy.cargar()
      expect(legado.juramento).toBe(true) // exportado de bruna
      expect(legado.finales.brasa_vegaverde).toBe('la brasa ahogada con cera')
      expect(legado.heroes).toHaveLength(2)
      expect(legado.heroes[1].nombre).toBe('Enebro de Vegaverde')

      // ----------------------------------------------------
      // CAMPAÑA 3: La Sal y la Ceniza
      // ----------------------------------------------------
      const gs3 = new GameState()
      gs3.nuevaPartida('sal_y_ceniza', 'bruna', 'camino')
      gs3.nombre = 'Bruna del Panal'

      // Banderas importadas
      expect(gs3.tieneFlag('juramento')).toBe(true)

      // Evento de cadena activo
      const evCadenaVado = Datos.evento('sal_y_ceniza', 'cadena_en_el_vado')
      expect(EventEngine.condicionCumplida(gs3, evCadenaVado.condicion)).toBe(true)

      // Enciende el faro
      const evFaro = Datos.evento('sal_y_ceniza', 'faro')
      EventEngine.aplicarEfectos(gs3, evFaro.opciones.find((o) => o.clave === 'encender'))
      expect(gs3.tieneFlag('faro_encendido')).toBe(true)

      // Final farera
      const evFinal3 = Datos.evento('sal_y_ceniza', 'final')
      EventEngine.resolverFinal(gs3, evFinal3, evFinal3.opciones.find((o) => o.clave === 'farera'))

      // Verificar legado tras Campaña 3
      legado = Legacy.cargar()
      expect(legado.juramento).toBe(true) // exportado de faro_encendido
      expect(legado.finales.sal_y_ceniza).toBe('el faro de la ascua')
      expect(legado.heroes).toHaveLength(3)
      expect(legado.heroes[2].nombre).toBe('Bruna del Panal')

      // ----------------------------------------------------
      // CAMPAÑA 4: La Aguja sin Sombra
      // ----------------------------------------------------
      const gs4 = new GameState()
      gs4.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')
      gs4.nombre = 'Renco del Vado'

      // Banderas importadas
      expect(gs4.tieneFlag('juramento')).toBe(true)

      // Evento de cadena activo
      const evCadenaMolino = Datos.evento('aguja_sin_sombra', 'cadena_en_el_molino')
      expect(EventEngine.condicionCumplida(gs4, evCadenaMolino.condicion)).toBe(true)

      // Jura la alianza en Valoria
      const evEstandarte = Datos.evento('aguja_sin_sombra', 'estandarte')
      EventEngine.aplicarEfectos(gs4, evEstandarte.opciones.find((o) => o.clave === 'alianza'))
      expect(gs4.tieneFlag('consejo')).toBe(true)

      // Final Alianza de las Cuatro
      const evFinal4 = Datos.evento('aguja_sin_sombra', 'final')
      EventEngine.resolverFinal(gs4, evFinal4, evFinal4.opciones.find((o) => o.clave === 'alianza'))

      // Verificar legado tras completar las 4 campañas
      legado = Legacy.cargar()
      expect(legado.juramento).toBe(true) // exportado de consejo
      expect(legado.finales.aguja_sin_sombra).toBe('la Alianza de las Cuatro')
      expect(legado.heroes).toHaveLength(4)
      expect(legado.heroes[3].nombre).toBe('Renco del Vado')

      // Las 4 aventuras tienen sus finales registrados
      expect(Object.keys(legado.finales)).toHaveLength(4)
      expect(legado.finales).toEqual({
        corazon_ceniza: 'la victoria compartida',
        brasa_vegaverde: 'la brasa ahogada con cera',
        sal_y_ceniza: 'el faro de la ascua',
        aguja_sin_sombra: 'la Alianza de las Cuatro',
      })
    })
  })
})
