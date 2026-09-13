// aventuraGrafo.js — utilidades de navegación global y cálculo de rutas entre pantallas.
// Permite conocer la distancia (número de pantallas) hasta el final de la aventura
// y genera la topología de la aventura para el modo de mapa global.

import Datos from './Datos.js'

function obtenerAventuraSegura(id) {
  if (!id) return null
  try {
    return Datos.aventura(id)
  } catch {
    return null
  }
}

export function obtenerLugarFinal(aventuraId) {
  const av = obtenerAventuraSegura(aventuraId)
  if (!av || !av.lugares) return null
  const keys = Object.keys(av.lugares)
  return keys[keys.length - 1] || null
}

export function caminoAlFinal(aventuraId, lugarActual) {
  const av = obtenerAventuraSegura(aventuraId)
  if (!av || !av.lugares || !lugarActual) return []
  const finalId = obtenerLugarFinal(aventuraId)
  if (!finalId) return []
  if (lugarActual === finalId) return [finalId]

  // Búsqueda en anchura (BFS) para la ruta más corta
  const cola = [[lugarActual, [lugarActual]]]
  const visitados = new Set([lugarActual])

  while (cola.length > 0) {
    const [actual, camino] = cola.shift()
    const dato = av.lugares[actual]
    if (!dato) continue
    const salidas = [...new Set(Object.values(dato.salidas || {}))]
    for (const dest of salidas) {
      if (dest === finalId) {
        return [...camino, finalId]
      }
      if (!visitados.has(dest)) {
        visitados.add(dest)
        cola.push([dest, [...camino, dest]])
      }
    }
  }

  return []
}

export function distanciaAlFinal(aventuraId, lugarActual) {
  const camino = caminoAlFinal(aventuraId, lugarActual)
  if (!camino || camino.length === 0) {
    const finalId = obtenerLugarFinal(aventuraId)
    return lugarActual === finalId ? 0 : null
  }
  return camino.length - 1
}

const DIRS_CARDINALES = {
  norte: [0, -1],
  sur: [0, 1],
  este: [1, 0],
  oeste: [-1, 0],
}

export function calcularGrafoAventura(aventuraId, lugarActual = null, vistos = {}) {
  const av = obtenerAventuraSegura(aventuraId)
  if (!av || !av.lugares) return null

  const keys = Object.keys(av.lugares)
  const finalId = keys[keys.length - 1]
  const inicioId = av.lugar_inicial || keys[0]
  const caminoOptimo = new Set(lugarActual ? caminoAlFinal(aventuraId, lugarActual) : [])

  // 1. Asignar coordenadas cartesianas 2D siguiendo las salidas cardinales reales
  const coords = { [inicioId]: { x: 0, y: 0 } }
  const colaCoords = [inicioId]

  while (colaCoords.length > 0) {
    const act = colaCoords.shift()
    const c = coords[act]
    const d = av.lugares[act]
    if (!d) continue
    const s = d.salidas || {}
    for (const [dir, dest] of Object.entries(s)) {
      if (DIRS_CARDINALES[dir] && av.lugares[dest]) {
        if (!coords[dest]) {
          const [dx, dy] = DIRS_CARDINALES[dir]
          coords[dest] = { x: c.x + dx, y: c.y + dy }
          colaCoords.push(dest)
        }
      }
    }
  }

  // Fallback si algún nodo no tuvo dirección cardinal explícita
  const faltantes = keys.filter((k) => !coords[k])
  if (faltantes.length > 0) {
    const colaGeneral = [inicioId]
    const visitados = new Set([inicioId])
    while (colaGeneral.length > 0) {
      const act = colaGeneral.shift()
      const c = coords[act] || { x: 0, y: 0 }
      const d = av.lugares[act]
      if (!d) continue
      const dests = [...new Set(Object.values(d.salidas || {}))]
      let step = 1
      for (const dest of dests) {
        if (!visitados.has(dest)) {
          visitados.add(dest)
          if (!coords[dest]) {
            coords[dest] = { x: c.x + step++, y: c.y }
          }
          colaGeneral.push(dest)
        }
      }
    }
    let fx = 0
    for (const k of keys) {
      if (!coords[k]) coords[k] = { x: fx++, y: 0 }
    }
  }

  // 2. Bounding box y normalización centrada (-0.5 .. 0.5)
  const xs = keys.map((k) => coords[k].x)
  const ys = keys.map((k) => coords[k].y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const spanX = Math.max(1, maxX - minX)
  const spanY = Math.max(1, maxY - minY)

  // 3. Crear lista de nodos con posiciones geográficas normalizadas
  const nodos = {}
  const listaNodos = []

  for (const id of keys) {
    const dato = av.lugares[id]
    const pt = coords[id]
    const normX = spanX > 0 ? (pt.x - (minX + maxX) / 2) / spanX : 0
    const normY = spanY > 0 ? (pt.y - (minY + maxY) / 2) / spanY : 0

    const nodo = {
      id,
      nombre: dato.nombre || id,
      nombreCorto: dato.nombre_corto || id,
      coordX: pt.x,
      coordY: pt.y,
      normX,
      normY,
      esActual: id === lugarActual,
      esFinal: id === finalId,
      visitado: !!vistos[id] || id === lugarActual,
      enCaminoFinal: caminoOptimo.has(id),
    }

    nodos[id] = nodo
    listaNodos.push(nodo)
  }

  // 4. Crear conexiones únicas
  const conexiones = []
  const conexionesVistas = new Set()

  for (const id of keys) {
    const d = av.lugares[id]
    if (!d) continue
    const dests = [...new Set(Object.values(d.salidas || {}))]
    for (const dest of dests) {
      if (!nodos[dest]) continue
      const parId = [id, dest].sort().join('---')
      if (!conexionesVistas.has(parId)) {
        conexionesVistas.add(parId)
        conexiones.push({
          desde: nodos[id],
          hacia: nodos[dest],
          enCaminoFinal: caminoOptimo.has(id) && caminoOptimo.has(dest),
        })
      }
    }
  }

  return {
    aventuraId,
    titulo: av.titulo,
    inicioId,
    finalId,
    actualId: lugarActual,
    distancia: lugarActual ? distanciaAlFinal(aventuraId, lugarActual) : null,
    totalLugares: keys.length,
    bounds: { minX, maxX, minY, maxY, spanX, spanY },
    nodos: listaNodos,
    nodosPorId: nodos,
    conexiones,
  }
}
