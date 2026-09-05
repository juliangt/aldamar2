// Balance — multiplicadores por dificultad con redondeo entero (mín. 1).
// «camino» es la identidad: el balance con el que se escribió la aventura.

import Datos from './Datos.js'

function mult(valor, clave, dificultadId) {
  const dif = Datos.dificultad(dificultadId)
  const m = dif && dif[clave] !== undefined ? dif[clave] : 1
  return Math.max(1, Math.round(valor * m))
}

export const Balance = {
  // vida / ataque iniciales del héroe, monedas…
  statJugador(valor, clave, dificultadId) {
    return mult(valor, clave, dificultadId)
  },

  statEnemigo(valor, clave, dificultadId) {
    return mult(valor, clave, dificultadId)
  },

  corrupcion(puntos, dificultadId) {
    return mult(puntos, 'corrupcion', dificultadId)
  },

  curacion(puntos, dificultadId) {
    return mult(puntos, 'curacion', dificultadId)
  },

  xp(puntos, dificultadId) {
    return mult(puntos, 'experiencia', dificultadId)
  },
}

export default Balance
