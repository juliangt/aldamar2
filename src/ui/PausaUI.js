// PausaUI — menú de pausa: velo modal, panel central con información de la
// partida y botones (Reanudar, Audio, Volumen, Pantalla completa, Salir).
// Extraído de UiScene; las acciones que tocan escenas o partida llegan por
// callbacks (onReanudar / onSalir) y el estado de audio se lee de audio8.
// Adaptativo: `relayout` re-encuadra el panel contra la vista actual.

import { VISTA } from '../core/resolucion.js'
import { audio8 } from '../core/Audio8.js'
import { alternarPantallaCompleta, estaPantallaCompleta } from '../core/pantalla.js'
import { FUENTE } from './tema.js'

export class PausaUI {
  constructor(escena, { onReanudar, onSalir } = {}) {
    this.escena = escena
    this.onReanudar = onReanudar
    this.onSalir = onSalir
    const add = escena.add

    this.contenedor = add.container(0, 0).setDepth(4000).setVisible(false)

    // Velo que bloquea el paso al mundo
    this.velo = add.rectangle(0, 0, 1, 1, 0x000000, 0.75).setInteractive()
    this.contenedor.add(this.velo)

    // Panel central
    this.fondo = add.rectangle(0, 0, 1, 1, 0x121418, 0.95).setStrokeStyle(1, 0xe8e8e8, 0.9)
    this.contenedor.add(this.fondo)

    this.titulo = add
      .text(0, 0, '— PAUSA —', { fontFamily: FUENTE, fontSize: '10px', color: '#e0c04a' })
      .setOrigin(0.5)
    this.contenedor.add(this.titulo)

    this.info = add
      .text(0, 0, '', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#8a9a8a',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5)
    this.contenedor.add(this.info)

    // Botones con hit areas accesibles (≥ 48 px interactivos)
    // 1. Reanudar
    this.btnReanudar = this.crearBoton(180, 24, 'REANUDAR', () => {
      audio8.sfx('confirmar')
      this.onReanudar?.()
    })
    this.contenedor.add(this.btnReanudar)

    // 2. Audio Toggle (Mute / Unmute)
    this.btnAudioToggle = this.crearBoton(180, 24, 'AUDIO: ACTIVADO', () => {
      audio8.toggleMute()
      audio8.sfx('confirmar')
      this.actualizarTextos()
    })
    this.contenedor.add(this.btnAudioToggle)

    // 3. Fila de Volumen: [ - ]  VOL 80%  [ + ]
    this.btnVolMenos = this.crearBoton(36, 24, '-', () => {
      audio8.setVolumen(Math.max(0, audio8.volumenMaster - 0.1))
      audio8.sfx('confirmar')
      this.actualizarTextos()
    })
    this.txtVolumen = add
      .text(0, 0, 'VOL 80%', { fontFamily: FUENTE, fontSize: '7px', color: '#e8e8e8' })
      .setOrigin(0.5)
    this.btnVolMas = this.crearBoton(36, 24, '+', () => {
      audio8.setVolumen(Math.min(1, audio8.volumenMaster + 0.1))
      audio8.sfx('confirmar')
      this.actualizarTextos()
    })
    this.contenedor.add([this.btnVolMenos, this.txtVolumen, this.btnVolMas])

    // 4. Pantalla completa (nativo del navegador; en iOS sigue en ventana)
    this.btnPantallaCompleta = this.crearBoton(180, 24, 'PANTALLA COMPLETA', () => {
      audio8.sfx('confirmar')
      alternarPantallaCompleta().then(() => this.actualizarTextos())
    })
    this.contenedor.add(this.btnPantallaCompleta)

    // 5. Salir al Menú Principal
    this.btnSalir = this.crearBoton(180, 24, 'GUARDAR Y SALIR', () => {
      audio8.sfx('confirmar')
      this.onSalir?.()
    })
    this.contenedor.add(this.btnSalir)

    this.relayout()
  }

  // Encuadre del panel de pausa contra la vista actual.
  relayout() {
    const { width, height } = VISTA
    const anchoCaja = Math.min(width - 32, 280)
    const altoCaja = 232
    const cx = width / 2
    const cy = height / 2

    this.velo.setPosition(cx, cy).setSize(width, height)
    if (this.velo.input?.hitArea?.setSize) {
      this.velo.input.hitArea.setSize(width, height)
    }
    this.fondo.setPosition(cx, cy).setSize(anchoCaja, altoCaja)
    this.titulo.setPosition(cx, cy - 92)
    this.info.setPosition(cx, cy - 72)
    this.btnReanudar.setPosition(cx, cy - 42)
    this.btnAudioToggle.setPosition(cx, cy - 10)
    this.btnVolMenos.setPosition(cx - 70, cy + 22)
    this.txtVolumen.setPosition(cx, cy + 22)
    this.btnVolMas.setPosition(cx + 70, cy + 22)
    this.btnPantallaCompleta.setPosition(cx, cy + 54)
    this.btnSalir.setPosition(cx, cy + 86)
  }

  crearBoton(w, h, texto, onClick) {
    const add = this.escena.add
    const contenedor = add.container(0, 0)
    // Hit area interactiva accesible de al menos 48 px
    const hitW = Math.max(w, 48)
    const hitH = Math.max(h, 48)
    const zona = add.zone(0, 0, hitW, hitH).setInteractive()
    const caja = add.rectangle(0, 0, w, h, 0x1f242c, 0.9).setStrokeStyle(1, 0x707888, 0.9)
    const lbl = add
      .text(0, 0, texto, { fontFamily: FUENTE, fontSize: '7px', color: '#ffffff' })
      .setOrigin(0.5)

    zona.on('pointerdown', onClick)
    zona.on('pointerover', () => caja.setFillStyle(0x353e4c, 1))
    zona.on('pointerout', () => caja.setFillStyle(0x1f242c, 0.9))

    contenedor.add([zona, caja, lbl])
    contenedor.setEtiqueta = (t) => lbl.setText(t)
    return contenedor
  }

  actualizarTextos() {
    if (this.btnAudioToggle) {
      this.btnAudioToggle.setEtiqueta(audio8.mute ? 'AUDIO: SILENCIADO' : 'AUDIO: ACTIVADO')
    }
    if (this.txtVolumen) {
      const pct = Math.round(audio8.volumenMaster * 100)
      this.txtVolumen.setText(`VOL ${pct}%`)
    }
    if (this.btnPantallaCompleta) {
      this.btnPantallaCompleta.setEtiqueta(
        estaPantallaCompleta() ? 'MODO VENTANA' : 'PANTALLA COMPLETA'
      )
    }
  }

  setInfo(texto) {
    this.info.setText(texto)
  }

  setVisible(visible) {
    this.contenedor.setVisible(visible)
  }
}

export default PausaUI
