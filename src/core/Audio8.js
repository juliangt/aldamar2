// Audio8 — audio 8-bit sintetizado con WebAudio (cero assets externos, D7 de la spec).
// Incluye jingle, set completo de SFX, volumen maestro, mute y pads ambientales por bioma.
// Las partituras y mapeos musicales viven en Temas.js (dato puro, testeable aparte).

import { NOTAS_FREQ, TEMAS_MEDIEVALES, JINGLE } from './Temas.js'

// Re-exportaciones de compatibilidad: los datos musicales siguen siendo
// accesibles desde Audio8 para quienes ya los importaban de aquí.
export { NOTAS_FREQ, TEMAS_MEDIEVALES, BIOMAS_PADS, obtenerBioma, JINGLE, DURACION_JINGLE } from './Temas.js'

const CLAVE_VOLUMEN = 'aldamar:audio:volumen'
const CLAVE_MUTE = 'aldamar:audio:mute'

export class Audio8 {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.musicaGain = null
    this.padGain = null
    this.padOsciladores = []
    this.musicaTimer = null
    this.pasoMusica = 0
    this.tiempoProximoPaso = 0
    this.temaActual = null
    this.biomaActual = null

    // Cargar preferencias guardadas
    this.volumenMaster = 0.8
    this.mute = false
    try {
      if (typeof localStorage !== 'undefined') {
        const v = localStorage.getItem(CLAVE_VOLUMEN)
        if (v !== null) this.volumenMaster = Math.max(0, Math.min(1, parseFloat(v) || 0))
        const m = localStorage.getItem(CLAVE_MUTE)
        if (m !== null) this.mute = m === '1' || m === 'true'
      }
    } catch {
      // Entornos restringidos
    }

