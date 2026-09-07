// Resolución — vista lógica adaptativa a la orientación de la pantalla:
// vertical (móvil en mano) 270×480 u horizontal (móvil girado / escritorio)
// 480×270. El canvas se supersamplea ×RES (render interno a resolución
// nativa) y cada cámara multiplica su zoom base por RES.
//
// Al girar el dispositivo, `reajustarRes` cambia VISTA, redimensiona el
// juego y emite EVENTO_RELAYOUT en el bus del game: cada escena/ui se
// re-posiciona contra la nueva VISTA sin perder su estado.

import Phaser from 'phaser'

// Tamaños lógicos del juego: todas las escenas posicionan contra VISTA.
export const VISTA_HORIZONTAL = { width: 480, height: 270 }
export const VISTA_VERTICAL = { width: 270, height: 480 }

// Orientación de la pantalla con fallback horizontal para entornos sin
// DOM (SSR / tests de node).
function tamanoPantalla() {
  if (typeof window === 'undefined') return VISTA_HORIZONTAL
  return window.innerHeight > window.innerWidth
    ? VISTA_VERTICAL
    : VISTA_HORIZONTAL
}

export function esPantallaVertical() {
  return tamanoPantalla() === VISTA_VERTICAL
}

export let VISTA = tamanoPantalla()

export function esVistaVertical() {
  return VISTA.height > VISTA.width
}

// Multiplicador entero según cuántas veces cabe la vista en la pantalla
// física: en móviles retina cada píxel CSS son 2–3 píxeles reales, así que
// hay que multiplicar por devicePixelRatio o el canvas queda chico y el
// navegador lo amplía (borroso). Se redondea hacia arriba para que el
// render interno nunca quede por debajo de la resolución física: el
// navegador solo reduce (nítido), nunca amplía.
export function calcularRes(vista = VISTA) {
  if (typeof window === 'undefined') return 1
  const dpr = window.devicePixelRatio || 1
  const fit = Math.min(
    (window.innerWidth * dpr) / vista.width,
    (window.innerHeight * dpr) / vista.height
  )
  return Math.max(1, Math.min(10, Math.ceil(fit)))
}

export let RES = calcularRes()

// Registro global de textos para optimizar el re-escalado sin recorrer la
// jerarquía de escenas recursivamente.
export const textosRegistrados = new Set()

export function registrarTexto(texto) {
  textosRegistrados.add(texto)
  const destroyOriginal = texto.destroy
  texto.destroy = function (...args) {
    textosRegistrados.delete(texto)
    if (destroyOriginal) return destroyOriginal.apply(this, args)
  }
}

// Evento de re-layout: se emite en el bus del game cuando cambia la
// orientación. Las escenas se suscriben con `alRelayout`.
export const EVENTO_RELAYOUT = 'vista-relayout'

// Suscribe `fn` al relayout mientras la escena viva: se desuscribe sola en
// shutdown/destroy para no dejar listeners huérfanos al cambiar de escena.
export function alRelayout(escena, fn) {
  escena.game.events.on(EVENTO_RELAYOUT, fn)
  const off = () => escena.game.events.off(EVENTO_RELAYOUT, fn)
  escena.events.once('shutdown', off)
  escena.events.once('destroy', off)
}

// Zoom de cámara para la resolución actual. `zoomBase` es el framing que
// la escena quería a resolución 1 (WorldScene usa 2, el resto 1).
export function aplicarRes(escena, zoomBase = 1) {
  escena.zoomBase = zoomBase
  const cam = escena.cameras.main
  cam.setZoom(zoomBase * RES)
  // El zoom agranda alrededor del punto medio de la cámara, que por defecto
  // es el del canvas supersampleado: recentrar en el centro lógico para que
  // el contenido de la vista quede encuadrado.
  cam.centerOn(VISTA.width / 2, VISTA.height / 2)
}

// Reajusta resolución y orientación al cambiar el tamaño de ventana
// (resize, giro de dispositivo, entrar/salir de pantalla completa):
// tamaño del juego, zoom de las cámaras activas, resolución de los textos
// y, si la orientación cambió, aviso de relayout a las escenas.
export function reajustarRes(game) {
  const nuevaVista = tamanoPantalla()
  const cambiaOrientacion = nuevaVista !== VISTA
  // Medir contra la vista nueva: si se usa VISTA todavía sin actualizar,
  // al girar el dispositivo se cruzan vista vertical con pantalla
  // horizontal y el fit sale por debajo de 1.
  const nuevaRes = calcularRes(nuevaVista)
  if (!cambiaOrientacion && nuevaRes === RES) return false

  if (cambiaOrientacion) VISTA = nuevaVista
  RES = nuevaRes
  game.scale.setGameSize(VISTA.width * RES, VISTA.height * RES)
  // Todas las escenas (también dormidas: World/Ui durante un combate),
  // con guards para las no arrancadas aún.
  for (const escena of game.scene.getScenes(false)) {
    if (escena.cameras?.main) {
      const cam = escena.cameras.main
      cam.setZoom((escena.zoomBase ?? 1) * RES)
      cam.centerOn(VISTA.width / 2, VISTA.height / 2)
    }
  }

  for (const texto of textosRegistrados) {
    if (texto.scene && texto.active !== false) {
      texto.setResolution(RES)
    }
  }

  if (cambiaOrientacion) game.events.emit(EVENTO_RELAYOUT)
  return true
}
