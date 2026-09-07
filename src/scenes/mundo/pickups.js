// Pickups del mundo — objetos y monedas de las capas del mapa: sprite con
// brillo, recogida una vez por partida (persistida en `recogidos`) y
// aplicación al inventario/monedero con autosave. Extraído de WorldScene.

import Datos from '../../core/Datos.js'
import { partida } from '../../core/partida.js'
import { audio8 } from '../../core/Audio8.js'

export function crearPickups(escena, mapa) {
  escena.pickups = []
  for (const [nombreCapa, tipo] of [['objetos', 'objeto'], ['monedas', 'moneda']]) {
    const capa = mapa.getObjectLayer(nombreCapa)
    if (!capa) continue
    capa.objects.forEach((o, i) => {
      const claveRecogido = `${escena.lugarId}:${nombreCapa}:${o.name || 'obj'}:${i}`
      if (partida.recogidos[claveRecogido]) return // una vez por partida
      const sprite = escena.add.sprite(o.x, o.y, tipo === 'moneda' ? 'fx:moneda' : 'fx:objeto', 0)
      sprite.setDepth(o.y)
      escena.physics.add.existing(sprite, true)
      escena.tweens.add({ targets: sprite, scale: { from: 0.8, to: 1 }, duration: 600, yoyo: true, repeat: -1 })
      const pickup = {
        tipo,
        id: o.name,
        valor: leerProps(o).valor || 1,
        sprite,
        claveRecogido,
      }
      escena.physics.add.overlap(escena.jugador, sprite, () => escena.recoger(pickup))
      escena.pickups.push(pickup)
    })
  }
}

export function recoger(escena, pickup) {
  if (pickup.recogido || escena.ui?.modal) return
  pickup.recogido = true
  audio8.sfx('moneda')
  partida.recogidos[pickup.claveRecogido] = true
  if (pickup.tipo === 'moneda') {
    partida.monedas += pickup.valor
    escena.ui.toast(`(+${pickup.valor} monedas)`)
  } else {
    partida.inventario.push(pickup.id)
    escena.ui.toast(`(Recibes: ${Datos.item(escena.aventura, pickup.id)?.nombre || pickup.id}.)`)
  }
  partida.guardar()
  escena.ui.refrescarHud()
  pickup.sprite.destroy()
  escena.pickups = escena.pickups.filter((p) => p !== pickup)
}

function leerProps(objeto) {
  const props = {}
  for (const p of objeto.properties || []) props[p.name] = p.value
  return props
}
