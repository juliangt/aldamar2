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
import { RES, reajustarRes, registrarTexto } from './core/resolucion.js'
import { alternarPantallaCompleta, pedirPantallaCompletaEnPrimerGesto } from './core/pantalla.js'

// Textos nítidos con supersampling: rasterizar a la resolución real del
// canvas (resolution) en vez de dejar que el zoom de cámara escale una
// textura de fuente minúscula.
//
// También registramos todos los textos globalmente para poder actualizar
// su resolución de forma plana en `reajustarRes` sin recorrer todo el árbol
// de escenas.
for (const proto of [
  Phaser.GameObjects.GameObjectFactory.prototype,
  Phaser.GameObjects.GameObjectCreator.prototype,
]) {
  const textOriginal = proto.text
  if (!textOriginal) continue
  proto.text = function (x, y, contenido, estilo) {
    const texto = textOriginal.call(this, x, y, contenido, {
      resolution: RES,
      ...estilo,
    })
    registrarTexto(texto)
    return texto
  }
}

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

// Entrar/salir de pantalla completa, girar el dispositivo o redimensionar
// la ventana: recalcular orientación y supersampling (tamaño de canvas,
// zoom de cámaras, resolución de textos) y re-layout de las escenas.
window.addEventListener('resize', () => reajustarRes(game))
window.addEventListener('orientationchange', () => reajustarRes(game))

// Escritorio: pantalla completa al primer gesto (política de navegadores);
// tecla F para alternarla en cualquier momento.
pedirPantallaCompletaEnPrimerGesto()
window.addEventListener('keydown', (e) => {
  if (e.key === 'f' || e.key === 'F') alternarPantallaCompleta()
})

// Ciclo de vida móvil (Fase H): pausa al pasar a segundo plano (visibilitychange),
// suspender AudioContext para evitar audio fantasma, y reanudar al volver.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const worldScene = game.scene.getScene('World')
    if (worldScene && game.scene.isActive('World') && !worldScene.pausado) {
      worldScene.alternarPausa()
    }
    if (audio8.ctx && audio8.ctx.state === 'running') {
      audio8.ctx.suspend()
    }
  } else {
    if (audio8.ctx && audio8.ctx.state === 'suspended') {
      audio8.ctx.resume()
    }
  }
})
