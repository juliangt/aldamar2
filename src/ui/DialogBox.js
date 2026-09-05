// DialogBox — caja de diálogo modal de la interfaz: banda inferior con borde
// 1-bit, typewriter ~30 car./s, paginación automática (Texto.paginar) y avance
// con tap (1º completa la página, 2º pasa). Basada en Promise para encadenar
// «evento → diálogo → decisión» sin callbacks anidados (Fases C/D/E).

import Phaser from 'phaser'
import Texto from '../core/Texto.js'
import { VISTA } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'
const CAR_POR_SG = 30

export class DialogBox {
  constructor(escena) {
    this.escena = escena
    const { width, height } = VISTA
    this.anchoCaja = width - 12
    this.altoCaja = 84
    this.x = 6
    this.y = height - this.altoCaja - 6

    // Capacidad real en caracteres de la fuente pixel (medida, no supuesta).
    const prueba = escena.add.text(0, 0, 'MM', { fontFamily: FUENTE, fontSize: '8px' }).setVisible(false)
    this.anchoChar = prueba.width / 2
    this.lineaChar = prueba.height + 4
    prueba.destroy()
    this.carPorLinea = Math.floor((this.anchoCaja - 16) / this.anchoChar)
    this.lineasPorPagina = Math.floor((this.altoCaja - 16) / this.lineaChar)

    this.contenedor = escena.add.container(0, 0).setDepth(3500).setVisible(false)

    // Zona a pantalla completa: el tap no atraviesa al mundo (bloqueo modal).
    this.zona = escena.add.zone(width / 2, height / 2, width, height).setInteractive()
    this.zona.on('pointerdown', () => this.avanzar())

    this.fondo = escena.add
      .rectangle(this.x + this.anchoCaja / 2, this.y + this.altoCaja / 2, this.anchoCaja, this.altoCaja, 0x000000, 0.78)
      .setStrokeStyle(1, 0xe8e8e8, 0.9)
    this.texto = escena.add.text(this.x + 8, this.y + 8, '', {
      fontFamily: FUENTE,
      fontSize: '8px',
      color: '#e8e8e8',
      lineSpacing: 4,
    })
    this.indicador = escena.add
      .text(this.x + this.anchoCaja - 12, this.y + this.altoCaja - 12, '▸', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e8e8e8',
      })
      .setOrigin(1, 0.5)
      .setVisible(false)

    this.contenedor.add([this.zona, this.fondo, this.texto, this.indicador])
    this.paginas = []
    this.pagina = 0
    this.chars = 0
    this.resolver = null
    this.abierto = false

    this.escena.input.keyboard.on('keydown-SPACE', () => this.avanzar())
    this.escena.input.keyboard.on('keydown-ENTER', () => this.avanzar())
    this.escena.input.keyboard.on('keydown-E', () => this.avanzar())
  }

  // Muestra un texto (string con \n literales) y resuelve al terminarlo.
  decir(texto, ctx = {}) {
    const interpolado = Texto.tpl(texto, ctx)
    this.paginas = Texto.paginar(interpolado, this.carPorLinea, this.lineasPorPagina)
    this.pagina = 0
    this.abierto = true
    this.contenedor.setVisible(true)
    this.escena.events.emit('dialogo-abierto')
    this.mostrarPagina()
    return new Promise((resolve) => (this.resolver = resolve))
  }

  // Elección de botones («Reclutar» / «Seguir solo»); resuelve el índice.
  pregunta(opciones) {
    this.paginas = opciones.map((o) => o)
    this.pagina = 0
    this.abierto = true
    this.contenedor.setVisible(true)
    this.escena.events.emit('dialogo-abierto')
    this.texto.setText('')
    this.botones = opciones.map((etiqueta, i) => {
      const bx = this.x + 24 + i * (this.anchoCaja / opciones.length)
      const by = this.y + this.altoCaja / 2
      const zona = this.escena.add.zone(bx, by, 120, 28).setInteractive()
      const caja = this.escena.add
        .rectangle(bx, by, 120, 28, 0x000000, 0.5)
        .setStrokeStyle(1, 0xe0c04a, 0.9)
      const rotulo = this.escena.add
        .text(bx, by, etiqueta, { fontFamily: FUENTE, fontSize: '8px', color: '#e0c04a' })
        .setOrigin(0.5)
      zona.on('pointerdown', () => {
        this.limpiarBotones()
        this.cerrar()
        this.resolver && this.resolver(i)
        this.resolver = null
      })
      const grupo = [zona, caja, rotulo]
      this.contenedor.add(grupo)
      return grupo
    })
    return new Promise((resolve) => (this.resolver = resolve))
  }

  mostrarPagina() {
    this.chars = 0
    this.texto.setText('')
    this.indicador.setVisible(false)
    this.escribiendo = true
    this.eventoTypewriter?.remove()
    this.eventoTypewriter = this.escena.time.addEvent({
      delay: 1000 / CAR_POR_SG,
      loop: true,
      callback: () => {
        this.chars++
        this.texto.setText(this.paginas[this.pagina].slice(0, this.chars))
        if (this.chars >= this.paginas[this.pagina].length) this.finPagina()
      },
    })
  }

  finPagina() {
    this.eventoTypewriter?.remove()
    this.eventoTypewriter = null
    this.escribiendo = false
    this.indicador.setVisible(true)
    if (!this.parapadeo) {
      this.parapadeo = this.escena.tweens.add({
        targets: this.indicador,
        alpha: 0.15,
        duration: 350,
        yoyo: true,
        repeat: -1,
      })
    }
  }

  avanzar() {
    if (!this.abierto || this.botones) return // en pregunta solo valen los botones
    if (this.escribiendo) {
      this.finPagina()
      this.texto.setText(this.paginas[this.pagina])
      return
    }
    this.pagina++
    if (this.pagina < this.paginas.length) {
      this.mostrarPagina()
    } else {
      this.cerrar()
      this.resolver && this.resolver()
      this.resolver = null
    }
  }

  limpiarBotones() {
    if (!this.botones) return
    for (const grupo of this.botones) grupo.forEach((o) => o.destroy())
    this.botones = null
  }

  cerrar() {
    this.abierto = false
    this.limpiarBotones()
    this.parapadeo?.remove()
    this.parapadeo = null
    this.contenedor.setVisible(false)
    this.escena.events.emit('dialogo-cerrado')
  }
}

export default DialogBox
