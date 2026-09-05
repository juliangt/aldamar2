// TiendaUI — panel de compra (Fase C): lista `tiendas[lugar]` de la aventura
// activa con precio efectivo (Lengua de mercado resta 1, mín. 0). Solo
// comprar; no se vende. Se abre tras el diálogo del tendero.

import PanelUI, { FUENTE } from './PanelUI.js'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import { audio8 } from '../core/Audio8.js'

const ALTO_FILA = 15

export class TiendaUI extends PanelUI {
  constructor(escena, { onToast, onCambio } = {}) {
    super(escena, { titulo: 'TIENDA' })
    this.onToast = onToast || (() => {})
    this.onCambio = onCambio || (() => {})
  }

  abrir(lugarId) {
    this.lugarId = lugarId
    const lugar = Datos.lugar(partida.aventura, lugarId)
    this.titulo.setText(lugar?.nombre?.toUpperCase() || 'TIENDA')
    const av = Datos.aventura(partida.aventura)
    this.catalogo = av.tiendas[lugarId] || []
    this.seleccion = null
    super.abrir()
    this.pintar()
  }

  cerrar() {
    super.cerrar()
    this.titulo.setText('TIENDA')
  }

  pintar() {
    this.limpiar(this.filas)
    this.limpiar(this.detalle)
    if (this.botonComprar) {
      this.botonComprar.destruir()
      this.botonComprar = null
    }

    let y = this.y + 22
    const linea = (texto, color, x = this.x + 10) =>
      this.escena.add.text(x, y, texto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color,
        wordWrap: { width: this.ancho - 100 },
        lineSpacing: 3,
      })

    this.filas.add(linea(`Monedas: ${partida.monedas}`, '#e0c04a'))
    y += ALTO_FILA + 4

    this.catalogo.forEach((id) => {
      const dato = Datos.item(partida.aventura, id)
      if (!dato) return
      const precio = partida.precioEfectivo(id)
      const sel = this.seleccion === id
      const zona = this.escena.add
        .zone(this.x + this.ancho / 2, y + ALTO_FILA / 2, this.ancho - 24, ALTO_FILA)
        .setInteractive()
      zona.on('pointerdown', () => {
        audio8.sfx('confirmar')
        this.seleccion = sel ? null : id
        this.pintar()
      })
      this.filas.add([
        zona,
        linea(`${sel ? '▸' : ' '} ${dato.nombre}`, sel ? '#e0c04a' : '#e8e8e8'),
        this.escena.add.text(
          this.x + this.ancho - 44,
          y,
          `${precio}`,
          {
            fontFamily: FUENTE,
            fontSize: '7px',
            color: partida.monedas >= precio ? '#e0c04a' : '#a05050',
          }
        ),
      ])
      y += ALTO_FILA
    })

    if (this.seleccion) this.pintarDetalle(this.seleccion)
  }

  pintarDetalle(id) {
    const dato = Datos.item(partida.aventura, id)
    const precio = partida.precioEfectivo(id)
    const yBase = this.y + this.alto - 58
    this.detalle.add([
      this.escena.add.rectangle(
        this.x + this.ancho / 2,
        this.y + this.alto - 46,
        this.ancho - 12,
        44,
        0x101010,
        0.85
      ).setStrokeStyle(1, 0x3a3a3a, 0.9),
      this.escena.add.text(this.x + 10, yBase, dato.desc, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#c8c8c8',
        wordWrap: { width: this.ancho - 100 },
        lineSpacing: 3,
      }),
    ])
    this.botonComprar = this.crearBoton(
      this.x + this.ancho - 58,
      this.y + this.alto - 36,
      'COMPRAR',
      () => this.comprar(id)
    )
    this.botonComprar.setHabilitado(partida.monedas >= precio)
  }

  comprar(id) {
    const dato = Datos.item(partida.aventura, id)
    if (!partida.comprar(id)) {
      this.onToast('No te alcanza para eso.')
      return
    }
    audio8.sfx('moneda')
    this.onToast(`(Compras: ${dato.nombre}. Quedan ${partida.monedas} monedas.)`)
    this.onCambio()
    this.pintar()
  }
}

export default TiendaUI
