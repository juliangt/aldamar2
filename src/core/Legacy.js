// Legacy — persistencia global entre aventuras (§8 de la spec maestra y Fase F).
// Guarda aldamar:legado → { juramento, grieta, heroes[], finales{aventura: nombreFinal} }

import Datos from './Datos.js'

const CLAVE_LEGADO = 'aldamar:legado'

export class Legacy {
  constructor(datos = {}) {
    this.juramento = Boolean(datos.juramento)
    this.grieta = Boolean(datos.grieta)
    this.heroes = Array.isArray(datos.heroes) ? datos.heroes.slice() : []
    this.finales = datos.finales ? { ...datos.finales } : {}
  }

  // Carga el estado guardado en localStorage o devuelve un estado inicial vacío.
  static cargar() {
    if (typeof localStorage === 'undefined') return new Legacy()
    try {
      const crudo = localStorage.getItem(CLAVE_LEGADO)
      if (!crudo) return new Legacy()
      const parseado = JSON.parse(crudo)
      return new Legacy(parseado)
    } catch {
      return new Legacy()
    }
  }

  // Guarda el estado actual en localStorage.
  guardar() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        CLAVE_LEGADO,
        JSON.stringify({
          juramento: this.juramento,
          grieta: this.grieta,
          heroes: this.heroes,
          finales: this.finales,
        })
      )
    }
    return this
  }

  // Limpia el almacenamiento de legado (útil para pruebas).
  static limpiar() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLAVE_LEGADO)
    }
  }

  // Exporta el legado tras completar una aventura con éxito (no muerte/caída).
  // Mapea las banderas según av.legado.exporta, añade al héroe y anota el final.
  static exportar(gs, nombreFinal) {
    const legado = Legacy.cargar()
    const av = Datos.aventura(gs.aventura)
    const defLegado = av.legado || {}

    if (defLegado.exporta) {
      for (const [banderaLegado, flagJuego] of Object.entries(defLegado.exporta)) {
        if (gs.flags && gs.flags[flagJuego]) {
          legado[banderaLegado] = true
        }
      }
    }

    if (defLegado.heroe && gs.heroe) {
      legado.heroes.push({
        heroe: gs.heroe,
        nombre: gs.nombre || gs.heroe,
        aventura: gs.aventura,
        final: nombreFinal,
      })
    }

    if (nombreFinal && gs.aventura) {
      legado.finales[gs.aventura] = nombreFinal
    }

    legado.guardar()
    return legado
  }

  // Importa el legado en una nueva partida si la aventura tiene `legado.importa`.
  // Activa en gs.flags las banderas que el legado tenga en true.
  static importar(gs) {
    const av = Datos.aventura(gs.aventura)
    const defLegado = av.legado || {}
    if (!defLegado.importa || !Array.isArray(defLegado.importa)) return gs

    const legado = Legacy.cargar()
    gs.flags = gs.flags || {}

    for (const bandera of defLegado.importa) {
      if (legado[bandera]) {
        gs.flags[bandera] = true
      }
    }
    return gs
  }

  // Comprueba si alguna de las banderas requeridas por `importa` está activa.
  tieneBanderasImportadas(aventuraId) {
    const av = Datos.aventura(aventuraId)
    const importa = av.legado?.importa
    if (!importa || !Array.isArray(importa)) return false
    return importa.some((bandera) => Boolean(this[bandera]))
  }
}

export default Legacy
