// PrologoScene — prólogo cinemático: prologo_base, prologo_extra,
// texto_fama (legado) y presentacion con efecto typewriter y avance táctil (Fase F).

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import Texto from '../core/Texto.js'
import Legacy from '../core/Legacy.js'
import { partida } from '../core/partida.js'
import { audio8 } from '../core/Audio8.js'
import { VISTA, aplicarRes } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'
const CAR_POR_SG = 30

export class PrologoScene extends Phaser.Scene {
  constructor() {
    super('Prologo')
  }

  init(data = {}) {
    this.avId = data.aventura || partida.aventura || 'corazon_ceniza'
    this.heroeId = data.heroe || partida.heroe || 'tilo'
    this.indicePagina = 0
    this.chars = 0
    this.escribiendo = false
  }

  create() {
    aplicarRes(this)
    this.cameras.main.setBackgroundColor('#000000')

    const { width, height } = VISTA
    const av = Datos.aventura(this.avId)
    const pj = av.personajes?.[this.heroeId] || {}
    const ctx = {
      nombre: partida.nombre || pj.nombre || this.heroeId,
      trato: pj.trato || 'viajero',
      quien: pj.quien || 'el viajero',
    }

    // Comprobar si hay legado relevante
    const legado = Legacy.cargar()
    const tieneFama = legado.tieneBanderasImportadas(this.avId)

    // Construir bloques narrativos
    const bloques = []
    if (av.prologo_base) {
      bloques.push({
        titulo: av.titulo.toUpperCase(),
        colorTitulo: '#e0c04a',
        texto: Texto.tpl(av.prologo_base.trim(), ctx),
      })
    }
    if (pj.prologo_extra) {
      bloques.push({
        titulo: (pj.nombre || this.heroeId).toUpperCase(),
        colorTitulo: '#9ad09a',
        texto: Texto.tpl(pj.prologo_extra.trim(), ctx),
      })
    }
    if (tieneFama && av.legado?.texto_fama) {
      bloques.push({
        titulo: 'LA FAMA',
        colorTitulo: '#8ab4f8',
        texto: Texto.tpl(av.legado.texto_fama.trim(), ctx),
      })
    }
    if (pj.presentacion) {
      bloques.push({
        titulo: 'EL COMIENZO',
        colorTitulo: '#ffffff',
        texto: Texto.tpl(pj.presentacion.trim(), ctx),
      })
    }

    // Paginar textos que excedan el espacio visible
    // En 480×270 con caja de 420×140: ~46 caracteres por línea, 7 líneas
    this.paginas = []
    for (const b of bloques) {
      const pags = Texto.paginar(b.texto, 44, 7)
      pags.forEach((txtP, idx) => {
        this.paginas.push({
          titulo: b.titulo + (pags.length > 1 ? ` (${idx + 1}/${pags.length})` : ''),
          colorTitulo: b.colorTitulo,
          texto: txtP,
        })
      })
    }

    if (this.paginas.length === 0) {
      this.iniciarMundo()
      return
    }

    // Interfaz visual
    this.txtTitulo = this.add
      .text(width / 2, 28, '', {
        fontFamily: FUENTE,
        fontSize: '9px',
        align: 'center',
      })
      .setOrigin(0.5)

    // Caja contenedora de texto
    const cajaW = width - 48
    const cajaH = 150
    this.add
      .rectangle(width / 2, height / 2 + 6, cajaW, cajaH, 0x0a0a0f, 0.8)
      .setStrokeStyle(1, 0x2e2e3e, 0.9)

    this.txtCuerpo = this.add
      .text(width / 2, height / 2 + 6, '', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        align: 'center',
        wordWrap: { width: cajaW - 24 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)

    this.indicador = this.add
      .text(width / 2 + cajaW / 2 - 16, height / 2 + cajaH / 2 - 10, '▸', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setVisible(false)

    this.tweens.add({
      targets: this.indicador,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    })

    // Botón de saltar prólogo
    this.add
      .text(width - 12, 12, 'SALTAR ❯❯', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#707070',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.iniciarMundo())

    // Zona interactiva modal a pantalla completa
    this.zonaTap = this.add
      .zone(width / 2, height / 2, width, height)
      .setInteractive()
    this.zonaTap.on('pointerdown', () => this.avanzar())

    this.input.keyboard?.on('keydown-SPACE', () => this.avanzar())
    this.input.keyboard?.on('keydown-ENTER', () => this.avanzar())

    this.mostrarPagina(0)
  }

  mostrarPagina(indice) {
    if (indice >= this.paginas.length) {
      this.iniciarMundo()
      return
    }

    this.indicePagina = indice
    const p = this.paginas[indice]
    this.txtTitulo.setText(p.titulo)
    this.txtTitulo.setColor(p.colorTitulo)

    this.textoCompleto = p.texto
    this.chars = 0
    this.escribiendo = true
    this.indicador.setVisible(false)
    this.txtCuerpo.setText('')

    if (this.temporizador) this.temporizador.remove()
    this.temporizador = this.time.addEvent({
      delay: 1000 / CAR_POR_SG,
      loop: true,
      callback: () => this.escribirCaracter(),
    })
  }

  escribirCaracter() {
    this.chars++
    if (this.chars <= this.textoCompleto.length) {
      this.txtCuerpo.setText(this.textoCompleto.slice(0, this.chars))
      // Tick sutil cada 4 caracteres
      if (this.chars % 4 === 0) {
        audio8.nota(500, 0.02, 0.02)
      }
    } else {
      this.completarPagina()
    }
  }

  completarPagina() {
    if (this.temporizador) this.temporizador.remove()
    this.txtCuerpo.setText(this.textoCompleto)
    this.escribiendo = false
    this.indicador.setVisible(true)
  }

  avanzar() {
    if (this.escribiendo) {
      this.completarPagina()
    } else {
      this.mostrarPagina(this.indicePagina + 1)
    }
  }

  iniciarMundo() {
    if (this._iniciado) return
    this._iniciado = true
    if (this.temporizador) this.temporizador.remove()

    this.scene.stop('Prologo')
    this.scene.start('World', { aventura: this.avId })
  }
}

export default PrologoScene
