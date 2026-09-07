// Enemigos del mundo — sprites de la capa «enemigos» con su vaivén y el
// guard puro de decisión de combate (lo llama WorldScene.tocarEnemigo).
// La transición y la resolución post-combate (WAKE) viven en la escena.

import Datos from '../../core/Datos.js'
import { crearTexturaEnemigo } from '../../core/Sprites.js'

// Los enemigos del lugar son un grupo: tocar cualquiera inicia un combate
// contra todos los vivos (trasgo ×2 en minas = multi-enemigo).
export function crearEnemigos(escena, mapa, lugar) {
  escena.enemigosMapa = []
  const capa = mapa.getObjectLayer('enemigos')
  if (!capa) return
  for (const o of capa.objects) {
    const id = o.name
    if (!Datos.enemigo(escena.aventura, id)) continue
    const dato = Datos.enemigo(escena.aventura, id)
    const escala = dato.sin_huida || (dato.fases && dato.fases.length) ? 1.5 : 1
    const sprite = escena.add.sprite(o.x, o.y, crearTexturaEnemigo(escena, id)).setOrigin(0.5, 1)
    sprite.setDepth(o.y)
    sprite.setScale(escala)
    escena.tweens.add({
      targets: sprite,
      x: o.x + 3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
    escena.physics.add.existing(sprite, true)
    sprite.body.setSize(12, 10).setOffset(2, 6)
    const enemigo = { id, sprite, x: o.x, y: o.y }
    escena.physics.add.overlap(escena.jugador, sprite, () => escena.tocarEnemigo(enemigo))
    escena.enemigosMapa.push(enemigo)
  }
}

// ¿Debe iniciar el combate al tocar un enemigo? Puro y testeable: bloqueos
// de transición/pausa/modal, gracia de huida y Battle ya activa.
export function puedeIniciarCombate(escena, ahora) {
  const vivos = (escena.enemigosMapa || []).filter((e) => !e.derrotado)
  if (!vivos.length) return false
  if (
    escena.transicionando ||
    escena.pausado ||
    escena.ui?.modal ||
    escena.graciaHuida > ahora ||
    escena.scene.isActive('Battle')
  )
    return false
  return true
}

// En aguja_cima el combate es estrictamente secuencial:
// eco_voz → capitan_rehecho → morvath.
export function enemigosDeBatalla(escena) {
  const vivos = (escena.enemigosMapa || []).filter((e) => !e.derrotado)
  const esSecuencial = escena.lugarId === 'aguja_cima'
  return {
    ids: esSecuencial ? [vivos[0].id] : vivos.map((e) => e.id),
    enCurso: esSecuencial ? vivos[0] : null,
  }
}
