// EventEngine — motor narrativo de la Fase E: dispara los eventos del lugar
// al entrar (narrar/emboscar/corrupcion/curar_grupo/otorgar, en el orden del
// JSON) y por gatillo (decision/final), respetando `condicion`, `una_vez` y
// `grieta_desde`. Es lógica pura sobre GameState: la presentación (diálogos,
// decisiones, batalla, avisos) se inyecta como interfaz `ui` para poder
// probarlo sin Phaser:
//
//   ui.decir(texto) → Promise        muestra un diálogo y espera al cierre
//   ui.decidir(pregunta, opciones) → Promise<opcion elegida (objeto)>
//   ui.batalla(enemigos) → Promise<resultado>   combate forzado (emboscada)
//   ui.toast(mensaje) → void         aviso corto (ítems, corrupción)
//   ui.refrescar() → void            HUD tras cambios de estado
//   ui.caida() → void                grieta a 100 → EpilogoScene(caida)

import Datos from './Datos.js'
import Texto from './Texto.js'
import Legacy from './Legacy.js'
import GameState from './GameState.js'

const TIPOS_ENTRADA = ['narrar', 'emboscar', 'corrupcion', 'curar_grupo', 'otorgar']
const TIPOS_GATILLO = ['decision', 'final']

export const EventEngine = {
  // ----------------------------------------------------------- condiciones

  // `condicion` es un objeto simple: {flag: X} exige la flag activa,
  // {no_flag: X} exige que no lo esté. Sin condición → siempre cierta.
  condicionCumplida(gs, condicion) {
    if (!condicion) return true
    if (condicion.flag && !gs.flags[condicion.flag]) return false
    if (condicion.no_flag && gs.flags[condicion.no_flag]) return false
    return true
  },

  // Texto de un `narrar`: si `grieta_desde: N` y la grieta ya llegó a N,
  // se cuenta la variante corrupta.
  textoDe(evento, gs) {
    if (
      evento.grieta_desde !== undefined &&
      evento.texto_grieta &&
      gs.grieta >= evento.grieta_desde
    )
      return evento.texto_grieta
    return evento.texto
  },

  // `una_vez` puede ser true (usar el id del evento como clave) o una clave
  // propia; se consume solo cuando el evento llega a mostrarse. Los gatillos
  // de decisión sin `una_vez` explícito lo llevan implícito (spec Fase E).
  claveUnaVez(evento, eventoId, implicito = false) {
    if (evento.una_vez === true) return eventoId
    if (typeof evento.una_vez === 'string') return evento.una_vez
    return implicito ? eventoId : null
  },

  consumida(gs, evento, eventoId, implicito = false) {
    const clave = this.claveUnaVez(evento, eventoId, implicito)
    return clave ? !!gs.vistos[`evt:${clave}`] : false
  },

  marcarConsumida(gs, evento, eventoId, implicito = false) {
    const clave = this.claveUnaVez(evento, eventoId, implicito)
    if (clave) gs.vistos[`evt:${clave}`] = true
  },

  // --------------------------------------------------------- efectos

  // Aplica los efectos de una opción de decisión: `item` (inventario + aviso),
  // `flag` y `corrupcion` (± puntos × Balance). Los gatillos de decisión se
  // consumen con `una_vez` implícito (una sola vez por partida).
  aplicarEfectos(gs, opcion, ui, ctx = {}) {
    if (opcion.item) {
      gs.inventario.push(opcion.item)
      const nombre = Datos.item(gs.aventura, opcion.item)?.nombre || opcion.item
      ui?.toast(`(Recibes: ${nombre}.)`)
    }
    if (opcion.flag) gs.flags[opcion.flag] = true
    let resGrieta = null
    if (opcion.corrupcion) {
      resGrieta = gs.sumarGrieta(opcion.corrupcion)
      ui?.refrescar()
    }
    gs.guardar()
    return resGrieta
  },

  // Ejecuta una `decision`: pregunta, texto de la opción elegida y efectos.
  // Devuelve la opción elegida (null si el evento no procede).
  async decision(gs, evento, ui, ctx) {
    const elegida = await ui.decidir(evento.pregunta, evento.opciones, ctx)
    if (!elegida) return null
    if (elegida.texto) await ui.decir(elegida.texto, ctx)
    const resGrieta = this.aplicarEfectos(gs, elegida, ui, ctx)
    if (resGrieta?.caida) ui.caida()
    return elegida
  },

  // -------------------------------------------------- eventos de entrada

  // Procesa los `eventos[]` del lugar al entrar, en orden. Cada uno debe
  // superar su condición y no estar consumido (`una_vez`). Devuelve true si
  // la entrada acabó en caída (el llamador no debe seguir).
  async alEntrar(gs, lugarId, ui, ctx = {}) {
    const lugar = Datos.lugar(gs.aventura, lugarId)
    for (const eventoId of lugar.eventos || []) {
      const evento = Datos.evento(gs.aventura, eventoId)
      if (!evento || !TIPOS_ENTRADA.includes(evento.tipo)) continue
      if (this.consumida(gs, evento, eventoId)) continue
      if (!this.condicionCumplida(gs, evento.condicion)) continue

      const caida = await this.ejecutar(gs, eventoId, evento, ui, ctx)
      if (caida) return true
    }
    return false
  },

  // Un evento concreto ya validado (condición y una_vez). Devuelve true si
  // hubo caída.
  async ejecutar(gs, eventoId, evento, ui, ctx) {
    let caida = false
    switch (evento.tipo) {
      case 'narrar':
      case 'otorgar': {
        await ui.decir(this.textoDe(evento, gs), ctx)
        if (evento.tipo === 'otorgar' && evento.item) {
          gs.inventario.push(evento.item)
          const nombre = Datos.item(gs.aventura, evento.item)?.nombre || evento.item
          ui.toast(`(Recibes: ${nombre}.)`)
          ui.refrescar()
        }
        break
      }
      case 'corrupcion': {
        const res = gs.sumarGrieta(evento.puntos)
        ui.refrescar()
        await ui.decir(
          `${evento.aviso || ''}\n(La grieta se abre: ${res.delta > 0 ? '+' : ''}${res.delta} → ${res.grieta}/100.)`,
          ctx
        )
        caida = res.caida
        break
      }
      case 'curar_grupo': {
        const res = gs.curarGrupo(evento.corrupcion || 0)
        ui.refrescar()
        await ui.decir(evento.texto, ctx)
        if (res.delta)
          ui.toast(`(La grieta remite: ${res.delta} → ${res.grieta}/100.)`)
        break
      }
      case 'emboscar': {
        await ui.decir(evento.texto, ctx)
        const resultado = await ui.batalla(evento.enemigos)
        if (resultado === 'derrota' || resultado === 'caida') caida = true
        break
      }
      case 'decision': {
        const elegida = await this.decision(gs, evento, ui, ctx)
        if (elegida) this.marcarConsumida(gs, evento, eventoId, true) // una_vez implícito
        break
      }
      default:
        return false
    }
    if (caida) {
      ui.caida()
      return true
    }
    // `una_vez` se consume solo cuando el evento llegó a mostrarse.
    this.marcarConsumida(gs, evento, eventoId)
    gs.guardar()
    return false
  },

  // -------------------------------------------------------- gatillos

  // Dispara el evento de un gatillo del mapa (decision/final). `limpio` es
  // la condición extra del `final`: todos los enemigos del lugar derrotados
  // en la visita actual. Devuelve 'ejecutado' | 'pendiente' | 'no-aplica'.
  async gatillo(gs, eventoId, ui, ctx, { limpio = true } = {}) {
    const evento = Datos.evento(gs.aventura, eventoId)
    if (!evento) return 'no-aplica'
    if (!TIPOS_GATILLO.includes(evento.tipo)) {
      // Los eventos de entrada también pueden colgarse de un gatillo por
      // diseño de mapa; se comportan igual (respetan condición y una_vez).
      if (!TIPOS_ENTRADA.includes(evento.tipo)) return 'no-aplica'
    }
    const implicito = evento.tipo === 'decision' // una_vez implícito por gatillo
    if (this.consumida(gs, evento, eventoId, implicito)) return 'no-aplica'
    if (!this.condicionCumplida(gs, evento.condicion)) return 'no-aplica'

    if (evento.tipo === 'final') {
      if (!limpio) return 'pendiente'
      const opcionesValidas = (evento.opciones || []).filter((op) => {
        if (!op.requiere_flag) return true
        return Boolean(gs.flags && gs.flags[op.requiere_flag])
      })
      const elegida = await ui.decidir(evento.pregunta, opcionesValidas, ctx)
      if (!elegida) return 'pendiente'
      if (elegida.texto) await ui.decir(elegida.texto, ctx)
      this.marcarConsumida(gs, evento, eventoId, true)
      ui.final(elegida, evento)
      return 'ejecutado'
    }

    await this.ejecutar(gs, eventoId, evento, ui, ctx)
    return 'ejecutado'
  },

  // ---------------------------------------------------- resolución de final (Fase F)

  // Resuelve el epílogo y final según la spec (§5.6 y Fase F):
  // 1. Si la opción tiene epílogo propio (brindis, reclamar, etc.) → se usa tal cual con su estilo.
  // 2. Si es opción base (destruir, etc.) → compara grieta vs umbral_tentado (puro vs tentado).
  // 3. Añade texto_companeros interpolando {nombres} con los compañeros vivos.
  // 4. Exporta legado y borra el save actual de la aventura.
  resolverFinal(gs, evento, elegida) {
    let textoEpilogo = ''
    let nombreFinal = ''
    let estilo = 'epico'

    if (elegida && elegida.epilogo) {
      textoEpilogo = elegida.epilogo
      nombreFinal = elegida.final || elegida.titulo
      estilo = elegida.estilo || 'epico'
    } else {
      const umbral = evento.umbral_tentado ?? 60
      const tentado = gs.grieta >= umbral
      if (tentado) {
        textoEpilogo = evento.epilogo_tentado
        nombreFinal = evento.final_tentado
        estilo = 'aviso'
      } else {
        textoEpilogo = evento.epilogo_puro
        nombreFinal = evento.final_puro
        estilo = 'epico'
      }
    }

    // Compañeros vivos
    const companerosVivos = (gs.companeros || []).filter((id) => {
      const salud = gs.companerosSalud?.[id]
      return !salud || salud.vida > 0
    })

    if (companerosVivos.length > 0 && evento.texto_companeros) {
      const nombres = companerosVivos
        .map((id) => Datos.recluta(gs.aventura, id)?.nombre || id)
        .join(', ')
      const lineaComp = Texto.tpl(evento.texto_companeros, { nombres })
      textoEpilogo = `${textoEpilogo}\n\n${lineaComp}`
    }

    // Exportar legado y borrar partida guardada
    Legacy.exportar(gs, nombreFinal)
    GameState.borrar(gs.aventura)

    return {
      tipo: 'final',
      texto: textoEpilogo,
      final: nombreFinal,
      estilo,
      aventura: gs.aventura,
      heroe: gs.heroe,
    }
  },
}

export default EventEngine
