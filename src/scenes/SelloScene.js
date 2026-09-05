// Sello — presentación de marca: sello ASCII de Aldamar + jingle 8-bit.
// Primer toque desbloquea el audio y arranca el jingle; otro toque (o el
// final del jingle) pasa al menú.

import Phaser from 'phaser'
import audio8 from '../core/Audio8.js'
import { VISTA, aplicarRes } from '../core/resolucion.js'

// Sello provisional: héroe con el Corazón al pecho y la espada clavada
// al costado. Debe caber en 480×270 con la fuente pixel real.
const SELLO = [
  '                                         ',
  '                                         ',
  '          .--.            |              ',
  '         ( oo )           |              ',
  '        _/\\__/\\_         _|_             ',
  '       /        \\         |              ',
  '      /   .--.   \\        |              ',
  '      |  ( <> )  |        |              ',
  '      \\   `--`   /        |              ',
  '      /|          \\      /|\\             ',
  '     / |   /\\ /\\   \\      |              ',
  '    /  |            \\     |              ',
  '   |   |_            _|   |              ',
  '   |  /  \\          /  \\  |              ',
  '   | |    |        |    | |              ',
  '   \\_/    |        |    \\_/              ',
  '          |        |                     ',
  '        __|__    __|__                   ',
  '       /_____\\  /_____\\                  ',
]

// Jingle provisional (~2 s, onda cuadrada): La menor ascendente y caída.
const JINGLE = [
  { f: 220.0, d: 0.14, t: 0.0 }, // La3
  { f: 261.6, d: 0.14, t: 0.16 }, // Do4
  { f: 329.6, d: 0.14, t: 0.32 }, // Mi4
  { f: 440.0, d: 0.22, t: 0.48 }, // La4
  { f: 392.0, d: 0.14, t: 0.74 }, // Sol4
  { f: 329.6, d: 0.14, t: 0.9 }, // Mi4
  { f: 261.6, d: 0.14, t: 1.06 }, // Do4
  { f: 220.0, d: 0.5, t: 1.22 }, // La3
]
const DURACION_JINGLE = 2.0

export class SelloScene extends Phaser.Scene {
  constructor() {
    super('Sello')
  }

  create() {
    aplicarRes(this)

    const { width, height } = VISTA
    const fuente = '"Press Start 2P", monospace'

    this._jingleSonando = false
    this._terminado = false

    this.add
      .text(width / 2, height / 2 - 12, SELLO.join('\n'), {
        fontFamily: fuente,
        fontSize: '8px',
        color: '#c8c8c8',
        align: 'center',
      })
      .setOrigin(0.5, 1)

    this.titulo = this.add
      .text(width / 2, height / 2 + 14, 'ALDAMAR', {
        fontFamily: fuente,
        fontSize: '16px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)

    this.pista = this.add
      .text(width / 2, height - 16, 'toca para comenzar', {
        fontFamily: fuente,
        fontSize: '8px',
        color: '#707070',
      })
      .setOrigin(0.5, 1)

    this.pista.setAlpha(0.6)
    this.tweens.add({
      targets: this.pista,
      alpha: 0.15,
      duration: 900,
      yoyo: true,
      repeat: -1,
    })

    this.input.once('pointerdown', () => this.comenzar())
    this.input.keyboard?.once('keydown-SPACE', () => this.comenzar())
  }

  // Primer toque: desbloquea el audio, suena el jingle y programa la salida.
  comenzar() {
    if (this._terminado) return
    audio8.ensure()
    if (audio8.ctx && audio8.ctx.state === 'suspended') {
      audio8.ctx.resume()
    }
    if (!this._jingleSonando) {
      audio8.secuencia(JINGLE, 0.12)
      this._jingleSonando = true
      this.pista.setText('toca para saltar')
      // Segundo toque (o fin del jingle) → menú.
      this.time.delayedCall(DURACION_JINGLE * 1000, () => this.salir())
      this.input.once('pointerdown', () => this.salir())
      this.input.keyboard?.once('keydown-SPACE', () => this.salir())
    }
  }

  salir() {
    if (this._terminado) return
    this._terminado = true
    this.scene.start('Menu')
  }
}

export default SelloScene
