// PrologoScene — prólogo cinemático: prologo_base, prologo_extra,
// texto_fama (legado) y presentacion con efecto typewriter y avance táctil (Fase F).
// Adaptativo: al girar el dispositivo se re-paginan los bloques contra la
// nueva vista y el typewriter continúa donde iba (página completada).

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import Texto from '../core/Texto.js'
import Legacy from '../core/Legacy.js'
import { partida } from '../core/partida.js'
import { audio8 } from '../core/Audio8.js'
import { VISTA, aplicarRes, alRelayout } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'
const CAR_POR_SG = 30
const CAJA_H = 150

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
    this.paginas = []
    this.bloques = []
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
    this.bloques = bloques

    // Interfaz visual
    this.txtTitulo = this.add
      .text(width / 2, 28, '', {
        fontFamily: FUENTE,
        fontSize: '9px',
        align: 'center',
      })
      .setOrigin(0.5)

    // Caja contenedora de texto
    this.cajaRect = this.add
      .rectangle(width / 2, height / 2 + 6, width - 48, CAJA_H, 0x0a0a0f, 0.8)
      .setStrokeStyle(1, 0x2e2e3e, 0.9)

    this.txtCuerpo = this.add
      .text(width / 2, height / 2 + 6, '', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        align: 'center',
        wordWrap: { width: width - 48 - 24 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)

    this.indicador = this.add
      .text(width / 2 + (width - 48) / 2 - 16, height / 2 + 6 + CAJA_H / 2 - 10, '▸', {
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

    this.paginar()
    if (this.paginas.length === 0) {
      this.iniciarMundo()
      return
    }

    alRelayout(this, () => this.relayout())
    this.mostrarPagina(0)
  }

  // Capacidad de la caja en la vista actual, medida con la fuente pixel real.
  capacidadPagina() {
    const { width } = VISTA
    const cajaW = width - 48
    const prueba = this.add
      .text(0, 0, 'MM', { fontFamily: FUENTE, fontSize: '7px' })
      .setVisible(false)
    const anchoChar = prueba.width / 2
    const altoLinea = prueba.height + 6
    prueba.destroy()
    return {
      carPorLinea: Math.max(8, Math.floor((cajaW - 24) / anchoChar)),
      lineasPorPagina: Math.max(3, Math.floor((CAJA_H - 24) / altoLinea)),
    }
  }

  // Re-pagina los bloques contra la vista actual (título con (n/m) si múltiple).
  paginar() {
    const { carPorLinea, lineasPorPagina } = this.capacidadPagina()
    this.paginas = []
    this.bloques.forEach((b) => {
      const pags = Texto.paginar(b.texto, carPorLinea, lineasPorPagina)
      pags.forEach((txtP, idx) => {
        this.paginas.push({
          titulo: b.titulo + (pags.length > 1 ? ` (${idx + 1}/${pags.length})` : ''),
          colorTitulo: b.colorTitulo,
          texto: txtP,
          bloque: b,
          idxEnBloque: idx,
          totalEnBloque: pags.length,
        })
      })
    })
  }

  // Re-encuadre al girar el dispositivo: posiciones + re-paginación del
  // bloque en curso (la página actual se muestra completada, sin typewriter).
  relayout() {
    const { width, height } = VISTA
    const cajaW = width - 48
    this.txtTitulo.setPosition(width / 2, 28)
    this.cajaRect.setPosition(width / 2, height / 2 + 6).setSize(cajaW, CAJA_H)
    this.txtCuerpo.setPosition(width / 2, height / 2 + 6).setStyle({
      wordWrap: { width: cajaW - 24 },
    })
    this.indicador.setPosition(width / 2 + cajaW / 2 - 16, height / 2 + 6 + CAJA_H / 2 - 10)
    this.zonaTap.setPosition(width / 2, height / 2).setSize(width, height)
    if (this.zonaTap.input?.hitArea?.setSize) {
      this.zonaTap.input.hitArea.setSize(width, height)
    }

    if (!this.paginas.length) return
    const actual = this.paginas[this.indicePagina]
    this.paginar()

    // Retomar el mismo bloque por su página (acotada a la nueva paginación).
    const nuevoIdx = this.paginas.findIndex(
      (p) =>
        p.bloque === actual.bloque &&
        p.idxEnBloque === Math.min(actual.idxEnBloque, actual.totalEnBloque - 1)
    )
    this.indicePagina = nuevoIdx >= 0 ? nuevoIdx : 0
    this.completarPagina()
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
    const p = this.paginas[this.indicePagina]
    if (!p) return
    if (this.temporizador) this.temporizador.remove()
    this.textoCompleto = p.texto
    this.txtCuerpo.setText(p.texto)
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
