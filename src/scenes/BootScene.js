// Boot — precarga mínima (fuente pixel) y validación de datos por consola.

import Phaser from 'phaser'
import fontUrl from '../assets/fonts/press-start-2p.ttf'
import Datos from '../core/Datos.js'
import { aplicarRes } from '../core/resolucion.js'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  init() {
    // Fondo negro mientras carga la fuente.
    this.cameras.main.setBackgroundColor('#000000')
  }

  preload() {
    this.load.font('pixel', fontUrl, 'Press Start 2P')
  }

  async create() {
    aplicarRes(this)

    // Esperar a que la fuente esté realmente disponible para el canvas
    // (el loader de Phaser puede completarse antes de que el FontFace listo).
    try {
      await document.fonts.load('8px "Press Start 2P"', 'ALDAMAR')
    } catch {
      console.warn('[Boot] No se pudo esperar a la fuente pixel; sigo con fallback')
    }
    this.validarDatos()
    this.scene.start('Sello')
  }

  // Log de validación de contenido (criterio de aceptación de Fase 0).
  validarDatos() {
    const aventuras = Datos.orden
    let lugares = 0
    let enemigos = 0
    for (const av of aventuras) {
      lugares += av.lugares.length
      enemigos += Object.keys(av.enemigos).length
    }
    const rasgos = Object.keys(Datos.rasgos).length
    const dificultades = Object.keys(Datos.dificultades).length
    const ok =
      aventuras.length === 4 &&
      lugares === 39 &&
      enemigos === 23 &&
      dificultades === 3 &&
      rasgos === 3
    console.info(
      `[Datos] ${aventuras.length} aventuras · ${lugares} lugares · ` +
        `${enemigos} enemigos · ${dificultades} dificultades · ${rasgos} rasgos ` +
        (ok ? '(OK)' : '(¡CONTEOS INESPERADOS!)')
    )
    if (!ok) console.warn('[Datos] Conteos:', { aventuras, lugares, enemigos, dificultades, rasgos })
  }
}

export default BootScene
