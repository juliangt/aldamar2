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

export function calcularGrafoAventura(aventuraId, lugarActual = null, vistos = {}) {
  const av = obtenerAventuraSegura(aventuraId)
  if (!av || !av.lugares) return null

  const keys = Object.keys(av.lugares)
  const finalId = keys[keys.length - 1]
  const inicioId = av.lugar_inicial || keys[0]
  const caminoOptimo = new Set(lugarActual ? caminoAlFinal(aventuraId, lugarActual) : [])

  // 1. Asignar nivel topológico mediante BFS desde el inicio
  const niveles = { [inicioId]: 0 }
  const cola = [inicioId]
  while (cola.length > 0) {
    const act = cola.shift()
    const d = av.lugares[act]
    if (!d) continue
    const dests = [...new Set(Object.values(d.salidas || {}))]
    for (const dest of dests) {
      if (niveles[dest] === undefined) {
        niveles[dest] = niveles[act] + 1
        cola.push(dest)
      }
    }
  }

  // Si algún lugar quedó desconectado del inicio, darle nivel basado en su índice
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    if (niveles[k] === undefined) niveles[k] = i
  }

  const maxNivel = Math.max(1, ...Object.values(niveles))

  // 2. Agrupar por nivel para calcular posición vertical
  const porNivel = {}
  for (const id of keys) {
    const n = niveles[id]
    if (!porNivel[n]) porNivel[n] = []
    porNivel[n].push(id)
  }

  // 3. Crear nodos con coordenadas relativas normalizadas (-0.5 .. 0.5)
  const nodos = {}
  const listaNodos = []

  for (const [nStr, ids] of Object.entries(porNivel)) {
    const n = Number(nStr)
    const normX = n / maxNivel - 0.5 // Rango: -0.5 a +0.5
    const totalEnNivel = ids.length

    for (let idx = 0; idx < totalEnNivel; idx++) {
      const id = ids[idx]
      const dato = av.lugares[id]
      // Centrar verticalmente en nivel
      const normY = totalEnNivel === 1 ? 0 : (idx / (totalEnNivel - 1) - 0.5) * 0.7

      const nodo = {
        id,
        nombre: dato.nombre || id,
        nombreCorto: dato.nombre_corto || id,
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
    nodos: listaNodos,
    nodosPorId: nodos,
    conexiones,
  }
}
