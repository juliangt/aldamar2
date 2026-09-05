// EpilogoScene — stub de Fase D: texto de muerte/caída y vuelta al menú.
// La Fase F le da el contenido real (epílogos completos, legado, finales).

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import GameState from '../core/GameState.js'

const FUENTE = '"Press Start 2P", monospace'

export class EpilogoScene extends Phaser.Scene {
  constructor() {
    super('Epilogo')
  }

  init(data) {
    this.tipo = data?.tipo || 'muerte'
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#000000')
    const av = Datos.aventura(partida.aventura)
    const texto =
      (av.epilogos && av.epilogos[this.tipo]) ||
      'La aventura termina aqui… (stub de Fase D; epilogos completos en Fase F).'

    this.add
      .text(width / 2, 40, this.tipo === 'caida' ? 'LA GRIETA' : 'EL FIN', {
        fontFamily: FUENTE,
        fontSize: '14px',
        color: this.tipo === 'caida' ? '#b04a4a' : '#9a9aa8',
      })
      .setOrigin(0.5)

    const cuerpo = this.add
      .text(width / 2, height / 2, texto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        align: 'center',
        wordWrap: { width: width - 60 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)

    this.tweens.add({ targets: cuerpo, alpha: { from: 0, to: 1 }, duration: 1200 })

    const volver = this.add
      .text(width / 2, height - 30, '▶ volver al menu', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.volver())
    this.tweens.add({ targets: volver, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 })
    this.input.keyboard.once('keydown-ENTER', () => this.volver())

    // La partida muerta se borra (§8: sin partida, sin legado).
    if (partida.aventura) GameState.borrar(partida.aventura)
  }

  volver() {
    partida.aventura = null
    this.scene.start('Menu')
  }
}

export default EpilogoScene
