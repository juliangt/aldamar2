// HeroeScene — selección de héroe, dificultad y teclado táctil A–Z (Fase F).
// Sin teclado del sistema: personalización de nombre táctil v1 (máx. 12 letras).

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import { VISTA, aplicarRes, alRelayout, esVistaVertical } from '../core/resolucion.js'

import { FUENTE } from '../ui/tema.js'
import TecladoTactil from '../ui/TecladoTactil.js'

export class HeroeScene extends Phaser.Scene {
  constructor() {
    super('Heroe')
  }

  init(data = {}) {
    this.avId = data.aventura || 'corazon_ceniza'
    this.indiceHeroe = 0
    this.dificultad = Datos.dificultadPorDefecto || 'camino'
    this.nombresPersonalizados = {}
    this.modo = 'heroe' // 'heroe' | 'teclado' | 'dificultad'
  }

  create() {
    aplicarRes(this)
    this.cameras.main.setBackgroundColor('#000000')

    const av = Datos.aventura(this.avId)
    this.clavesHeroes = Object.keys(av.personajes || {})
    if (this.clavesHeroes.length === 0) {
      this.scene.start('Menu')
      return
    }

    this.raiz = this.add.container(0, 0)
    this.renderizarVista()

    // Al girar el dispositivo se re-dibuja la pantalla contra la nueva vista.
    alRelayout(this, () => this.renderizarVista())
  }

  heroeActual() {
    const clave = this.clavesHeroes[this.indiceHeroe]
    return { clave, pj: Datos.aventura(this.avId).personajes[clave] }
  }

  nombreActual(clave, pj) {
    return this.nombresPersonalizados[clave] || pj.nombre || clave
  }

  renderizarVista() {
    this.raiz.removeAll(true)
    if (this.modo === 'heroe') {
      this.dibujarSeleccionHeroe()
    } else if (this.modo === 'teclado') {
      this.dibujarTecladoTactil()
    } else if (this.modo === 'dificultad') {
      this.dibujarSeleccionDificultad()
    }
  }

  // --------------------------------------------------- Paso 1: Selección de héroe

  dibujarSeleccionHeroe() {
    const { width } = VISTA
    const vertical = esVistaVertical()
    // En vertical (270×480) la tarjeta se baja para centrar el contenido.
    const dy = vertical ? 80 : 0
    const { clave, pj } = this.heroeActual()
    const total = this.clavesHeroes.length
    const nombre = this.nombreActual(clave, pj)

    const cajaX = width / 2

    const barraSuperior = this._crearBarraSuperior(width)
    const navegacion = this._crearNavegacionHeroes(width, total)
    const tarjeta = this._crearTarjetaPersonaje(width, dy, nombre, pj)
    const botones = this._crearBotonesAccion(cajaX, dy, nombre)

    this.raiz.add([
      ...barraSuperior,
      ...navegacion,
      ...tarjeta,
      ...botones,
    ])
  }

