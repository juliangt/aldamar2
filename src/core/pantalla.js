// Pantalla — helpers de pantalla completa nativa (Fullscreen API) y
// detección de dispositivo. En escritorio el juego pide pantalla completa
// al primer gesto (los navegadores exigen interacción del usuario); en
// móviles se mantiene el marco del navegador y el juego se adapta a la
// orientación nativa (vertical u horizontal) sin bloquearla.

export function esDispositivoTactil() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  )
}

export function estaPantallaCompleta() {
  return typeof document !== 'undefined' && !!document.fullscreenElement
}

// Alterna pantalla completa; en iOS Safari (sin Fullscreen API en el
// documento) falla en silencio y el juego simplemente sigue en la ventana.
export function alternarPantallaCompleta() {
  if (typeof document === 'undefined') return Promise.resolve(false)
  try {
    if (estaPantallaCompleta()) {
      return document.exitFullscreen().then(() => false).catch(() => false)
    }
    return document.documentElement
      .requestFullscreen()
      .then(() => true)
      .catch(() => false)
  } catch {
    return Promise.resolve(false)
  }
}

// Escritorio: pedir pantalla completa en el primer gesto del usuario
// («si se detecta computadora con pantalla normal, pantalla completa»).
// Un solo intento; luego queda a discreción del jugador (tecla F / pausa).
export function pedirPantallaCompletaEnPrimerGesto() {
  if (typeof window === 'undefined' || esDispositivoTactil()) return
  window.addEventListener(
    'pointerdown',
    () => {
      if (!estaPantallaCompleta()) alternarPantallaCompleta()
    },
    { once: true }
  )
}
