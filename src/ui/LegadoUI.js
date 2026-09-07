// LegadoUI — panel del Legado de Aldamar: memoria persistente entre cantares
// (banderas juramento/grieta, héroes que culminaron y finales por campaña).
// Extraído de MenuScene; dibuja en el contenedor de la escena y avisa del
// cierre por callback. Los datos viven en core/Legacy.js.

import Datos from '../core/Datos.js'
import Legacy from '../core/Legacy.js'
import { VISTA, esVistaVertical } from '../core/resolucion.js'
import { FUENTE } from './tema.js'

export class LegadoUI {
  constructor(escena, { contenedor, onCerrar } = {}) {
    const add = escena.add
    const { width, height } = VISTA
    const vertical = esVistaVertical()
    // En vertical las líneas largas (banderas, héroes) necesitan wrap y un
    // poco más de aire entre secciones.
    const px = vertical ? 12 : 28
    const dy = vertical ? 26 : 0
    const legado = Legacy.cargar()

    const fondo = add.rectangle(width / 2, height / 2, width, height, 0x0a0a10, 0.98)

    const titLegado = add
      .text(width / 2, 20, '❖ EL LEGADO DE ALDAMAR', {
        fontFamily: FUENTE,
        fontSize: vertical ? '8px' : '10px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)

    const subtit = add
      .text(width / 2, 34, 'Memoria persistente transmitida entre cantares', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#888888',
        wordWrap: { width: width - 24 },
        align: 'center',
      })
      .setOrigin(0.5)

    // Banderas activas
    const juramentoTxt = `JURAMENTO DE LA ALIANZA : ${legado.juramento ? 'ACTIVO (ENCENDIDO)' : 'INACTIVO'}`
    const grietaTxt = `MARCA DE LA GRIETA      : ${legado.grieta ? 'ACTIVA (ENCENDIDA)' : 'INACTIVA'}`

    const txtJuramento = add.text(px, 54 + dy, juramentoTxt, {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: legado.juramento ? '#e0c04a' : '#666666',
      wordWrap: { width: width - px * 2 },
    })

    const txtGrieta = add.text(px, 68 + dy, grietaTxt, {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: legado.grieta ? '#d04a4a' : '#666666',
      wordWrap: { width: width - px * 2 },
    })

    // Héroes que culminaron
    const txtTitHeroes = add.text(px, 88 + dy, 'HÉROES QUE CRUZARON LA CENIZA:', {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: '#9ad09a',
    })

    let infoHeroes = ''
    if (legado.heroes.length === 0) {
      infoHeroes = 'Ningún héroe ha culminado un cantar todavía.'
    } else {
      infoHeroes = legado.heroes
        .slice(-4)
        .map((h) => `• ${h.nombre} (${h.aventura}) — ${h.final}`)
        .join('\n')
    }

    const txtHeroes = add.text(px, 102 + dy, infoHeroes, {
      fontFamily: FUENTE,
      fontSize: '6px',
      color: '#cccccc',
      lineSpacing: 4,
      wordWrap: { width: width - px * 2 },
    })

    // Finales registrados
    const txtTitFinales = add.text(px, 154 + dy * 2, 'FINALES ALCANZADOS POR CAMPAÑA:', {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: '#8ab4f8',
    })

    const clavesAvs = Object.keys(Datos.aventuras)
    const lineasFinales = clavesAvs.map((k) => {
      const nombreAv = Datos.aventura(k).titulo
      const fin = legado.finales[k]
      return `• ${nombreAv}: ${fin ? fin.toUpperCase() : 'Pendiente'}`
    })

    const txtFinales = add.text(px, 168 + dy * 2, lineasFinales.join('\n'), {
      fontFamily: FUENTE,
      fontSize: '6px',
      color: '#aaaaaa',
      lineSpacing: 3,
      wordWrap: { width: width - px * 2 },
    })

    // Botón volver
    const btnCerrar = add
      .text(width / 2, height - 20, '◄ VOLVER AL MENÚ', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onCerrar?.())

    contenedor.add([
      fondo,
      titLegado,
      subtit,
      txtJuramento,
      txtGrieta,
      txtTitHeroes,
      txtHeroes,
      txtTitFinales,
      txtFinales,
      btnCerrar,
    ])
  }
}

export default LegadoUI