  _crearBarraSuperior(width) {
    const volver = this.add
      .text(12, 12, '◄ MENU', { fontFamily: FUENTE, fontSize: '8px', color: '#909090' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'))

    const tituloAv = this.add
      .text(width / 2, 12, Datos.aventura(this.avId).titulo.toUpperCase(), {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5, 0)

    return [volver, tituloAv]
  }

  _crearNavegacionHeroes(width, total) {
    const navIzq = this.add
      .text(width / 2 - 90, 28, '◄', { fontFamily: FUENTE, fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.indiceHeroe = (this.indiceHeroe - 1 + total) % total
        this.renderizarVista()
      })

    const navIndice = this.add
      .text(width / 2, 28, `HÉROE ${this.indiceHeroe + 1}/${total}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)

    const navDer = this.add
      .text(width / 2 + 90, 28, '►', { fontFamily: FUENTE, fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.indiceHeroe = (this.indiceHeroe + 1) % total
        this.renderizarVista()
      })

    return [navIzq, navIndice, navDer]
  }

  _crearTarjetaPersonaje(width, dy, nombre, pj) {
    const cajaW = width - 36
    const cajaH = 160
    const cajaX = width / 2
    const cajaY = 40 + dy + cajaH / 2

    const fondoCaja = this.add
      .rectangle(cajaX, cajaY, cajaW, cajaH, 0x111116, 0.95)
      .setStrokeStyle(1, 0x444455, 0.8)

    const txtNombre = this.add
      .text(cajaX, 48 + dy, nombre, { fontFamily: FUENTE, fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5, 0)

    const txtTitulo = this.add
      .text(cajaX, 64 + dy, pj.titulo || '', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#9ad09a',
      })
      .setOrigin(0.5, 0)

    const itemsNombres = (pj.inventario || [])
      .map((id) => Datos.item(this.avId, id)?.nombre || id)
      .join(', ') || 'ninguno'

    const txtStats = this.add
      .text(
        cajaX,
        78 + dy,
        `PV: ${pj.vida}   ATQ: ${pj.ataque}   ORO: ${pj.monedas || 0}\nÍTEMS: ${itemsNombres}`,
        {
          fontFamily: FUENTE,
          fontSize: '7px',
          color: '#e8d8a8',
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: cajaW - 16 },
        }
      )
      .setOrigin(0.5, 0)

    const txtPres = this.add
      .text(cajaX, 102 + dy, pj.presentacion || '', {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#c0c0c0',
        align: 'center',
        wordWrap: { width: cajaW - 20 },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0)

    return [fondoCaja, txtNombre, txtTitulo, txtStats, txtPres]
  }

  _crearBotonesAccion(cajaX, dy, nombre) {
    const btnNombre = this.add
      .text(cajaX - 70, 184 + dy, '✎ CAMBIAR NOMBRE', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#8ab4f8',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.nombreTemp = nombre
        this.modo = 'teclado'
        this.renderizarVista()
      })

    const btnElegir = this.add
      .text(cajaX + 70, 184 + dy, 'ELEGIR HÉROE ▶', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.modo = 'dificultad'
        this.renderizarVista()
      })

    return [btnNombre, btnElegir]
  }

  // --------------------------------------------------- Paso 2: Teclado táctil v1

  dibujarTecladoTactil() {
    const { clave, pj } = this.heroeActual()
    const promptSabor = pj.texto_nombre || '¿Cómo te llamas, viajero? ({nombre}):'

    new TecladoTactil(this, {
      contenedor: this.raiz,
      prompt: promptSabor.replace('{nombre}', pj.nombre || clave),
      nombreInicial: this.nombreTemp,
      nombreCanonico: pj.nombre || clave,
      onAceptar: (nombre) => {
        this.nombresPersonalizados[clave] = nombre
        this.modo = 'heroe'
        this.renderizarVista()
      },
      onCancelar: () => {
        this.modo = 'heroe'
        this.renderizarVista()
      },
    })
  }

  // --------------------------------------------------- Paso 3: Selector de Dificultad

  dibujarSeleccionDificultad() {
    const { width, height } = VISTA
    const dy = esVistaVertical() ? 60 : 0
    const { clave, pj } = this.heroeActual()
    const nombre = this.nombreActual(clave, pj)

    const titulo = this.add
      .text(width / 2, 16, 'ELIGE TU DIFICULTAD', {
        fontFamily: FUENTE,
        fontSize: '9px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)

    const subtitulo = this.add
      .text(width / 2, 30, `Viajero: ${nombre} (${pj.titulo})`, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#909090',
      })
      .setOrigin(0.5)

    const elementos = [titulo, subtitulo]

    const listaDifs = [
      { id: 'paseo', ...Datos.dificultades.paseo },
      { id: 'camino', ...Datos.dificultades.camino },
      { id: 'ceniza', ...Datos.dificultades.ceniza },
    ]

    const cardW = width - 40
    const cardH = 42
    const startY = 50 + dy

    listaDifs.forEach((d, idx) => {
      const y = startY + idx * (cardH + 8) + cardH / 2
      const seleccionada = this.dificultad === d.id

      const cardFondo = this.add
        .rectangle(width / 2, y, cardW, cardH, seleccionada ? 0x1c1c28 : 0x0f0f14)
        .setStrokeStyle(1, seleccionada ? 0xe0c04a : 0x333344, 0.9)
        .setInteractive({ useHandCursor: true })

      const cardTitulo = this.add
        .text(
          width / 2 - cardW / 2 + 12,
          y - 12,
          `${d.nombre} ${d.id === 'camino' ? '(DEFECTO)' : ''}`,
          {
            fontFamily: FUENTE,
            fontSize: '8px',
            color: seleccionada ? '#e0c04a' : '#ffffff',
          }
        )

      const cardDesc = this.add.text(width / 2 - cardW / 2 + 12, y + 2, d.descripcion, {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#aaaaaa',
        wordWrap: { width: cardW - 24 },
        lineSpacing: 2,
      })

      cardFondo.on('pointerdown', () => {
        this.dificultad = d.id
        this.renderizarVista()
      })

      elementos.push(cardFondo, cardTitulo, cardDesc)
    })

    // Botones de pie
    const btnVolver = this.add
      .text(width / 2 - 80, height - 20, '◄ CAMBIAR HÉROE', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#909090',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.modo = 'heroe'
        this.renderizarVista()
      })

    const btnEmpezar = this.add
      .text(width / 2 + 80, height - 20, 'COMENZAR VIAJE ▶', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.comenzarPartida())

    this.tweens.add({
      targets: btnEmpezar,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
    })

    elementos.push(btnVolver, btnEmpezar)
    this.raiz.add(elementos)
  }

  // --------------------------------------------------- Iniciar partida y pasar a Prólogo

  comenzarPartida() {
    const { clave, pj } = this.heroeActual()
    const nombreFinal = this.nombreActual(clave, pj)

    // Crear la partida en el GameState único
    partida.nuevaPartida(this.avId, clave, this.dificultad)
    if (nombreFinal) {
      partida.nombre = nombreFinal
    }
    partida.guardar()

    // Pasar a PrologoScene
    this.scene.start('Prologo', {
      aventura: this.avId,
      heroe: clave,
    })
  }
}

export default HeroeScene
