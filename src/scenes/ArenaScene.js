// ArenaScene — solo desarrollo (Fase D): elegir cualquier enemigo de la
// aventura activa y ajustar stats del héroe, para probar IA/fases sin
// necesitar los mapas. Se entra por el botón discreto del menú.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import Balance from '../core/Balance.js'
import { VISTA, aplicarRes, alRelayout } from '../core/resolucion.js'

import { FUENTE } from '../ui/tema.js'

export class ArenaScene extends Phaser.Scene {
  constructor() {
    super('Arena')
  }

  init() {
    // Partida desechable de pruebas: Tilo nivel 1 en «camino» si no hay save.
    if (!partida.aventura) partida.nuevaPartida('corazon_ceniza', 'tilo')
  }

  create() {
    aplicarRes(this)

    const { width, height } = VISTA
    this.cameras.main.setBackgroundColor('#141414')

    this.add
      .text(width / 2, 16, 'ARENA DE PRUEBAS (dev)', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#909090',
      })
      .setOrigin(0.5)

    this.add
      .text(12, 34, `PV ${partida.stats.vida}/${partida.stats.vidaMax} · ATQ ${partida.ataqueEfectivo()} · grieta ${partida.grieta} · cuernos ${partida.cantidad('cuerno_valoria')}`, {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#9a9aa8',
      })

    // Enemigos: una línea por enemigo con stats escalados por dificultad.
    const av = Datos.aventura(partida.aventura)
    let y = 56
    for (const [id, dato] of Object.entries(av.enemigos)) {
      const linea = this.add
        .text(16, y, `▶ ${dato.nombre}  (PV ${Balance.statEnemigo(dato.vida, 'vida_enemigos', partida.dificultad)} · ATQ ${Balance.statEnemigo(dato.ataque, 'ataque_enemigos', partida.dificultad)}${dato.fases ? ' · FASE' : ''}${dato.sin_huida ? ' · JEFE' : ''})`, {
          fontFamily: FUENTE,
          fontSize: '7px',
          color: '#e0c04a',
        })
        .setInteractive({ useHandCursor: true })
      const enemigoId = id
      linea.on('pointerdown', () => this.pelear(enemigoId))
      y += 16
    }

    // Herramientas dev: curar, grieta +15, dar cuerno, reclutar todos, reset PV.
    const herramientas = [
      ['curar', () => { partida.stats.vida = partida.stats.vidaMax; this.scene.restart() }],
      ['grieta+15', () => { partida.grieta = Math.min(100, partida.grieta + 15); partida.guardar(); this.scene.restart() }],
      ['cuerno', () => { partida.inventario.push('cuerno_valoria'); partida.guardar(); this.scene.restart() }],
      ['companeros', () => { for (const id of ['sylvana', 'aldric', 'torkan']) if (!partida.companeros.includes(id)) partida.companeros.push(id); partida.descansar(); this.scene.restart() }],
    ]
    herramientas.forEach(([etiqueta, fn], i) => {
      this.add
        .text(16 + i * 110, height - 34, `[${etiqueta}]`, {
          fontFamily: FUENTE,
          fontSize: '7px',
          color: '#9ad09a',
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', fn)
    })

    this.add
      .text(16, height - 16, '← menu', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#909090',
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'))

    // Herramienta dev: al girar el dispositivo se re-renderiza entera.
    alRelayout(this, () => this.scene.restart())
  }

  pelear(enemigoId) {
    partida.stats.vida = Math.max(1, partida.stats.vida)
    this.scene.launch('Battle', {
      enemigos: [enemigoId],
      origen: 'Arena',
      lugar: 'arena',
    })
  }
}

export default ArenaScene
