// Texto — interpolación de plantillas, paginado para DialogBox y detección
// del comando de reclutamiento heredado del juego de texto original.

// Sustituye {trato} {nombre} {efectivo} {nombres} {quien}… por los valores
// de ctx. Las marcas sin valor en ctx se dejan tal cual.
export function tpl(texto, ctx = {}) {
  if (!texto) return ''
  return texto.replace(/\{(\w+)\}/g, (marca, clave) =>
    clave in ctx ? String(ctx[clave]) : marca
  )
}

// Parte un texto en páginas que caben en `ancho`×`alto` caracteres.
// Respeta saltos de línea originales y corta por palabras.
export function paginar(texto, ancho, alto) {
  const parrafos = String(texto).split('\n')
  const lineas = []
  for (const parrafo of parrafos) {
    if (parrafo.trim() === '') {
      lineas.push('')
      continue
    }
    let linea = ''
    for (const palabra of parrafo.split(/\s+/)) {
      const candidata = linea ? `${linea} ${palabra}` : palabra
      if (candidata.length > ancho && linea) {
        lineas.push(linea)
        linea = palabra
      } else {
        linea = candidata
      }
    }
    lineas.push(linea)
  }

  const paginas = []
  let actual = []
  for (const linea of lineas) {
    actual.push(linea)
    if (actual.length >= alto) {
      paginas.push(actual.join('\n'))
      actual = []
    }
  }
  if (actual.length) paginas.push(actual.join('\n'))
  return paginas
}

// Detecta «(Escribe  reclutar X  si …)» en el texto del diálogo y devuelve
// el texto limpio más el id del compañero reclutable, o null.
export function extraerReclutar(texto) {
  const m = String(texto).match(/\(\s*Escribe\s+reclutar\s+(\w+)\s+[^)]*\)/)
  if (!m) return { limpio: texto, reclutaId: null }
  return {
    limpio: String(texto).replace(m[0], '').trim(),
    reclutaId: m[1],
  }
}

// Detecta «(Escribe  comprar <cosa>  y …)» o la frase suelta «Escribe
// comprar …» del tendero y devuelve el texto limpio más un flag: la tienda
// se abre tras el diálogo.
export function extraerComprar(texto) {
  const t = String(texto)
  if (!/Escribe\s+comprar/.test(t)) return { limpio: t, esTienda: false }
  const limpio = t
    .replace(/\(\s*Escribe\s+comprar[^)]*\)/, '') // forma entre paréntesis
    .replace(/Escribe\s+comprar[^.]*\.?/, '') // frase suelta hasta el punto
    .trim()
  return { limpio, esTienda: true }
}

export const Texto = { tpl, paginar, extraerReclutar, extraerComprar }
export default Texto
