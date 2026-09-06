// Carteles — lógica pura de los carteles de destino del mundo: nombre corto
// de lugar para la tabla, anclaje del cartel de una salida simple y posición
// del poste central en bifurcaciones. Sin Phaser para testearla directa.

const ARTICULOS = /^(el|la|los|las)\s+/i
const MAX_CORTO = 9 // caracteres que caben en una tabla a 6 px
const MARGEN_CARTEL = 24 // 1,5 tiles hacia dentro desde el borde de salida
const BORDE = 16 // margen mínimo a los límites del mapa

const snap = (v) => Math.round(v / 8) * 8
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

// Nombre de cartel: `nombre_corto` del lugar o derivado del completo (sin
// artículo inicial, truncado con elipsis si aún no cabe en una tabla).
export function nombreCorto(lugar) {
  if (!lugar) return ''
  if (lugar.nombre_corto) return lugar.nombre_corto
  const base = (lugar.nombre || '').replace(ARTICULOS, '').trim()
  return base.length > MAX_CORTO ? base.slice(0, MAX_CORTO - 1) + '…' : base
}

// Ancla del cartel de una salida simple: hacia el interior del mapa desde el
// borde que ocupa la salida, centrado en su hueco y alineado a la rejilla
// de 8 px. `mapaPx` es { width, height } en píxeles del mundo.
export function posicionCartel(salida, mapaPx) {
  const cx = salida.x + salida.width / 2
  const cy = salida.y + salida.height / 2
  let x = cx
  let y = cy
  if (salida.dir === 'O') x = salida.x + MARGEN_CARTEL
  else if (salida.dir === 'E') x = salida.x + salida.width - MARGEN_CARTEL
  else if (salida.dir === 'N') y = salida.y + MARGEN_CARTEL
  else if (salida.dir === 'S') y = salida.y + salida.height - MARGEN_CARTEL
  return {
    x: snap(clamp(x, BORDE, mapaPx.width - BORDE)),
    y: snap(clamp(y, BORDE, mapaPx.height - BORDE)),
  }
}

// Poste central de bifurcación: el tile libre (según `esLibre(x, y)` en px
// del mundo) más cercano al centro, buscado en anillos concéntricos; si nada
// libera, el propio centro.
export function posicionPoste(mapaPx, esLibre, tile = 16) {
  const centro = { x: snap(mapaPx.width / 2), y: snap(mapaPx.height / 2) }
  const maxR = Math.ceil(Math.max(mapaPx.width, mapaPx.height) / tile / 2)
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue // solo el anillo
        const x = centro.x + dx * tile
        const y = centro.y + dy * tile
        if (x < BORDE || y < BORDE || x > mapaPx.width - BORDE || y > mapaPx.height - BORDE)
          continue
        if (esLibre(x, y)) return { x, y }
      }
    }
  }
  return centro
}

// Orden de las tablas del poste central, de arriba abajo: N primero, S al
// final; O antes que E entre las laterales.
const ORDEN_TABLAS = { N: 0, O: 1, E: 2, S: 3 }

export function ordenarTablas(salidas) {
  return [...salidas].sort(
    (a, b) => (ORDEN_TABLAS[a.dir] ?? 9) - (ORDEN_TABLAS[b.dir] ?? 9)
  )
}

// Hacia dónde apunta cada tabla: O/E llevan la punta lateral del listón;
// N/S usan un pequeño triángulo sobre/bajo la tabla.
export function flechaDe(dir) {
  return { N: 'arriba', S: 'abajo', E: 'derecha', O: 'izquierda' }[dir] || 'plana'
}
