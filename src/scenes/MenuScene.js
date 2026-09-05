// Menú (stub de Fase 0): título + arranque de la partida piloto. La Fase F
// le da contenido real (selección de aventura/héroe/dificultad).

import Phaser from 'phaser'
import { partida } from '../core/partida.js'
import { VISTA, aplicarRes } from '../core/resolucion.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  create() {
    aplicarRes(this)

    const { width, height } = VISTA
    const fuente = '"Press Start 2P", monospace'

    this.add
      .text(width / 2, height / 2 - 30, 'ALDAMAR', {
        fontFamily: fuente,
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 + 10, 'Próximamente', {
        fontFamily: fuente,
        fontSize: '10px',
        color: '#909090',
      })
      .setOrigin(0.5)

    // Entrada provisional de Fase A: empezar la partida piloto.
    const jugar = this.add
      .text(width / 2, height - 40, '▶ JUGAR', {
        fontFamily: fuente,
        fontSize: '10px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
    jugar.on('pointerover', () => jugar.setScale(1.1))
    jugar.on('pointerout', () => jugar.setScale(1))
    jugar.on('pointerdown', () => this.empezar())

    // Entrada oculta de Fase D: arena de pruebas (solo dev).
    this.add
      .text(8, height - 12, '≡', {
        fontFamily: fuente,
        fontSize: '8px',
        color: '#555555',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (!partida.aventura) partida.nuevaPartida('corazon_ceniza', 'tilo')
        this.scene.start('Arena')
      })

    this.input.keyboard.once('keydown-ENTER', () => this.empezar())

    // Prueba manual de multitouch (activePointers: 3).
    this.input.on('pointerdown', (p) => {
      console.log(`[input] puntero ${p.id()} en (${p.x | 0}, ${p.y | 0})`)
    })
  }

  empezar() {
    partida.nuevaPartida('corazon_ceniza', 'tilo')
    this.scene.stop('Ui')
    this.scene.start('World', { aventura: partida.aventura })
  }
}

export default MenuScene
