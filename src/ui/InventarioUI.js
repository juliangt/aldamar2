// InventarioUI — panel táctil del inventario (Fase C): lista apilada de
// ítems, inspección (nombre + desc) y acciones según tipo: Usar consumible,
// Equipar arma/armadura (con quitar), el resto solo se inspecciona.

import PanelUI, { FUENTE } from './PanelUI.js'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'

const ALTO_FILA = 14
const TIPO_ETIQUETA = {
  consumible: 'usar',
  arma: 'equipar',
  armadura: 'equipar',
}

export class InventarioUI extends PanelUI {
  constructor(escena, { onToast, onCambio } = {}) {
    super(escena, { titulo: 'INVENTARIO' })
    this.onToast = onToast || (() => {})
    this.onCambio = onCambio || (() => {})
    this.xFilas = this.x + 10
    this.yFilas = this.y + 22
    this.altoFilas = this.alto - 34
  }

  abrir() {
    super.abrir()
    this.seleccion = null
    this.pintar()
  }

  pintar() {
    this.limpiar(this.filas)
    this.limpiar(this.detalle)
    if (this.botonAccion) {
      this.botonAccion.destruir()
      this.botonAccion = null
    }

    // Equipo actual arriba (arma/armadura con su bono y opción de quitar).
    let y = this.yFilas
    const equipoTxt = (ranura, etiqueta) => {
      const id = partida.equipo[ranura]
      const dato = id && Datos.item(partida.aventura, id)
      return `${etiqueta}: ${dato ? dato.nombre : '—'}${dato ? ` (+${dato.bonus})` : ''}`
    }
    this.texto(y, equipoTxt('arma', 'Arma'), '#9ad09a')
    y += ALTO_FILA
    this.texto(y, equipoTxt('armadura', 'Armadura'), '#9ad09a')
    y += ALTO_FILA + 4

    const items = partida.itemsApilados()
    if (!items.length)
      this.texto(y, 'Vacío. El camino proveerá.', '#8a8a8a')

    items.forEach(({ id, n }, i) => {
      const fy = y + i * ALTO_FILA
      if (fy > this.yFilas + this.altoFilas - ALTO_FILA) return
      const dato = Datos.item(partida.aventura, id) || { nombre: id, desc: '' }
      const etiqueta = `${dato.nombre}${n > 1 ? ` ×${n}` : ''}`
      const linea = this.escena.add
        .zone(this.xFilas + 100, fy + ALTO_FILA / 2, this.ancho - 40, ALTO_FILA)
        .setInteractive()
      const texto = this.texto(
        fy,
        `${this.seleccion === id ? '▸' : ' '} ${etiqueta}`,
        this.seleccion === id ? '#e0c04a' : '#e8e8e8'
      )
      linea.on('pointerdown', () => {
        this.seleccion = this.seleccion === id ? null : id
        this.pintar()
      })
      this.filas.add([linea, texto])
    })

    if (this.seleccion) this.pintarDetalle(this.seleccion)
  }

  texto(y, contenido, color = '#e8e8e8') {
    const t = this.escena.add.text(this.xFilas, y, contenido, {
      fontFamily: FUENTE,
      fontSize: '7px',
      color,
      wordWrap: { width: this.ancho - 24 },
      lineSpacing: 3,
    })
    this.filas.add(t)
    return t
  }

  pintarDetalle(id) {
    const dato = Datos.item(partida.aventura, id)
    if (!dato) return
    const yBase = this.y + this.alto - 62
    const linea = (texto, color) =>
      this.escena.add.text(this.xFilas, yBase, texto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color,
        wordWrap: { width: this.ancho - 100 },
        lineSpacing: 3,
      })
    // La desc completa puede ocupar varias líneas; se recorta visualmente
    // por el alto reservado del panel (los datos piloto caben).
    const descripcion = dato.desc + (dato.texto_uso ? `\n${dato.texto_uso}` : '')
    this.detalle.add([
      this.escena.add.rectangle(
        this.x + this.ancho / 2,
        this.y + this.alto - 46,
        this.ancho - 12,
        44,
        0x101010,
        0.85
      ).setStrokeStyle(1, 0x3a3a3a, 0.9),
      linea(descripcion, '#c8c8c8'),
    ])

    const accion = TIPO_ETIQUETA[dato.tipo]
    if (accion) {
      this.botonAccion = this.crearBoton(
        this.x + this.ancho - 56,
        this.y + this.alto - 36,
        accion.toUpperCase(),
        () => this.ejecutar(id, dato)
      )
    }
  }

  ejecutar(id, dato) {
    if (dato.tipo === 'consumible') {
      const res = partida.usarItem(id)
      if (!res) return
      if (res.texto) this.onToast(res.texto)
      else this.onToast(`(+${res.cura} PV)`)
    } else if (dato.tipo === 'arma' || dato.tipo === 'armadura') {
      partida.equipar(id)
      this.onToast(`Equipas: ${dato.nombre} (+${dato.bonus})`)
    }
    this.onCambio()
    this.seleccion = null
    this.pintar()
  }
}

export default InventarioUI
