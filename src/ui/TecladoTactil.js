// TecladoTactil — teclado táctil A–Z para nombrar al héroe sin teclado
// físico (v1, máx. 12 letras). Dibuja velo, campo de nombre, rejilla de
// teclas y fila de acciones (Borrar / Canónico / Aceptar / Volver) dentro
// del contenedor que entrega la escena; comunica el resultado por callbacks.

import { VISTA, esVistaVertical } from '../core/resolucion.js'
import { FUENTE } from './tema.js'

const MAX_NOMBRE = 12

// Rejilla fija de teclas: 3 filas de 9 (la última casilla es espacio).
const FILAS_TECLAS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'],
  ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', ' '],
]

export class TecladoTactil {
  constructor(
    escena,
    {
      contenedor,
      prompt,
      nombreInicial = '',
      nombreCanonico = '',
      onAceptar,
      onCancelar,
    } = {}
  ) {
    this.escena = escena
    this.nombreTemp = nombreInicial
    this.nombreCanonico = nombreCanonico
    this.onAceptar = onAceptar
    this.onCancelar = onCancelar

    const add = escena.add
    const { width, height } = VISTA
    const dy = esVistaVertical() ? 80 : 0

    // Velo de fondo modal
    const fondo = add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.96)

    // Texto de sabor
    const txtSabor = add
      .text(width / 2, 20, prompt, {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#9ad09a',
        align: 'center',
        wordWrap: { width: width - 40 },
      })
      .setOrigin(0.5, 0)

    // Campo de texto del nombre
    const campoY = 48 + dy
    const campoFondo = add
      .rectangle(width / 2, campoY, 200, 20, 0x1a1a24)
      .setStrokeStyle(1, 0x8ab4f8, 0.9)
    this.txtCampo = add
      .text(width / 2, campoY, this._textoCampo(), {
        fontFamily: FUENTE,
        fontSize: '9px',
        color: '#ffffff',
      })
      .setOrigin(0.5)

    const elementos = [fondo, txtSabor, campoFondo, this.txtCampo]
    const teclaW = 20
    const teclaH = 18
    const sepX = 4
    const sepY = 4
    const startY = 80 + dy

    FILAS_TECLAS.forEach((fila, fIndex) => {
      const filaW = fila.length * teclaW + (fila.length - 1) * sepX
      const startX = (width - filaW) / 2 + teclaW / 2
      const y = startY + fIndex * (teclaH + sepY)

      fila.forEach((letra, cIndex) => {
        const x = startX + cIndex * (teclaW + sepX)
        const teclaFondo = add
          .rectangle(x, y, teclaW, teclaH, 0x222230)
          .setStrokeStyle(1, 0x555566, 0.8)
          .setInteractive({ useHandCursor: true })
        const teclaTxt = add
          .text(x, y, letra === ' ' ? '␣' : letra, {
            fontFamily: FUENTE,
            fontSize: '8px',
            color: '#e8e8e8',
          })
          .setOrigin(0.5)

        teclaFondo.on('pointerdown', () => this._escribir(letra))
        elementos.push(teclaFondo, teclaTxt)
      })
    })

    // Fila inferior: Borrar, Restaurar, Aceptar, Cancelar
    const yAcciones = startY + 3 * (teclaH + sepY) + 6

    const btnBorrar = add
      .text(width / 2 - 90, yAcciones, '⌫ BORRAR', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e07a7a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._borrar())

    const btnDefecto = add
      .text(width / 2, yAcciones, 'CANÓNICO', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._canonico())

    const btnAceptar = add
      .text(width / 2 + 90, yAcciones, '✔ ACEPTAR', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#9ad09a',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._aceptar())

    const btnCancelar = add
      .text(width / 2, height - 16, 'VOLVER SIN CAMBIOS', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#777777',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.onCancelar?.())

    elementos.push(btnBorrar, btnDefecto, btnAceptar, btnCancelar)
    contenedor.add(elementos)
  }

  _textoCampo() {
    return `${this.nombreTemp}_`
  }

  _refrescarCampo() {
    this.txtCampo.setText(this._textoCampo())
  }

  _escribir(letra) {
    if (this.nombreTemp.length < MAX_NOMBRE) {
      this.nombreTemp += letra
      this._refrescarCampo()
    }
  }

  _borrar() {
    this.nombreTemp = this.nombreTemp.slice(0, -1)
    this._refrescarCampo()
  }

  _canonico() {
    this.nombreTemp = this.nombreCanonico
    this._refrescarCampo()
  }

  _aceptar() {
    const finalNombre = this.nombreTemp.trim() || this.nombreCanonico
    this.onAceptar?.(finalNombre)
  }
}

export default TecladoTactil
export { MAX_NOMBRE }
