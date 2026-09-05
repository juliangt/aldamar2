// UiScene — capa de interfaz paralela al mundo (cámara a zoom 1): HUD,
// banner de lugar, toasts, pausa y menú táctil. Vive aparte porque las
// zonas interactivas con scrollFactor(0) no reciben input bajo zoom ≠ 1.

import Phaser from 'phaser'
import { partida } from '../core/partida.js'
import MenuTactil from '../ui/MenuTactil.js'
import DialogBox from '../ui/DialogBox.js'
import InventarioUI from '../ui/InventarioUI.js'
import TiendaUI from '../ui/TiendaUI.js'

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
    this.mundo = this.scene.get('World')

    this.crearHud()
    this.crearBanner(this.nombreLugar)
    this.crearPausa()

    this.dialogo = new DialogBox(this)
    // La DialogBox es modal: silencia el táctil y para al jugador.
    this.dialogo.escena.events.on('dialogo-abierto', () => this.setModal(true))
    this.dialogo.escena.events.on('dialogo-cerrado', () => this.setModal(false))

    this.menuTactil = new MenuTactil(this, {
      onAccion: () => this.mundo && this.mundo.ejecutarAccion(),
      onMenu: () => this.abrirInventario(),
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

  refrescarHud() {
    this.hudPv.setText(`PV ${partida.stats.vida}/${partida.stats.vidaMax}`)
    this.hudAtaque.setText(`ATQ ${partida.ataqueEfectivo()} DEF ${partida.defensa()}`)
    this.hudMonedas.setText(`● ${partida.monedas}`)
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
  }

  crearBanner(nombre) {
    if (!nombre) return
    const { width } = this.scale
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
    const { width, height } = this.scale
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
    const { width, height } = this.scale
    this.pausaVelo = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.6)
      .setDepth(4000)
      .setInteractive() // bloquea el paso al mundo
      .setVisible(false)
    this.pausaTexto = this.add
      .text(width / 2, height / 2, 'PAUSA\ntoca para seguir', {
        fontFamily: FUENTE,
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(4001)
      .setVisible(false)
    this.pausaVelo.on('pointerdown', () => this.mundo && this.mundo.alternarPausa())
  }

  setPausa(activada) {
    this.pausaVelo.setVisible(activada)
    this.pausaTexto.setVisible(activada)
    this.menuTactil.setVisible(!activada)
  }
}

export default UiScene
