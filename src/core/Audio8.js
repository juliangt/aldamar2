// Audio8 — audio 8-bit sintetizado con WebAudio (cero assets externos, D7 de la spec).
// Incluye jingle, set completo de SFX, volumen maestro, mute y pads ambientales por bioma.

const CLAVE_VOLUMEN = 'aldamar:audio:volumen'
const CLAVE_MUTE = 'aldamar:audio:mute'

// Frecuencias para la síntesis musical medieval
export const NOTAS_FREQ = {
  A1: 55.00, Bb1: 58.27, B1: 61.74,
  C2: 65.41, 'C#2': 69.30, D2: 73.42, 'Eb2': 77.78, E2: 82.41, F2: 87.31, 'F#2': 92.50, G2: 98.00, 'G#2': 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, 'C#3': 138.59, D3: 146.83, 'Eb3': 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.00, G3: 196.00, 'G#3': 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'Eb4': 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00, 'G#4': 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'Eb5': 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.00,
  _: 0,
}

// ------------------------------------------------------------ Temas medievales por bioma
// 1. Aldea / Camino / Huerto: Danza de la Comarca (6/8 vivaz en Re Dórico)
const TEMA_ALDEA = {
  nombre: 'comarca',
  stepSec: 0.165, // ~120 BPM en 6/8
  longitud: 48,
  laud: [
    'D3', 'F3', 'A3', 'D3', 'A3', 'F3',
    'C3', 'E3', 'G3', 'C3', 'G3', 'E3',
    'D3', 'F3', 'A3', 'D3', 'A3', 'F3',
    'A2', 'E3', 'A3', 'A2', 'C4', 'A3',
    'F3', 'A3', 'C4', 'F3', 'C4', 'A3',
    'G3', 'B3', 'D4', 'G3', 'D4', 'B3',
    'A2', 'E3', 'A3', 'A2', 'E3', 'A3',
    'D3', 'F3', 'A3', 'D3', 'A3', 'D3',
  ],
  bajo: [
    'D2', '_', '_', 'A2', '_', '_',
    'C2', '_', '_', 'G2', '_', '_',
    'D2', '_', '_', 'A2', '_', '_',
    'A2', '_', '_', 'E2', '_', '_',
    'F2', '_', '_', 'C3', '_', '_',
    'G2', '_', '_', 'D3', '_', '_',
    'A2', '_', '_', 'E2', '_', '_',
    'D2', '_', '_', 'A2', '_', '_',
  ],
  flauta: [
    { s: 0, n: 'D4', d: 2 }, { s: 2, n: 'E4', d: 1 }, { s: 3, n: 'F4', d: 2 }, { s: 5, n: 'G4', d: 1 },
    { s: 6, n: 'A4', d: 3 }, { s: 9, n: 'G4', d: 1 }, { s: 10, n: 'E4', d: 2 },
    { s: 12, n: 'F4', d: 2 }, { s: 14, n: 'G4', d: 1 }, { s: 15, n: 'A4', d: 2 }, { s: 17, n: 'C5', d: 1 },
    { s: 18, n: 'D5', d: 3 }, { s: 21, n: 'C5', d: 1 }, { s: 22, n: 'A4', d: 2 },
    { s: 24, n: 'C5', d: 2 }, { s: 26, n: 'D5', d: 1 }, { s: 27, n: 'C5', d: 2 }, { s: 29, n: 'A4', d: 1 },
    { s: 30, n: 'G4', d: 2 }, { s: 32, n: 'A4', d: 1 }, { s: 33, n: 'B4', d: 2 }, { s: 35, n: 'G4', d: 1 },
    { s: 36, n: 'A4', d: 3 }, { s: 39, n: 'F4', d: 1 }, { s: 40, n: 'E4', d: 2 },
    { s: 42, n: 'D4', d: 5 },
  ],
  perc: (s) => (s % 6 === 0 ? 'tabor' : s % 6 === 3 ? 'tabor_suave' : (s % 6 === 2 || s % 6 === 5) ? 'tap' : null),
}

