// opciones.js — gestión y persistencia de preferencias de usuario.
// Serializable a localStorage con valores por defecto accesibles.

export const CLAVE_MINIMAPA = 'aldamar:opciones:minimapa'
export const CLAVE_MODO_MINIMAPA = 'aldamar:opciones:modo_minimapa'

export function obtenerMinimapaHabilitado() {
  if (typeof localStorage === 'undefined') return true
  const valor = localStorage.getItem(CLAVE_MINIMAPA)
  return valor === null ? true : valor === '1'
}

export function guardarMinimapaHabilitado(habilitado) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLAVE_MINIMAPA, habilitado ? '1' : '0')
  }
}

export function obtenerModoMinimapa() {
  if (typeof localStorage === 'undefined') return 'local'
  const valor = localStorage.getItem(CLAVE_MODO_MINIMAPA)
  return valor === 'aventura' ? 'aventura' : 'local'
}

export function guardarModoMinimapa(modo) {
  const normalizado = modo === 'aventura' ? 'aventura' : 'local'
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CLAVE_MODO_MINIMAPA, normalizado)
  }
  return normalizado
}
