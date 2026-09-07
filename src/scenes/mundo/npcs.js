// NPCs del mundo — colocación de los NPC del mapa (sprite con paleta propia
// + burbuja «!») y conversación: diálogo por visitas, tienda del tendero,
// reclutamiento de compañeros y decisiones asociadas (Dorotea).
// Extraído de WorldScene; las decisiones narrativas viven en EventEngine.

import Datos from '../../core/Datos.js'
import EventEngine from '../../core/EventEngine.js'
import { extraerReclutar, extraerComprar } from '../../core/Texto.js'
import { partida } from '../../core/partida.js'
import { crearTexturaNpc } from '../../core/Sprites.js'
import { FUENTE } from '../../ui/tema.js'

export function crearNpcs(escena, mapa, lugar) {
  escena.npcs = []
  const capa = mapa.getObjectLayer('npcs')
  if (!capa) return
  for (const o of capa.objects) {
    const npcId = o.name
    const clave = lugar.npcs?.[npcId] || npcId // «lugar.npcs» → clave en `dialogos`
    const tex = crearTexturaNpc(escena, npcId)
    const sprite = escena.add.sprite(o.x, o.y, tex, 0)
    sprite.setDepth(o.y)
    const anim = `npc:${npcId}:idle`
    if (!escena.anims.exists(anim))
      escena.anims.create({
        key: anim,
        frames: [
          { key: tex, frame: 0 },
          { key: tex, frame: 1 },
        ],
        frameRate: 2,
        repeat: -1,
      })
    sprite.anims.play(anim)

    const burbuja = escena.add
      .text(o.x, o.y - 20, '!', { fontFamily: FUENTE, fontSize: '8px', color: '#e0c04a' })
      .setOrigin(0.5)
      .setDepth(o.y + 1)
      .setVisible(false)
    escena.tweens.add({ targets: burbuja, y: o.y - 24, duration: 500, yoyo: true, repeat: -1 })

    const npc = { id: npcId, clave, sprite, burbuja }
    // Tap directo sobre el NPC, además del botón de acción.
    sprite.setInteractive().on('pointerdown', () => escena.hablar(npc))
    escena.npcs.push(npc)
  }
}

export function ctxDialogo(escena) {
  const pj = Datos.aventura(escena.aventura).personajes[partida.heroe] || {}
  return { trato: pj.trato, nombre: pj.nombre }
}

// Resuelve la clave de `dialogos`: array (secuencia por visita, la última
// se repite) o cadena única. Contador persistente en `npcVistos`.
export async function hablar(escena, npc) {
  if (escena.transicionando || escena.pausado || escena.ui?.modal) return

  // Si el NPC tiene una decisión asociada pendiente (p. ej. Dorotea en Ríoclaro)
  if (npc.id === 'dorotea' && escena.lugar.eventos?.includes('encargo')) {
    const ev = Datos.evento(escena.aventura, 'encargo')
    if (ev && !EventEngine.consumida(partida, ev, 'encargo', true)) {
      await EventEngine.gatillo(partida, 'encargo', escena.uiAdaptador, ctxDialogo(escena))
      return
    }
  }

  const dato = Datos.dialogo(escena.aventura, npc.clave)
  if (!dato) return
  const lista = Array.isArray(dato) ? dato : [dato]
  const n = partida.npcVistos[npc.clave] || 0
  const bruto = lista[Math.min(n, lista.length - 1)]
  const { limpio: sinReclutar, reclutaId } = extraerReclutar(bruto)
  const { limpio, esTienda } = extraerComprar(sinReclutar)

  await escena.ui.decir(limpio, ctxDialogo(escena))

  partida.npcVistos[npc.clave] = n + 1
  partida.guardar()

  // Tendero: la línea «Escribe comprar…» ya se ocultó; tras el saludo se
  // abre la tienda del lugar (si el lugar la tiene).
  if (esTienda && escena.lugar.tienda) escena.ui.abrirTienda(escena.lugarId)

  if (reclutaId && !partida.companeros.includes(reclutaId)) {
    const eleccion = await escena.ui.pregunta(['Reclutar', 'Seguir solo'])
    if (eleccion === 0) {
      partida.companeros.push(reclutaId)
      partida.guardar()
      escena.ui.toast(`${Datos.recluta(escena.aventura, reclutaId)?.nombre || reclutaId} se une al grupo`)
    }
  }
}
