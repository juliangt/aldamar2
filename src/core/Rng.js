// Rng — generador determinista mulberry32 sembrado por partida.

export class Rng {
  constructor(semilla) {
    this._seed =
      (typeof semilla === 'number' ? semilla : Rng.semillaDe(semilla)) >>> 0
    this._estado = this._seed
  }

  static semillaDe(texto) {
    let h = 2166136261
    for (let i = 0; i < String(texto).length; i++) {
      h ^= String(texto).charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    return h >>> 0
  }

  get seed() {
    return this._seed
  }

  // Float en [0, 1).
  next() {
    this._estado = (this._estado + 0x6d2b79f5) >>> 0
    let t = this._estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  // Entero en [0, n).
  int(n) {
    return Math.floor(this.next() * n)
  }

  // Cierto con probabilidad p (0..1).
  chance(p) {
    return this.next() < p
  }

  // Elemento aleatorio de arr (null si está vacío).
  pick(arr) {
    if (!arr || arr.length === 0) return null
    return arr[this.int(arr.length)]
  }
}

export default Rng
