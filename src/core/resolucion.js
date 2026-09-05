// Resolución — supersampling del canvas manteniendo 480×270 lógicos.
// El canvas se renderiza a 480×RES × 270×RES y cada cámara multiplica su
// zoom base por RES: el framing es el mismo, pero el render interno es a
// resolución nativa de pantalla (texto nítido, estirado CSS ~1:1) en vez
// de estirar un canvas de 480×270 con nearest-neighbour.

import Phaser from 'phaser'

// Tamaño lógico del juego: todas las escenas posicionan contra esto.
export const VISTA = { width: 480, height: 270 }

// Multiplicador entero según cuántas veces cabe la vista en la pantalla.
export function calcularRes() {
  const fit = Math.min(window.innerWidth / VISTA.width, window.innerHeight / VISTA.height)
  return Math.max(1, Math.min(4, Math.round(fit)))
}

export let RES = calcularRes()

// Zoom de cámara para la resolución actual. `zoomBase` es el framing que
// la escena quería a resolución 1 (WorldScene usa 2, el resto 1).
export function aplicarRes(escena, zoomBase = 1) {
  escena.zoomBase = zoomBase
  const cam = escena.cameras.main
  cam.setZoom(zoomBase * RES)
  // El zoom agranda alrededor del punto medio de la cámara, que por defecto
  // es el del canvas supersampleado: recentrar en el centro lógico para que
  // el contenido de 480×270 quede encuadrado.
  cam.centerOn(VISTA.width / 2, VISTA.height / 2)
}

// Reajusta la resolución al cambiar el tamaño de ventana (p. ej. al entrar
// en pantalla completa): tamaño del juego, zoom de las cámaras activas y
// resolución de los textos ya creados.
export function reajustarRes(game) {
  const nueva = calcularRes()
  if (nueva === RES) return false
  RES = nueva
  game.scale.setGameSize(VISTA.width * RES, VISTA.height * RES)
  for (const escena of game.scene.getScenes(true)) {
    if (escena.cameras?.main) {
      const cam = escena.cameras.main
      cam.setZoom((escena.zoomBase ?? 1) * RES)
      cam.centerOn(VISTA.width / 2, VISTA.height / 2)
    }
    ajustarTextos(escena.children.list)
  }
  return true
}

function ajustarTextos(objetos) {
  for (const obj of objetos) {
    if (obj instanceof Phaser.GameObjects.Text) obj.setResolution(RES)
    if (obj instanceof Phaser.GameObjects.Container) ajustarTextos(obj.list)
  }
}
