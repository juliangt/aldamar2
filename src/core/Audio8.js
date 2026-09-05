// Audio8 — audio 8-bit sintetizado con WebAudio (cero assets externos, D7 de la spec).
// Incluye jingle, set completo de SFX, volumen maestro, mute y pads ambientales por bioma.

const CLAVE_VOLUMEN = 'aldamar:audio:volumen'
const CLAVE_MUTE = 'aldamar:audio:mute'

export const BIOMAS_PADS = {
  huerto: [220.0, 277.18, 329.63], // La3 Mayor (cálido, pastoral)
  camino: [196.0, 246.94, 293.66], // Sol3 Mayor (abierto)
  bosque: [164.81, 196.0, 246.94], // Mi3 Menor (sombrío)
  aldea: [261.63, 329.63, 392.0], // Do4 Mayor (sereno, piedra)
  mina: [110.0, 146.83, 164.81], // La2 + 4ª/5ª baja (cavernoso)
  cienaga: [138.59, 164.81, 207.65], // Do#3 Menor/tritono (lánguido)
  costa: [220.0, 293.66, 369.99], // Re4 sus2 (marino, salino)
  yermos: [110.0, 164.81, 220.0], // La2 quinta hueca (desolado)
  aguja: [329.63, 493.88, 659.25], // Mi4 quinta etérea alta (frío)
}

export function obtenerBioma(lugarId) {
  const mapaBiomas = {
    vegaverde: 'huerto', ejido: 'huerto', colmenar: 'huerto', lavadero: 'huerto',
    molino: 'camino', puente: 'camino', vado: 'camino', calzada: 'camino', encrucijada: 'camino',
    bosque: 'bosque',
    rioclaro: 'aldea', valoria: 'aldea',
    minas: 'mina', barrok: 'mina',
    cienagas: 'cienaga',
    faro: 'costa', esteros: 'costa', cauce: 'costa', salinas: 'costa', casa_sal: 'costa', salina_vieja: 'costa',
    yerma: 'yermos', umbak: 'yermos', tejera: 'yermos',
    aguja: 'aguja', aguja_pies: 'aguja', aguja_cima: 'aguja', refugio: 'aguja',
  }
  return mapaBiomas[lugarId] || 'camino'
}

export class Audio8 {
  constructor() {
    this.ctx = null
    this.masterGain = null
    this.padGain = null
    this.padOsciladores = []
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

  // ------------------------------------------------------------ Ambiente por bioma
  iniciarAmbiente(bioma) {
    if (this.biomaActual === bioma && this.padOsciladores.length > 0) return
    this.biomaActual = bioma

    const ctx = this.ensure()
    if (!ctx) return

    this.detenerAmbiente(true)

    const frecuencias = BIOMAS_PADS[bioma] || BIOMAS_PADS.camino
    const t = ctx.currentTime

    this.padGain = ctx.createGain()
    this.padGain.gain.setValueAtTime(0.0001, t)
    // Fade in sutil a volumen muy bajo (~0.025)
    this.padGain.gain.linearRampToValueAtTime(0.025, t + 1.2)
    this.padGain.connect(this.masterGain || ctx.destination)

    this.padOsciladores = frecuencias.map((freq) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      osc.connect(this.padGain)
      osc.start(t)
      return osc
    })
  }

  detenerAmbiente(suave = true) {
    if (!this.padGain || this.padOsciladores.length === 0) return
    const ctx = this.ensure()
    if (!ctx) return

    const t = ctx.currentTime
    const oscs = this.padOsciladores
    const gain = this.padGain
    this.padOsciladores = []
    this.padGain = null

    if (suave) {
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(gain.gain.value, t)
      gain.gain.linearRampToValueAtTime(0.0001, t + 0.8)
      setTimeout(() => {
        for (const o of oscs) {
          try { o.stop(); o.disconnect() } catch {}
        }
        try { gain.disconnect() } catch {}
      }, 900)
    } else {
      for (const o of oscs) {
        try { o.stop(); o.disconnect() } catch {}
      }
      try { gain.disconnect() } catch {}
    }
  }
}

// Jingle oficial (~2 s, onda cuadrada): La menor ascendente y caída.
export const JINGLE = [
  { f: 220.0, d: 0.14, t: 0.0 }, // La3
  { f: 261.6, d: 0.14, t: 0.16 }, // Do4
  { f: 329.6, d: 0.14, t: 0.32 }, // Mi4
  { f: 440.0, d: 0.22, t: 0.48 }, // La4
  { f: 392.0, d: 0.14, t: 0.74 }, // Sol4
  { f: 329.6, d: 0.14, t: 0.9 }, // Mi4
  { f: 261.6, d: 0.14, t: 1.06 }, // Do4
  { f: 220.0, d: 0.5, t: 1.22 }, // La3
]
export const DURACION_JINGLE = 2.0

export const audio8 = new Audio8()
export default audio8