// 2. Bosque: Balada de los Robles (3/4 místico en La Menor)
const TEMA_BOSQUE = {
  nombre: 'bosque',
  stepSec: 0.22, // ~90 BPM
  longitud: 48,
  laud: [
    'A2', 'C3', 'E3', 'A3', 'E3', 'C3',
    'E2', 'B2', 'E3', 'G3', 'E3', 'B2',
    'F2', 'A2', 'C3', 'F3', 'C3', 'A2',
    'C3', 'E3', 'G3', 'C4', 'G3', 'E3',
    'D3', 'F3', 'A3', 'D4', 'A3', 'F3',
    'A2', 'C3', 'E3', 'A3', 'E3', 'C3',
    'E2', 'B2', 'E3', 'G#3', 'E3', 'B2',
    'A2', 'E3', 'A3', 'C4', 'A3', 'E3',
  ],
  bajo: [
    'A2', '_', '_', '_', '_', '_',
    'E2', '_', '_', '_', '_', '_',
    'F2', '_', '_', '_', '_', '_',
    'C2', '_', '_', '_', '_', '_',
    'D2', '_', '_', '_', '_', '_',
    'A2', '_', '_', '_', '_', '_',
    'E2', '_', '_', '_', '_', '_',
    'A2', '_', '_', '_', '_', '_',
  ],
  flauta: [
    { s: 0, n: 'E4', d: 3 }, { s: 3, n: 'A4', d: 3 },
    { s: 6, n: 'B4', d: 2 }, { s: 8, n: 'C5', d: 2 }, { s: 10, n: 'B4', d: 2 },
    { s: 12, n: 'A4', d: 3 }, { s: 15, n: 'F4', d: 3 },
    { s: 18, n: 'G4', d: 4 },
    { s: 24, n: 'A4', d: 2 }, { s: 26, n: 'B4', d: 2 }, { s: 28, n: 'C5', d: 2 },
    { s: 30, n: 'D5', d: 3 }, { s: 33, n: 'E5', d: 3 },
    { s: 36, n: 'B4', d: 3 }, { s: 39, n: 'C5', d: 2 }, { s: 41, n: 'B4', d: 1 },
    { s: 42, n: 'A4', d: 5 },
  ],
  perc: (s) => (s % 6 === 0 ? 'tabor_suave' : null),
}

// 3. Costa: Ronda de las Salinas (6/8 marinero en Sol Mixolidio)
const TEMA_COSTA = {
  nombre: 'costa',
  stepSec: 0.155, // ~128 BPM
  longitud: 48,
  laud: [
    'G3', 'B3', 'D4', 'G3', 'D4', 'B3',
    'F3', 'A3', 'C4', 'F3', 'C4', 'A3',
    'G3', 'B3', 'D4', 'G3', 'D4', 'B3',
    'D3', 'F3', 'A3', 'D3', 'A3', 'F3',
    'C3', 'E3', 'G3', 'C4', 'G3', 'E3',
    'G3', 'B3', 'D4', 'G3', 'D4', 'B3',
    'F3', 'A3', 'C4', 'D3', 'F3', 'A3',
    'G3', 'B3', 'D4', 'G3', 'D4', 'G3',
  ],
  bajo: [
    'G2', '_', '_', 'D3', '_', '_',
    'F2', '_', '_', 'C3', '_', '_',
    'G2', '_', '_', 'D3', '_', '_',
    'D2', '_', '_', 'A2', '_', '_',
    'C2', '_', '_', 'G2', '_', '_',
    'G2', '_', '_', 'D3', '_', '_',
    'F2', '_', '_', 'D2', '_', '_',
    'G2', '_', '_', 'D3', '_', '_',
  ],
  flauta: [
    { s: 0, n: 'G4', d: 2 }, { s: 2, n: 'A4', d: 1 }, { s: 3, n: 'B4', d: 2 }, { s: 5, n: 'D5', d: 1 },
    { s: 6, n: 'C5', d: 2 }, { s: 8, n: 'B4', d: 1 }, { s: 9, n: 'A4', d: 3 },
    { s: 12, n: 'B4', d: 2 }, { s: 14, n: 'C5', d: 1 }, { s: 15, n: 'D5', d: 2 }, { s: 17, n: 'F5', d: 1 },
    { s: 18, n: 'G5', d: 3 }, { s: 21, n: 'D5', d: 3 },
    { s: 24, n: 'F5', d: 2 }, { s: 26, n: 'E5', d: 1 }, { s: 27, n: 'D5', d: 2 }, { s: 29, n: 'B4', d: 1 },
    { s: 30, n: 'C5', d: 2 }, { s: 32, n: 'D5', d: 1 }, { s: 33, n: 'B4', d: 3 },
    { s: 36, n: 'A4', d: 2 }, { s: 38, n: 'B4', d: 1 }, { s: 39, n: 'A4', d: 2 }, { s: 41, n: 'F4', d: 1 },
    { s: 42, n: 'G4', d: 5 },
  ],
  perc: (s) => (s % 6 === 0 ? 'tabor' : s % 6 === 3 ? 'tap' : (s % 6 === 1 || s % 6 === 4) ? 'tap' : null),
}