    this._desbloquear = this._desbloquear.bind(this)
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this._desbloquear, { once: true })
      window.addEventListener('keydown', this._desbloquear, { once: true })
    }
  }

  _desbloquear() {
    this.ensure()
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
    if (this.biomaActual) {
      this.iniciarAmbiente(this.biomaActual)
    }
  }

  ensure() {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) {
        this.ctx = new Ctx()
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(
          this.mute ? 0 : this.volumenMaster,
          this.ctx.currentTime
        )
        this.masterGain.connect(this.ctx.destination)
      }
    }
    return this.ctx
  }

  setVolumen(v) {
    this.volumenMaster = Math.max(0, Math.min(1, v))
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLAVE_VOLUMEN, this.volumenMaster.toFixed(2))
      }
    } catch {}
    this._actualizarGananciaMaster()
  }

  setMute(m) {
    this.mute = !!m
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLAVE_MUTE, this.mute ? '1' : '0')
      }
    } catch {}
    this._actualizarGananciaMaster()
  }

  toggleMute() {
    this.setMute(!this.mute)
    return this.mute
  }

  _actualizarGananciaMaster() {
    if (this.ctx && this.masterGain) {
      const t = this.ctx.currentTime
      const destino = this.mute ? 0 : this.volumenMaster
      this.masterGain.gain.cancelScheduledValues(t)
      this.masterGain.gain.linearRampToValueAtTime(destino, t + 0.05)
    }
  }

  // Una nota individual conectada al masterGain
  nota(freq, dur = 0.15, vol = 0.15, cuando = 0, tipo = 'square') {
    const ctx = this.ensure()
    if (!ctx || ctx.state !== 'running' || this.mute || this.volumenMaster <= 0) return
    const t = ctx.currentTime + cuando
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tipo
    osc.frequency.value = freq

    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.01)
    gain.gain.setValueAtTime(vol, t + dur * 0.7)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    osc.connect(gain)
    gain.connect(this.masterGain || ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // Secuencia de notas [{f, d, t, tipo}]
  secuencia(notas, vol = 0.15) {
    for (const n of notas) {
      this.nota(n.f, n.d, vol ?? 0.15, n.t || 0, n.tipo || 'square')
    }
  }

  // Jingle oficial (~2 s, onda cuadrada) del sello
  jingle(vol = 0.12) {
    this.secuencia(JINGLE, vol)
  }

  // ------------------------------------------------------------ Set de SFX
  sfx(nombre) {
    const ctx = this.ensure()
    if (!ctx || ctx.state !== 'running' || this.mute || this.volumenMaster <= 0) return

    switch (nombre) {
      case 'dialogo':
        // Tick suave para máquina de escribir (~0.02s)
        this.nota(480, 0.02, 0.03, 0, 'triangle')
        break

      case 'confirmar':
        // Pitido ascendente de confirmación (440 -> 660 Hz)
        this.secuencia([
          { f: 440, d: 0.04, t: 0.0, tipo: 'square' },
          { f: 660, d: 0.07, t: 0.04, tipo: 'square' },
        ], 0.1)
        break

      case 'moneda':
        // Campanilleo de moneda clásico (B5 -> E6)
        this.secuencia([
          { f: 987.77, d: 0.06, t: 0.0, tipo: 'square' },
          { f: 1318.51, d: 0.14, t: 0.06, tipo: 'square' },
        ], 0.12)
        break

      case 'golpe':
        // Impacto de ataque rápido descendente
        this.sweep(180, 60, 0.1, 0.18, 'sawtooth')
        break

      case 'dano':
        // Daño recibido, golpe sordo y punzante
        this.sweep(140, 45, 0.18, 0.22, 'triangle')
        break

      case 'curacion':
        // Arpegio ascendente armónico (C5 -> E5 -> G5 -> C6)
        this.secuencia([
          { f: 523.25, d: 0.07, t: 0.0, tipo: 'triangle' },
          { f: 659.25, d: 0.07, t: 0.06, tipo: 'triangle' },
          { f: 783.99, d: 0.07, t: 0.12, tipo: 'triangle' },
          { f: 1046.5, d: 0.15, t: 0.18, tipo: 'triangle' },
        ], 0.15)
        break

      case 'nivel':
        // Subida de nivel: fanfarria de 4 notas brillantes
        this.secuencia([
          { f: 329.63, d: 0.08, t: 0.0, tipo: 'square' },
          { f: 440.0, d: 0.08, t: 0.08, tipo: 'square' },
          { f: 554.37, d: 0.08, t: 0.16, tipo: 'square' },
          { f: 659.25, d: 0.25, t: 0.24, tipo: 'square' },
        ], 0.16)
        break

      case 'victoria':
        // Victoria en combate
        this.secuencia([
          { f: 440.0, d: 0.1, t: 0.0, tipo: 'square' },
          { f: 554.37, d: 0.1, t: 0.1, tipo: 'square' },
          { f: 659.25, d: 0.1, t: 0.2, tipo: 'square' },
          { f: 880.0, d: 0.28, t: 0.3, tipo: 'square' },
        ], 0.15)
        break

      case 'derrota':
        // Derrota lúgubre descendente
        this.secuencia([
          { f: 220.0, d: 0.18, t: 0.0, tipo: 'triangle' },
          { f: 196.0, d: 0.18, t: 0.16, tipo: 'triangle' },
          { f: 174.61, d: 0.2, t: 0.32, tipo: 'triangle' },
          { f: 146.83, d: 0.45, t: 0.48, tipo: 'triangle' },
        ], 0.18)
        break

      case 'secreto':
        // Revelación de secreto (trino místico)
        this.secuencia([
          { f: 783.99, d: 0.09, t: 0.0, tipo: 'sine' },
          { f: 1174.66, d: 0.09, t: 0.08, tipo: 'sine' },
          { f: 1567.98, d: 0.22, t: 0.16, tipo: 'sine' },
        ], 0.14)
        break
    }
  }

  // Frecuencia sweep lineal (golpes/impactos)
  sweep(fIni, fFin, dur = 0.1, vol = 0.15, tipo = 'sawtooth') {
    const ctx = this.ensure()
    if (!ctx || ctx.state !== 'running' || this.mute || this.volumenMaster <= 0) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(fIni, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, fFin), t + dur)

    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)

    osc.connect(gain)
    gain.connect(this.masterGain || ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // ------------------------------------------------------------ Música medieval por bioma
  _tocarNota(freq, t, dur, vol = 0.08, tipo = 'triangle', decay = false) {
    if (!freq || freq <= 0 || !this.ctx || !this.musicaGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = tipo
    osc.frequency.setValueAtTime(freq, t)

    if (decay) {
      // Envolvente de pulsación/punteo de cuerda (Laúd / Bourdon / Bajo)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.006)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    } else {
      // Envolvente de instrumento de viento (Flauta / Pífano)
      const atk = Math.min(0.025, dur * 0.25)
      const rel = Math.min(0.045, dur * 0.25)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.linearRampToValueAtTime(vol, t + atk)
      gain.gain.setValueAtTime(vol, t + dur - rel)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    }

    osc.connect(gain)
    gain.connect(this.musicaGain)
    osc.start(t)
    osc.stop(t + dur + 0.02)
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect() } catch {}
    }
  }

  _tocarTabor(t, vol = 0.05) {
    if (!this.ctx || !this.musicaGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(115, t)
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.06)

    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075)

    osc.connect(gain)
    gain.connect(this.musicaGain)
    osc.start(t)
    osc.stop(t + 0.08)
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect() } catch {}
    }
  }

  _tocarChasquido(t, vol = 0.018) {
    if (!this.ctx || !this.musicaGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1300, t)
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.016)

    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022)

    osc.connect(gain)
    gain.connect(this.musicaGain)
    osc.start(t)
    osc.stop(t + 0.025)
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect() } catch {}
    }
  }

  _tickMusica() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicaGain) return
    const tema = this.temaActual
    if (!tema) return

    // Resincronizar si hubo pausa o suspensión del AudioContext
    if (this.tiempoProximoPaso < this.ctx.currentTime) {
      this.tiempoProximoPaso = this.ctx.currentTime + 0.05
    }

    // Programar notas hasta 250ms por adelantado (WebAudio lookahead)
    while (this.tiempoProximoPaso < this.ctx.currentTime + 0.25) {
      const s = this.pasoMusica % tema.longitud
      const t = this.tiempoProximoPaso

      // 1. Percusión rítmica medieval
      if (typeof tema.perc === 'function') {
        const p = tema.perc(s)
        if (p === 'tabor') this._tocarTabor(t, 0.055)
        else if (p === 'tabor_suave') this._tocarTabor(t, 0.032)
        else if (p === 'tap') this._tocarChasquido(t, 0.018)
      }

      // 2. Bajo punteado / Bourdon
      const nBajo = tema.bajo[s]
      if (nBajo && nBajo !== '_') {
        const freq = NOTAS_FREQ[nBajo]
        if (freq) this._tocarNota(freq, t, tema.stepSec * 2.0, 0.085, 'triangle', true)
      }

      // 3. Laúd / Cítola arpegiada
      const nLaud = tema.laud[s]
      if (nLaud && nLaud !== '_') {
        const freq = NOTAS_FREQ[nLaud]
        if (freq) this._tocarNota(freq, t, tema.stepSec * 1.5, 0.07, 'triangle', true)
      }

      // 4. Flauta / Pífano melódico
      const notasFlauta = tema.flautaPorPaso ? tema.flautaPorPaso[s] : null
      if (notasFlauta) {
        for (const f of notasFlauta) {
          const freq = NOTAS_FREQ[f.n]
          if (freq) this._tocarNota(freq, t, f.d * tema.stepSec, 0.085, 'triangle', false)
        }
      }

      this.tiempoProximoPaso += tema.stepSec
      this.pasoMusica++
    }
  }

  iniciarAmbiente(bioma) {
    if (this.biomaActual === bioma && this.musicaTimer) return
    this.biomaActual = bioma

    const ctx = this.ensure()
    if (!ctx) return

    this.detenerAmbiente(true)

    const tema = TEMAS_MEDIEVALES[bioma] || TEMAS_MEDIEVALES.camino
    this.temaActual = tema
    this.pasoMusica = 0
    this.tiempoProximoPaso = ctx.currentTime + 0.05

    const t = ctx.currentTime
    this.musicaGain = ctx.createGain()
    this.padGain = this.musicaGain // Alias de retrocompatibilidad
    this.musicaGain.gain.setValueAtTime(0.0001, t)
    // Fade in suave a nivel equilibrado
    this.musicaGain.gain.linearRampToValueAtTime(0.2, t + 0.8)
    this.musicaGain.connect(this.masterGain || ctx.destination)

    this.musicaTimer = setInterval(() => this._tickMusica(), 35)
    this._tickMusica()
  }

  detenerAmbiente(suave = true) {
    if (this.musicaTimer) {
      clearInterval(this.musicaTimer)
      this.musicaTimer = null
    }
    this.pasoMusica = 0
    this.padOsciladores = []

    if (!this.musicaGain) return
    const gain = this.musicaGain
    this.musicaGain = null
    this.padGain = null

    const ctx = this.ensure()
    if (!ctx) return

    const t = ctx.currentTime
    if (suave) {
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(gain.gain.value, t)
      gain.gain.linearRampToValueAtTime(0.0001, t + 0.5)
      setTimeout(() => {
        try { gain.disconnect() } catch {}
      }, 550)
    } else {
      try { gain.disconnect() } catch {}
    }
  }
}

export const audio8 = new Audio8()
export default audio8
