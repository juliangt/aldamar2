// MenuScene — menú principal de Aldamar (§8 de la spec maestra y Fase F).
// Selección de las 4 aventuras, estado (nueva/continuar/completada),
// panel de legado persistente y arranque/continuación de partidas.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import Legacy from '../core/Legacy.js'
import GameState from '../core/GameState.js'
import { partida } from '../core/partida.js'
import { VISTA, aplicarRes, alRelayout, esVistaVertical } from '../core/resolucion.js'

const FUENTE = '"Press Start 2P", monospace'

const MINI_SELLO_MENU = [
  '  .--.    |  ',
  ' ( oo )  _|_ ',
  '_/\\__/\\_  |  ',
  ' |(<>)|  /|\\ ',
]

const NUMEROS_ROMANOS = ['I', 'II', 'III', 'IV']

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu')
  }

  init() {
    this.indiceAventura = 0
    this.mostrarPanelLegado = false
  }

  create() {
    aplicarRes(this)
    this.cameras.main.setBackgroundColor('#000000')

    this.aventuras = Datos.orden
    this.raiz = this.add.container(0, 0)
    this.renderizarVista()

    // Al girar el dispositivo se re-dibuja el menú contra la nueva vista.
    alRelayout(this, () => this.renderizarVista())
  }

  renderizarVista() {
    this.raiz.removeAll(true)
    if (this.mostrarPanelLegado) {
      this.dibujarPanelLegado()
    } else {
      this.dibujarMenuPrincipal()
    }
  }

  dibujarMenuPrincipal() {
    const { width, height } = VISTA
    const vertical = esVistaVertical()
    // En vertical (270×480) el contenido se baja para centrarlo en el
    // hueco extra; en horizontal se mantiene arriba como siempre.
    const dy = vertical ? 56 : 0
    // Separación de las flechas del navegador de campañas, acotada al ancho.
    const navDX = Math.min(140, width / 2 - 20)
    const navY = 66 + dy

    const avActual = this.aventuras[this.indiceAventura]
    const totalAv = this.aventuras.length
    const legado = Legacy.cargar()

    const claveAv = Object.keys(Datos.aventuras).find(
      (k) => Datos.aventuras[k].orden === avActual.orden
    )
    const saveExistente = GameState.restaurar(claveAv)
    const finalCompletado = legado.finales[claveAv]

    const ctx = {
      width,
      height,
      vertical,
      dy,
      navDX,
      navY,
      avActual,
      totalAv,
      legado,
      claveAv,
      saveExistente,
      finalCompletado,
    }

    const elementosCabecera = this.crearCabecera(ctx)
    const elementosNavegador = this.crearNavegador(ctx)
    const elementosTarjeta = this.crearTarjeta(ctx)
    const elementosDev = this.crearBotonDev(ctx)

    this.raiz.add([
      ...elementosCabecera,
      ...elementosNavegador,
      ...elementosTarjeta,
      ...elementosDev,
    ])
  }

  crearCabecera(ctx) {
    const { width, dy, legado } = ctx

    const miniSello = this.add
      .text(width / 2 - 90, 18 + dy, MINI_SELLO_MENU.join('\n'), {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#888888',
        align: 'center',
      })
      .setOrigin(0.5, 0)

    const titulo = this.add
      .text(width / 2 + 10, 22 + dy, 'ALDAMAR', {
        fontFamily: FUENTE,
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)

    const subtitulo = this.add
      .text(width / 2 + 10, 44 + dy, 'CRÓNICAS DE LA CENIZA', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#707070',
      })
      .setOrigin(0.5, 0)

    // Botón Panel de Legado (esquina superior derecha)
    const tieneBanderas = legado.juramento || legado.grieta || legado.heroes.length > 0
    const btnLegado = this.add
      .text(width - 12, 12, tieneBanderas ? '❖ LEGADO (!)' : '❖ LEGADO', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: tieneBanderas ? '#e0c04a' : '#888888',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.mostrarPanelLegado = true
        this.renderizarVista()
      })

    return [miniSello, titulo, subtitulo, btnLegado]
  }

  crearNavegador(ctx) {
    const { width, navDX, navY, totalAv, vertical } = ctx

    const navIzq = this.add
      .text(width / 2 - navDX, navY, '◄', {
        fontFamily: FUENTE,
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.indiceAventura = (this.indiceAventura - 1 + totalAv) % totalAv
        this.renderizarVista()
      })

    const ordenRomano = NUMEROS_ROMANOS[this.indiceAventura] || String(this.indiceAventura + 1)
    const etiquetaRecomendada = this.indiceAventura === 0 ? ' · (RECOMENDADA)' : ''
    const navTxt = this.add
      .text(width / 2, navY, `CAMPAÑA ${ordenRomano}${etiquetaRecomendada}`, {
        fontFamily: FUENTE,
        fontSize: vertical ? '7px' : '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)

    const navDer = this.add
      .text(width / 2 + navDX, navY, '►', {
        fontFamily: FUENTE,
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.indiceAventura = (this.indiceAventura + 1) % totalAv
        this.renderizarVista()
      })

    return [navIzq, navTxt, navDer]
  }

  crearTarjeta(ctx) {
    const { width, navY, avActual, finalCompletado, saveExistente, claveAv } = ctx

    const cardW = width - 44
    const cardH = 138
    const cardX = width / 2
    const cardY = navY + 12 + cardH / 2

    const fondoCard = this.add
      .rectangle(cardX, cardY, cardW, cardH, 0x101016, 0.95)
      .setStrokeStyle(1, 0x3a3a4c, 0.8)

    const titAv = this.add
      .text(cardX, cardY - 52, avActual.titulo.toUpperCase(), {
        fontFamily: FUENTE,
        fontSize: '10px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: cardW - 24 },
      })
      .setOrigin(0.5, 0)

    const descAv = this.add
      .text(cardX, cardY - 34, avActual.descripcion || '', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#a0a0a8',
        align: 'center',
        wordWrap: { width: cardW - 32 },
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0)

    // Estado de la aventura
    let estadoColor = '#888888'
    let estadoTexto = 'ESTADO: NUEVA AVENTURA'
    if (finalCompletado) {
      estadoColor = '#e0c04a'
      estadoTexto = `✔ COMPLETADA: ${finalCompletado.toUpperCase()}`
    } else if (saveExistente) {
      estadoColor = '#9ad09a'
      const lugarNom = Datos.lugar(claveAv, saveExistente.lugar)?.nombre || saveExistente.lugar
      estadoTexto = `● PARTIDA EN CURSO: ${saveExistente.nombre} en ${lugarNom}`
    }

    const txtEstado = this.add
      .text(cardX, cardY + 12, estadoTexto, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: estadoColor,
        align: 'center',
        wordWrap: { width: cardW - 16 },
      })
      .setOrigin(0.5)

    const elementosBotones = this.crearBotonesAccion(cardX, cardY, saveExistente, claveAv)

    return [fondoCard, titAv, descAv, txtEstado, ...elementosBotones]
  }

  crearBotonesAccion(cardX, cardY, saveExistente, claveAv) {
    const elementosBotones = []
    if (saveExistente) {
      const btnContinuar = this.add
        .text(cardX - 60, cardY + 44, '▶ CONTINUAR', {
          fontFamily: FUENTE,
          fontSize: '8px',
          color: '#e0c04a',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.continuarPartida(saveExistente))

      this.tweens.add({
        targets: btnContinuar,
        alpha: 0.4,
        duration: 600,
        yoyo: true,
        repeat: -1,
      })

      const btnNueva = this.add
        .text(cardX + 60, cardY + 44, 'NUEVA PARTIDA', {
          fontFamily: FUENTE,
          fontSize: '7px',
          color: '#909090',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.empezarNueva(claveAv))

      elementosBotones.push(btnContinuar, btnNueva)
    } else {
      const btnEmpezar = this.add
        .text(cardX, cardY + 44, '▶ JUGAR AVENTURA', {
          fontFamily: FUENTE,
          fontSize: '8px',
          color: '#e0c04a',
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.empezarNueva(claveAv))

      this.tweens.add({
        targets: btnEmpezar,
        alpha: 0.4,
        duration: 600,
        yoyo: true,
        repeat: -1,
      })

      elementosBotones.push(btnEmpezar)
    }

    return elementosBotones
  }

  crearBotonDev(ctx) {
    const { height } = ctx
    if (import.meta.env.DEV) {
      const btnDevArena = this.add
        .text(10, height - 12, '≡', { fontFamily: FUENTE, fontSize: '8px', color: '#444444' })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (!partida.aventura) partida.nuevaPartida('corazon_ceniza', 'tilo')
          this.scene.start('Arena')
        })
      return [btnDevArena]
    }
    return []
  }

  // --------------------------------------------------- Panel de Legado persistente

  dibujarPanelLegado() {
    const { width, height } = VISTA
    const vertical = esVistaVertical()
    // En vertical las líneas largas (banderas, héroes) necesitan wrap y un
    // poco más de aire entre secciones.
    const px = vertical ? 12 : 28
    const dy = vertical ? 26 : 0
    const legado = Legacy.cargar()

    const fondo = this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a10, 0.98)

    const titLegado = this.add
      .text(width / 2, 20, '❖ EL LEGADO DE ALDAMAR', {
        fontFamily: FUENTE,
        fontSize: vertical ? '8px' : '10px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)

    const subtit = this.add
      .text(width / 2, 34, 'Memoria persistente transmitida entre cantares', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#888888',
        wordWrap: { width: width - 24 },
        align: 'center',
      })
      .setOrigin(0.5)

    // Banderas activas
    const juramentoTxt = `JURAMENTO DE LA ALIANZA : ${legado.juramento ? 'ACTIVO (ENCENDIDO)' : 'INACTIVO'}`
    const grietaTxt = `MARCA DE LA GRIETA      : ${legado.grieta ? 'ACTIVA (ENCENDIDA)' : 'INACTIVA'}`

    const txtJuramento = this.add.text(px, 54 + dy, juramentoTxt, {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: legado.juramento ? '#e0c04a' : '#666666',
      wordWrap: { width: width - px * 2 },
    })

    const txtGrieta = this.add.text(px, 68 + dy, grietaTxt, {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: legado.grieta ? '#d04a4a' : '#666666',
      wordWrap: { width: width - px * 2 },
    })

    // Héroes que culminaron
    const txtTitHeroes = this.add.text(px, 88 + dy, 'HÉROES QUE CRUZARON LA CENIZA:', {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: '#9ad09a',
    })

    let infoHeroes = ''
    if (legado.heroes.length === 0) {
      infoHeroes = 'Ningún héroe ha culminado un cantar todavía.'
    } else {
      infoHeroes = legado.heroes
        .slice(-4)
        .map((h) => `• ${h.nombre} (${h.aventura}) — ${h.final}`)
        .join('\n')
    }

    const txtHeroes = this.add.text(px, 102 + dy, infoHeroes, {
      fontFamily: FUENTE,
      fontSize: '6px',
      color: '#cccccc',
      lineSpacing: 4,
      wordWrap: { width: width - px * 2 },
    })

    // Finales registrados
    const txtTitFinales = this.add.text(px, 154 + dy * 2, 'FINALES ALCANZADOS POR CAMPAÑA:', {
      fontFamily: FUENTE,
      fontSize: '7px',
      color: '#8ab4f8',
    })

    const clavesAvs = Object.keys(Datos.aventuras)
    const lineasFinales = clavesAvs.map((k) => {
      const nombreAv = Datos.aventura(k).titulo
      const fin = legado.finales[k]
      return `• ${nombreAv}: ${fin ? fin.toUpperCase() : 'Pendiente'}`
    })

    const txtFinales = this.add.text(px, 168 + dy * 2, lineasFinales.join('\n'), {
      fontFamily: FUENTE,
      fontSize: '6px',
      color: '#aaaaaa',
      lineSpacing: 3,
      wordWrap: { width: width - px * 2 },
    })

    // Botón volver
    const btnCerrar = this.add
      .text(width / 2, height - 20, '◄ VOLVER AL MENÚ', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.mostrarPanelLegado = false
        this.renderizarVista()
      })

    this.raiz.add([
      fondo,
      titLegado,
      subtit,
      txtJuramento,
      txtGrieta,
      txtTitHeroes,
      txtHeroes,
      txtTitFinales,
      txtFinales,
      btnCerrar,
    ])
  }

  // --------------------------------------------------- Acciones de juego

  continuarPartida(save) {
    Object.assign(partida, save)
    this.scene.stop('Ui')
    this.scene.start('World', {
      aventura: partida.aventura,
      lugar: partida.lugar,
      entrada: partida.entrada,
    })
  }

  empezarNueva(claveAv) {
    this.scene.start('Heroe', { aventura: claveAv })
  }
}

export default MenuScene
