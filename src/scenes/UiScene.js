// UiScene — capa de interfaz paralela al mundo (cámara a zoom 1): HUD,
// banner de lugar, toasts, pausa y menú táctil. Vive aparte porque las
// zonas interactivas con scrollFactor(0) no reciben input bajo zoom ≠ 1.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import MenuTactil from '../ui/MenuTactil.js'
import DialogBox from '../ui/DialogBox.js'
import SelectorOpciones from '../ui/SelectorOpciones.js'
import InventarioUI from '../ui/InventarioUI.js'
import TiendaUI from '../ui/TiendaUI.js'
import { VISTA, aplicarRes } from '../core/resolucion.js'
import { audio8 } from '../core/Audio8.js'

const FUENTE = '"Press Start 2P", monospace'

export class UiScene extends Phaser.Scene {
  constructor() {
    super('Ui')
  }

  init(data) {
    this.nombreLugar = data.nombre || ''
    this.modal = false
  }

  create() {
    aplicarRes(this)

    this.mundo = this.scene.get('World')

    this.crearHud()
    this.crearBanner(this.nombreLugar)
    this.crearPausa()

    this.dialogo = new DialogBox(this)
    // La DialogBox es modal: silencia el táctil y para al jugador.
    this.dialogo.escena.events.on('dialogo-abierto', () => this.setModal(true))
    this.dialogo.escena.events.on('dialogo-cerrado', () => this.setModal(false))

    // Selector de decisiones (Fase E): mismo contrato modal que DialogBox.
    this.selector = new SelectorOpciones(this)

    this.menuTactil = new MenuTactil(this, {
      onAccion: () => this.mundo && this.mundo.ejecutarAccion(),
      onMenu: () => this.abrirInventario(),
      onPausa: () => this.mundo && this.mundo.alternarPausa(),
    })

    this.inventario = new InventarioUI(this, {
      onToast: (m) => this.toast(m),
      onCambio: () => this.refrescarHud(),
    })
    this.inventario.onCerrar = () => this.setModal(false)

    this.tienda = new TiendaUI(this, {
      onToast: (m) => this.toast(m),
      onCambio: () => this.refrescarHud(),
    })
    this.tienda.onCerrar = () => this.setModal(false)

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.modal) {
        if (this.inventario.abierto) this.inventario.cerrar()
        else if (this.tienda.abierto) this.tienda.cerrar()
        return
      }
      this.mundo && this.mundo.alternarPausa()
    })
  }

  abrirInventario() {
    if (this.modal || this.mundo?.pausado) return
    this.setModal(true)
    this.inventario.abrir()
  }

  abrirTienda(lugarId) {
    if (this.modal) return
    this.setModal(true)
    this.tienda.abrir(lugarId)
  }

  setModal(activado) {
    this.modal = activado
    this.menuTactil.setBloqueado(activado)
  }

  decir(texto, ctx) {
    return this.dialogo.decir(texto, ctx)
  }

  pregunta(opciones) {
    return this.dialogo.pregunta(opciones)
  }

  // Decisión con opciones {titulo, detalle} (Fase E): resuelve la opción.
  elegir(pregunta, opciones, ctx) {
    return this.selector.elegir(pregunta, opciones, ctx)
  }

  refrescarHud() {
    if (!this.hudPv) return
    const txtPv = `PV ${partida.stats.vida}/${partida.stats.vidaMax}`
    const txtAtq = `ATQ ${partida.ataqueEfectivo()} DEF ${partida.defensa()}`
    const txtMon = `● ${partida.monedas}`
    const txtGri = `✚ ${partida.grieta}/100 Nv${partida.nivel}`

    if (!this.hudPrevios) this.hudPrevios = {}
    if (this.hudPrevios.pv !== txtPv) {
      this.hudPv.setText(txtPv)
      this.hudPrevios.pv = txtPv
    }
    if (this.hudPrevios.atq !== txtAtq) {
      this.hudAtaque.setText(txtAtq)
      this.hudPrevios.atq = txtAtq
    }
    if (this.hudPrevios.mon !== txtMon) {
      this.hudMonedas.setText(txtMon)
      this.hudPrevios.mon = txtMon
    }
    if (this.hudPrevios.gri !== txtGri) {
      this.hudGrieta.setText(txtGri)
      this.hudPrevios.gri = txtGri
    }
    if (this.hudBarraRelleno && this.hudPrevios.grietaVal !== partida.grieta) {
      const w = Math.max(0, Math.min(60, Math.round((partida.grieta / 100) * 60)))
      this.hudBarraRelleno.width = w
      this.hudBarraRelleno.setFillStyle(partida.grieta >= 60 ? 0xd04a4a : 0xb07a9a)
      this.hudPrevios.grietaVal = partida.grieta
    }
  }

  crearHud() {
    this.hudPv = this.add
      .text(8, 8, `PV ${partida.stats.vida}/${partida.stats.vidaMax}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e8e8e8',
      })
      .setDepth(3000)
    this.hudAtaque = this.add
      .text(8, 20, `ATQ ${partida.ataqueEfectivo()} DEF ${partida.defensa()}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#9ad09a',
      })
      .setDepth(3000)
    this.hudMonedas = this.add
      .text(8, 32, `● ${partida.monedas}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setDepth(3000)
    this.hudGrieta = this.add
      .text(8, 44, `✚ ${partida.grieta}/100 Nv${partida.nivel}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#b07a9a',
      })
      .setDepth(3000)

    // Barra visual 0–100 de la grieta (Fase E)
    this.hudBarraFondo = this.add
      .rectangle(8, 56, 60, 4, 0x1a1a24)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x5a3a5a, 0.8)
      .setDepth(3000)
    this.hudBarraRelleno = this.add
      .rectangle(8, 56, Math.max(0, Math.round((partida.grieta / 100) * 60)), 4, 0xb07a9a)
      .setOrigin(0, 0)
      .setDepth(3001)
  }

  crearBanner(nombre) {
    if (!nombre) return
    const { width } = VISTA
    const banda = this.add
      .rectangle(width / 2, 24, width, 20, 0x000000, 0.45)
      .setDepth(3000)
    const texto = this.add
      .text(width / 2, 24, nombre, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(3001)
    this.time.delayedCall(1500, () => {
      banda.destroy()
      texto.destroy()
    })
  }

  toast(mensaje) {
    if (this.toastActual) this.toastActual.destroy()
    const { width, height } = VISTA
    const fondo = this.add
      .rectangle(width / 2, height - 90, width - 40, 18, 0x000000, 0.7)
      .setDepth(3100)
    const texto = this.add
      .text(width / 2, height - 90, mensaje, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8d8a8',
        wordWrap: { width: width - 60 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3101)
    this.toastActual = { destroy: () => { fondo.destroy(); texto.destroy() } }
    this.time.delayedCall(1600, () => this.toastActual && this.toastActual.destroy())
  }

  crearPausa() {
    const { width, height } = VISTA
    this.pausaContenedor = this.add.container(0, 0).setDepth(4000).setVisible(false)

    // Velo que bloquea el paso al mundo
    const velo = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setInteractive()
    this.pausaContenedor.add(velo)

    // Panel central
    const anchoCaja = Math.min(width - 32, 280)
    const altoCaja = 196
    const cx = width / 2
    const cy = height / 2

    const fondo = this.add
      .rectangle(cx, cy, anchoCaja, altoCaja, 0x121418, 0.95)
      .setStrokeStyle(1, 0xe8e8e8, 0.9)
    this.pausaContenedor.add(fondo)

    const tit = this.add
      .text(cx, cy - 74, '— PAUSA —', {
        fontFamily: FUENTE,
        fontSize: '10px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
    this.pausaContenedor.add(tit)

    this.pausaInfo = this.add
      .text(cx, cy - 54, '', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#8a9a8a',
        align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5)
    this.pausaContenedor.add(this.pausaInfo)

    // Botones con hit areas accesibles (≥ 48 px interactivos)
    // 1. Reanudar
    const btnReanudar = this.crearBotonPausa(cx, cy - 24, 180, 24, 'REANUDAR', () => {
      audio8.sfx('confirmar')
      this.mundo && this.mundo.alternarPausa()
    })
    this.pausaContenedor.add(btnReanudar)

    // 2. Audio Toggle (Mute / Unmute)
    this.btnAudioToggle = this.crearBotonPausa(cx, cy + 8, 180, 24, 'AUDIO: ACTIVADO', () => {
      audio8.toggleMute()
      audio8.sfx('confirmar')
      this.actualizarTextosPausa()
    })
    this.pausaContenedor.add(this.btnAudioToggle)

    // 3. Fila de Volumen: [ - ]  VOL 80%  [ + ]
    const btnVolMenos = this.crearBotonPausa(cx - 70, cy + 40, 36, 24, '-', () => {
      audio8.setVolumen(Math.max(0, audio8.volumenMaster - 0.1))
      audio8.sfx('confirmar')
      this.actualizarTextosPausa()
    })
    this.txtVolumen = this.add
      .text(cx, cy + 40, 'VOL 80%', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
      })
      .setOrigin(0.5)
    const btnVolMas = this.crearBotonPausa(cx + 70, cy + 40, 36, 24, '+', () => {
      audio8.setVolumen(Math.min(1, audio8.volumenMaster + 0.1))
      audio8.sfx('confirmar')
      this.actualizarTextosPausa()
    })
    this.pausaContenedor.add([btnVolMenos, this.txtVolumen, btnVolMas])

    // 4. Salir al Menú Principal
    const btnSalir = this.crearBotonPausa(cx, cy + 72, 180, 24, 'GUARDAR Y SALIR', () => {
      audio8.sfx('confirmar')
      partida.guardar()
      audio8.detenerAmbiente(false)
      this.scene.stop('Ui')
      this.scene.stop('World')
      this.scene.start('Menu')
    })
    this.pausaContenedor.add(btnSalir)
  }

  crearBotonPausa(x, y, w, h, texto, onClick) {
    const contenedor = this.add.container(x, y)
    // Hit area interactiva accesible de al menos 48 px
    const hitW = Math.max(w, 48)
    const hitH = Math.max(h, 48)
    const zona = this.add.zone(0, 0, hitW, hitH).setInteractive()
    const caja = this.add
      .rectangle(0, 0, w, h, 0x1f242c, 0.9)
      .setStrokeStyle(1, 0x707888, 0.9)
    const lbl = this.add
      .text(0, 0, texto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    zona.on('pointerdown', onClick)
    zona.on('pointerover', () => caja.setFillStyle(0x353e4c, 1))
    zona.on('pointerout', () => caja.setFillStyle(0x1f242c, 0.9))

    contenedor.add([zona, caja, lbl])
    contenedor.setEtiqueta = (t) => lbl.setText(t)
    return contenedor
  }

  actualizarTextosPausa() {
    if (this.btnAudioToggle) {
      this.btnAudioToggle.setEtiqueta(audio8.mute ? 'AUDIO: SILENCIADO' : 'AUDIO: ACTIVADO')
    }
    if (this.txtVolumen) {
      const pct = Math.round(audio8.volumenMaster * 100)
      this.txtVolumen.setText(`VOL ${pct}%`)
    }
  }

  setPausa(activada) {
    if (activada) {
      const dif = Datos.dificultad(partida.dificultad)
      const difNombre = dif?.nombre || partida.dificultad || 'Normal'
      const av = Datos.aventura(partida.aventura)
      const avNombre = av?.titulo || partida.aventura || ''
      this.pausaInfo.setText(`${avNombre}\nDificultad: ${difNombre}`)
      this.actualizarTextosPausa()
    }
    this.pausaContenedor.setVisible(activada)
    this.menuTactil.setVisible(!activada)
  }
}

export default UiScene