// 4. Mina / Ciénaga: Ecos de las Galerías (4/4 cadencia subterránea en Re Menor)
const TEMA_MINA = {
  nombre: 'mina',
  stepSec: 0.19, // ~78 BPM
  longitud: 32,
  laud: [
    'D3', '_', 'F3', 'A3', '_', 'F3', 'D3', '_',
    'A2', '_', 'E3', 'A3', '_', 'E3', 'A2', '_',
    'Bb2', '_', 'D3', 'F3', '_', 'D3', 'Bb2', '_',
    'A2', '_', 'C#3', 'E3', '_', 'E3', 'A2', '_',
  ],
  bajo: [
    'D2', '_', '_', '_', 'A2', '_', '_', '_',
    'A1', '_', '_', '_', 'E2', '_', '_', '_',
    'Bb1', '_', '_', '_', 'F2', '_', '_', '_',
    'A1', '_', '_', '_', 'E2', '_', '_', '_',
  ],
  flauta: [
    { s: 0, n: 'D4', d: 3 }, { s: 3, n: 'F4', d: 2 }, { s: 5, n: 'E4', d: 3 },
    { s: 8, n: 'D4', d: 4 }, { s: 12, n: 'A3', d: 4 },
    { s: 16, n: 'Bb4', d: 3 }, { s: 19, n: 'A4', d: 2 }, { s: 21, n: 'G4', d: 3 },
    { s: 24, n: 'F4', d: 2 }, { s: 26, n: 'E4', d: 2 }, { s: 28, n: 'D4', d: 4 },
  ],
  perc: (s) => (s % 8 === 0 ? 'tabor' : s % 8 === 4 ? 'tabor_suave' : s % 8 === 6 ? 'tap' : null),
}

// 5. Yermos / Aguja: Lamento de la Atalaya (3/4 solemne en Mi Menor)
const TEMA_YERMOS = {
  nombre: 'yermos',
  stepSec: 0.23, // ~85 BPM
  longitud: 48,
  laud: [
    'E2', 'B2', 'E3', 'B3', 'E3', 'B2',
    'D2', 'A2', 'D3', 'A3', 'D3', 'A2',
    'C2', 'G2', 'C3', 'G3', 'C3', 'G2',
    'B1', 'F#2', 'B2', 'F#3', 'B2', 'F#2',
    'C2', 'G2', 'C3', 'G3', 'C3', 'G2',
    'D2', 'A2', 'D3', 'A3', 'D3', 'A2',
    'B1', 'F#2', 'B2', 'F#3', 'B2', 'F#2',
    'E2', 'B2', 'E3', 'G3', 'E3', 'B2',
  ],
  bajo: [
    'E2', '_', '_', '_', '_', '_',
    'D2', '_', '_', '_', '_', '_',
    'C2', '_', '_', '_', '_', '_',
    'B1', '_', '_', '_', '_', '_',
    'C2', '_', '_', '_', '_', '_',
    'D2', '_', '_', '_', '_', '_',
    'B1', '_', '_', '_', '_', '_',
    'E2', '_', '_', '_', '_', '_',
  ],
  flauta: [
    { s: 0, n: 'E4', d: 3 }, { s: 3, n: 'G4', d: 3 },
    { s: 6, n: 'B4', d: 4 }, { s: 10, n: 'A4', d: 2 },
    { s: 12, n: 'G4', d: 3 }, { s: 15, n: 'F#4', d: 3 },
    { s: 18, n: 'E4', d: 5 },
    { s: 24, n: 'G4', d: 2 }, { s: 26, n: 'A4', d: 2 }, { s: 28, n: 'B4', d: 2 },
    { s: 30, n: 'D5', d: 3 }, { s: 33, n: 'B4', d: 3 },
    { s: 36, n: 'A4', d: 2 }, { s: 38, n: 'B4', d: 1 }, { s: 39, n: 'G4', d: 3 },
    { s: 42, n: 'E4', d: 5 },
  ],
  perc: (s) => (s % 6 === 0 ? 'tabor_suave' : null),
}

function prepararTema(tema) {
  const porPaso = {}
  for (const f of tema.flauta) {
    if (!porPaso[f.s]) porPaso[f.s] = []
    porPaso[f.s].push(f)
  }
  tema.flautaPorPaso = porPaso
  return tema
}

export const TEMAS_MEDIEVALES = {
  huerto: prepararTema(TEMA_ALDEA),
  camino: prepararTema(TEMA_ALDEA),
  aldea: prepararTema(TEMA_ALDEA),
  bosque: prepararTema(TEMA_BOSQUE),
  costa: prepararTema(TEMA_COSTA),
  mina: prepararTema(TEMA_MINA),
  cienaga: prepararTema(TEMA_MINA),
  yermos: prepararTema(TEMA_YERMOS),
  aguja: prepararTema(TEMA_YERMOS),
}

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
