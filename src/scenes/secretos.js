// Secretos — lógica compartida del secreto por aventura (Fase G) entre
// WorldScene (aparición en el mapa) y BattleScene (botón en combate):
// resolución del secreto activo, guard de la campanilla, lugares permitidos
// y rotación de textos. El GameState entra como parámetro para poder
// testearla directa, como en core/Carteles.js.

import Datos from '../core/Datos.js'

export const LUGARES_POR_SECRETO = {
  cuervo: ['vegaverde', 'molino', 'puente', 'bosque', 'cienagas', 'yerma'],
  abejas: ['colmenar', 'ejido', 'lavadero'],
  gaviota: ['vado', 'calzada', 'faro', 'esteros', 'cauce', 'salinas'],
  campanilla: ['refugio', 'aguja_pies', 'aguja_cima'],
}

// Devuelve { tipo, sec } del primer secreto de la aventura, o null.
export function secretoActivo(aventuraId) {
  const secretos = Datos.aventura(aventuraId)?.secretos
  if (!secretos) return null
  const [tipo, sec] = Object.entries(secretos)[0] || []
  return sec ? { tipo, sec } : null
}

// La campanilla solo aparece si ya se consiguió (flag o inventario).
export function secretoDisponible(gs, tipo) {
  if (
    tipo === 'campanilla' &&
    !gs.tieneFlag('campanilla') &&
    !gs.inventario.includes('campanilla')
  ) {
    return false
  }
  return true
}

// Secreto visible en un lugar del mapa: hay secreto activo, el lugar está
// en su lista de permitidos y el guard de campanilla se cumple.
export function secretoEnLugar(gs, aventuraId, lugarId) {
  const activo = secretoActivo(aventuraId)
  if (!activo) return null
  const permitidos = LUGARES_POR_SECRETO[activo.tipo] || []
  if (!permitidos.includes(lugarId)) return null
  if (!secretoDisponible(gs, activo.tipo)) return null
  return activo
}

// Texto del secreto: la variante por semilla gana si existe; si no, rota la
// lista `textos` con contador persistente en `npcVistos`.
export function resolverTextoSecreto(gs, tipo, sec) {
  const semKey = String(gs.semilla)
  if (sec.semillas?.[semKey]) {
    return sec.semillas[semKey]
  }
  gs.npcVistos = gs.npcVistos || {}
  const keyVisto = `secreto:${tipo}`
  const idx = (gs.npcVistos[keyVisto] || 0) % sec.textos.length
  const texto = sec.textos[idx]
  gs.npcVistos[keyVisto] = idx + 1
  gs.guardar()
  return texto
}
