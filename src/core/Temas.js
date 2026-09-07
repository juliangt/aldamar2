// Temas — partituras y mapeos musicales del juego (dato puro, sin WebAudio).
// Extraído de Audio8.js para poder testear los datos de las partituras
// directamente. La síntesis vive en Audio8.js.

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
