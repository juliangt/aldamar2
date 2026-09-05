// Arranque: crear el juego y desbloquear el AudioContext al primer toque
// (política de autoplay móvil).

import './style.css'
import Phaser from 'phaser'
import config from './config.js'
import { audio8 } from './core/Audio8.js'
import { Texto } from './core/Texto.js'
import { Rng } from './core/Rng.js'
import Datos from './core/Datos.js'
import { partida } from './core/partida.js'

// Prueba manual (criterio de aceptación Fase 0): ver consola tras `npm run dev`.
function pruebaManual() {
  const t = Texto.tpl('Saludos, {trato} {nombre}.', {
    trato: 'jardinero',
    nombre: 'Tilo',
  })
  const r1 = new Rng('aldamar')
  const secuencia = [r1.next(), r1.int(6), r1.chance(0.5), r1.pick(['a', 'b'])]
  const r2 = new Rng('aldamar')
  const repite = [r2.next(), r2.int(6), r2.chance(0.5), r2.pick(['a', 'b'])]
  const determinista = JSON.stringify(secuencia) === JSON.stringify(repite)
  const recluta = Texto.extraerReclutar(
    '«Sí.» (Escribe  reclutar bruna  si la quieres en tu grupo.)'
  )
  console.info('[prueba] tpl →', t)
  console.info('[prueba] rng(aldamar) →', secuencia, '| determinista:', determinista)
  console.info('[prueba] extraerReclutar →', recluta)
}

const game = new Phaser.Game(config)
pruebaManual()
window.__ALDAMAR__ = { game, Texto, Rng, Datos, partida } // pruebas manuales desde consola

// El desbloqueo real lo hace Audio8 al primer pointerdown/keydown;
// aquí nos aseguramos también vía el bus de Phaser.
game.events.once(Phaser.Core.Events.READY, () => {
  audio8.ensure()
})
