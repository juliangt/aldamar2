import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('phaser', async () => (await import('../helpers/phaser.js')).phaserStub)

import TecladoTactil, { MAX_NOMBRE } from '../../src/ui/TecladoTactil.js'
import { crearMockEscena, crearElemento } from '../helpers/phaser.js'

function montarTeclado(overrides = {}) {
  const escena = crearMockEscena()
  const contenedor = crearElemento()
  const opts = {
    contenedor,
    prompt: '¿Cómo te llamas, viajero? (Tilo):',
    nombreInicial: 'Tilo',
    nombreCanonico: 'Tilo',
    onAceptar: vi.fn(),
    onCancelar: vi.fn(),
    ...overrides,
  }
  const teclado = new TecladoTactil(escena, opts)
  return { escena, contenedor, teclado, opts }
}

// rects[0] = velo, rects[1] = campo; rects[2..28] = teclas A–Z␣ por filas.
const rects = (escena) => escena.add.rectangle.mock.results.map((r) => r.value)
const tecla = (escena, i) => rects(escena)[2 + i]
const pulsar = (el) => el._handlers['pointerdown']()

describe('TecladoTactil Unit Tests', () => {
  let montado
  beforeEach(() => {
    montado = montarTeclado()
  })

  it('dibuja velo, campo, 27 teclas y añade todo al contenedor', () => {
    const { escena, contenedor } = montado
    // 1 velo + 1 campo + 3×9 teclas = 29 rectángulos
    expect(escena.add.rectangle).toHaveBeenCalledTimes(29)
    // txtSabor + txtCampo + 27 rótulos + 4 botones = 33 textos
    expect(escena.add.text).toHaveBeenCalledTimes(33)
    expect(contenedor.add).toHaveBeenCalledTimes(1)
    expect(contenedor.add.mock.calls[0][0]).toHaveLength(62) // 29 rects + 33 textos
  })

  it('pulsa teclas y respeta el límite de 12 letras', () => {
    const { escena, teclado } = montado
    pulsar(tecla(escena, 0)) // A
    pulsar(tecla(escena, 1)) // B
    expect(teclado.nombreTemp).toBe('TiloAB')

    teclado.nombreTemp = '123456789012'
    pulsar(tecla(escena, 0))
    expect(teclado.nombreTemp).toBe('123456789012')
    expect(MAX_NOMBRE).toBe(12)
  })

  it('borrar elimina la última letra y canónico restaura el nombre por defecto', () => {
    const { escena, teclado } = montado
    const textos = escena.add.text.mock.results.map((r) => r.value)
    // Botones de acción: los 4 últimos textos (Borrar, Canónico, Aceptar, Cancelar)
    const [btnBorrar, btnCanonico, btnAceptar, btnCancelar] = textos.slice(-4)

    pulsar(btnBorrar)
    expect(teclado.nombreTemp).toBe('Til')

    teclado.nombreTemp = 'Distinto'
    pulsar(btnCanonico)
    expect(teclado.nombreTemp).toBe('Tilo')

    expect(btnAceptar).toBeDefined()
    expect(btnCancelar).toBeDefined()
  })

  it('aceptar entrega el nombre recortado y cae al canónico si está vacío', () => {
    const { escena, opts } = montado
    const textos = escena.add.text.mock.results.map((r) => r.value)
    const btnAceptar = textos[textos.length - 2]

    montado.teclado.nombreTemp = '  Brasa  '
    pulsar(btnAceptar)
    expect(opts.onAceptar).toHaveBeenCalledWith('Brasa')

    montado.teclado.nombreTemp = '   '
    pulsar(btnAceptar)
    expect(opts.onAceptar).toHaveBeenLastCalledWith('Tilo')
  })

  it('cancelar vuelve sin guardar', () => {
    const { escena, opts } = montado
    const textos = escena.add.text.mock.results.map((r) => r.value)
    pulsar(textos[textos.length - 1])
    expect(opts.onCancelar).toHaveBeenCalledTimes(1)
    expect(opts.onAceptar).not.toHaveBeenCalled()
  })
})
