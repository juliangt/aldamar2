// Audio8 — notas 8-bit sintetizadas con WebAudio (onda cuadrada + envolvente).
// Cero assets de audio (D7 de la spec).

export class Audio8 {
  constructor() {
    this.ctx = null
    this._desbloquear = this._desbloquear.bind(this)
    window.addEventListener('pointerdown', this._desbloquear, { once: true })
    window.addEventListener('keydown', this._desbloquear, { once: true })
  }

  _desbloquear() {
    this.ensure()
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume()
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) this.ctx = new Ctx()
    }
    return this.ctx
  }

  // Una nota: freq en Hz, dur en s, vol 0..1, tipo de onda.
  nota(freq, dur = 0.15, vol = 0.15, cuando = 0, tipo = 'square') {
    const ctx = this.ensure()
    if (!ctx || ctx.state !== 'running') return
    const t = ctx.currentTime + cuando
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tipo
    osc.frequency.value = freq
    // Envolvente: ataque corto, caída para evitar chasquidos.
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.01)
    gain.gain.setValueAtTime(vol, t + dur * 0.7)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  // Secuencia de notas [{f, d, t}] para melodías.
  secuencia(notas, vol = 0.15) {
    for (const n of notas) this.nota(n.f, n.d, vol ?? 0.15, n.t || 0)
  }
}

export const audio8 = new Audio8()
export default audio8
