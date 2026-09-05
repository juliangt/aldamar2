// EpilogoScene — resolución de finales, muerte y caída (§5.6 y Fase F).
// Cierre con sello ASCII + jingle WebAudio y retorno a MenuScene.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import Texto from '../core/Texto.js'
import { partida } from '../core/partida.js'
import GameState from '../core/GameState.js'
import { audio8, DURACION_JINGLE } from '../core/Audio8.js'
import { VISTA, aplicarRes, alRelayout } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'

const MINI_SELLO = [
  '    .--.      |    ',
  '   ( oo )     |    ',
  '  _/\\__/\\_   _|_   ',
  ' /  .--.  \\   |    ',
  ' | ( <> ) |  /|\\   ',
  ' \\_ `--` _/   |    ',
  '   |    |          ',
  ' __|__  |__        ',
]

export class EpilogoScene extends Phaser.Scene {
  constructor() {
    super('Epilogo')
  }

  init(data = {}) {
    this.tipo = data.tipo || 'muerte'
    this.datos = data
    this.avId = data.aventura || partida.aventura || 'corazon_ceniza'
    this.heroeId = data.heroe || partida.heroe
  }

  create() {
    aplicarRes(this)

    const { width, height } = VISTA
    this.cameras.main.setBackgroundColor('#000000')

    const av = Datos.aventura(this.avId)
    const pj = (this.heroeId && av.personajes?.[this.heroeId]) || {}

    let titulo = 'EL FIN'
    let colorTitulo = '#e0c04a'
    let texto = ''

    if (this.tipo === 'final') {
      titulo = (this.datos.final || 'victoria').toUpperCase()
      colorTitulo = this.datos.estilo === 'aviso' ? '#9a9aa8' : '#e0c04a'
      texto = this.datos.texto || ''
    } else if (this.tipo === 'caida') {
      titulo = 'LA CAÍDA'
      colorTitulo = '#b04a4a'
      texto = av.epilogos?.caida || 'La grieta se abre del todo…'
      if (this.avId) GameState.borrar(this.avId)
    } else {
      // muerte
      titulo = 'LA MUERTE'
      colorTitulo = '#9a9aa8'
      const plantilla = av.epilogos?.muerte || 'La aventura termina aquí…'
      const quien = pj.quien || pj.nombre || partida.nombre || 'el viajero'
      texto = Texto.tpl(plantilla, {
        quien,
        nombre: partida.nombre || pj.nombre || 'el viajero',
      })
      if (this.avId) GameState.borrar(this.avId)
    }

    this.contenedorTexto = this.add.container(0, 0)

    this.encabezado = this.add
      .text(width / 2, 28, titulo, {
        fontFamily: FUENTE,
        fontSize: '11px',
        color: colorTitulo,
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5)

    this.cuerpo = this.add
      .text(width / 2, height / 2 - 2, texto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        align: 'center',
        wordWrap: { width: width - 48 },
        lineSpacing: 5,
      })
      .setOrigin(0.5)

    this.btnCierre = this.add
      .text(width / 2, height - 24, '▶ CONTINUAR', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    this.tweens.add({ targets: this.cuerpo, alpha: { from: 0, to: 1 }, duration: 800 })
    this.tweens.add({
      targets: this.btnCierre,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
    })

    this.contenedorTexto.add([this.encabezado, this.cuerpo, this.btnCierre])

    this.btnCierre.on('pointerdown', () => this.mostrarCierreSello())
    this.input.keyboard?.once('keydown-ENTER', () => this.mostrarCierreSello())
    this.input.keyboard?.once('keydown-SPACE', () => this.mostrarCierreSello())

    alRelayout(this, () => this.relayout())
  }

  // Re-encuadre al girar el dispositivo (texto y cierre con sello).
  relayout() {
    const { width, height } = VISTA
    this.encabezado.setPosition(width / 2, 28).setStyle({ wordWrap: { width: width - 40 } })
    this.cuerpo.setPosition(width / 2, height / 2 - 2).setStyle({ wordWrap: { width: width - 48 } })
    this.btnCierre.setPosition(width / 2, height - 24)
    if (this._mostrandoSello) {
      this.selloTexto?.setPosition(width / 2, height / 2 - 14)
      this.tituloAldamar?.setPosition(width / 2, height / 2 + 34)
      this.volverTexto?.setPosition(width / 2, height - 18)
    }
  }

  // Cierre de aventura: sello + jingle WebAudio y retorno a MenuScene (§5.6 / Fase F)
  mostrarCierreSello() {
    if (this._mostrandoSello) return
    this._mostrandoSello = true

    this.contenedorTexto.setVisible(false)

    const { width, height } = VISTA

    const selloTexto = this.add
      .text(width / 2, height / 2 - 14, MINI_SELLO.join('\n'), {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#c8c8c8',
        align: 'center',
      })
      .setOrigin(0.5)

    const tituloAldamar = this.add
      .text(width / 2, height / 2 + 34, 'ALDAMAR', {
        fontFamily: FUENTE,
        fontSize: '12px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const volverTexto = this.add
      .text(width / 2, height - 18, 'toca para volver al menu', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#707070',
      })
      .setOrigin(0.5)

    this.selloTexto = selloTexto
    this.tituloAldamar = tituloAldamar
    this.volverTexto = volverTexto

    // Reproducir jingle oficial
    audio8.ensure()
    audio8.jingle(0.14)

    // Al terminar el jingle (o segundo tap), volver al menú
    this.time.delayedCall(DURACION_JINGLE * 1000 + 400, () => this.volverMenu())
    this.input.once('pointerdown', () => this.volverMenu())
    this.input.keyboard?.once('keydown-ENTER', () => this.volverMenu())
    this.input.keyboard?.once('keydown-SPACE', () => this.volverMenu())
  }

  volverMenu() {
    if (this._haVuelto) return
    this._haVuelto = true
    partida.aventura = null
    this.scene.start('Menu')
  }
}

export default EpilogoScene
