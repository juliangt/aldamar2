// Texturas — pixel-art procedural del mundo en canvas 2D: carteles (poste,
// tablas, triángulos, cruz de candado), FX de pickups (moneda/objeto) y
// sprites de secretos (cuervo/abejas/gaviota/campanilla). Extraído de
// WorldScene; la lógica de colocación vive en mundo/carteles.js y la de
// señales en core/Carteles.js. Reciben la escena y solo usan `textures`.

import { partida } from '../../core/partida.js'

// Textura canvas con caché por clave: no se regenera si ya existe.
export function texturaCanvas(escena, clave, ancho, alto, dibujar) {
  if (escena.textures.exists(clave)) return clave
  const cv = document.createElement('canvas')
  cv.width = ancho
  cv.height = alto
  dibujar(cv.getContext('2d'))
  escena.textures.addCanvas(clave, cv)
  return clave
}

export function crearTexturasCarteles(escena) {
  texturaCanvas(escena, 'cartel:poste', 8, 16, (g) => dibujarPosteCartel(g, 16))
  for (const forma of ['izquierda', 'derecha', 'plana']) {
    const ancho = forma === 'plana' ? 58 : 66
    texturaCanvas(escena, `cartel:tabla:${forma}`, ancho, 12, (g) =>
      dibujarTablaCartel(g, forma, false)
    )
    texturaCanvas(escena, `cartel:tabla:${forma}:cerrada`, ancho, 12, (g) =>
      dibujarTablaCartel(g, forma, true)
    )
  }
  texturaCanvas(escena, 'cartel:tri:arriba', 7, 5, (g) => {
    g.fillStyle = '#3a2410'
    g.fillRect(3, 0, 1, 1)
    g.fillRect(2, 1, 3, 1)
    g.fillRect(1, 2, 5, 1)
    g.fillRect(0, 3, 7, 2)
  })
  texturaCanvas(escena, 'cartel:tri:abajo', 7, 5, (g) => {
    g.fillStyle = '#3a2410'
    g.fillRect(0, 0, 7, 2)
    g.fillRect(1, 2, 5, 1)
    g.fillRect(2, 3, 3, 1)
    g.fillRect(3, 4, 1, 1)
  })
  texturaCanvas(escena, 'cartel:cruz', 7, 7, (g) => {
    g.fillStyle = '#9a9a9a'
    for (let i = 0; i < 7; i++) {
      g.fillRect(i, i, 1, 1)
      g.fillRect(6 - i, i, 1, 1)
    }
  })
}

export function dibujarPosteCartel(g, alto) {
  g.fillStyle = '#3a2410'
  g.fillRect(0, 0, 8, alto)
  g.fillStyle = '#8a5a2a'
  g.fillRect(1, 1, 6, alto - 2)
  g.fillStyle = '#b07840'
  g.fillRect(2, 1, 2, alto - 2)
  g.fillStyle = '#3a2410'
  g.fillRect(1, 1, 6, 1)
  g.fillRect(1, alto - 3, 6, 1)
}

// Listón de madera con punta lateral escalonada; la variante cerrada usa
// madera apagada. `izquierda` reutiliza el dibujo espejado.
export function dibujarTablaCartel(g, forma, cerrada) {
  if (forma === 'izquierda') {
    g.translate(66, 0)
    g.scale(-1, 1)
  }
  const punta = forma !== 'plana'
  g.fillStyle = '#3a2410'
  g.fillRect(0, 0, 58, 12)
  if (punta) {
    g.fillRect(58, 1, 3, 10)
    g.fillRect(61, 2, 3, 8)
    g.fillRect(64, 3, 2, 6)
  }
  g.fillStyle = cerrada ? '#6a5646' : '#b07840'
  g.fillRect(1, 1, 56, 10)
  if (punta) {
    g.fillRect(58, 2, 2, 8)
    g.fillRect(61, 3, 2, 6)
    g.fillRect(64, 4, 1, 4)
  }
  g.fillStyle = cerrada ? '#7c6a58' : '#c89058'
  g.fillRect(1, 1, 56, 2)
  g.fillStyle = '#8a6034'
  g.fillRect(10, 5, 6, 1)
  g.fillRect(32, 8, 8, 1)
}

// Texturas pixel generadas (2 frames): brillos de objetos/monedas.
export function crearTexturasFx(escena) {
  texturaCanvas(escena, 'fx:moneda', 16, 8, (g) => {
    for (const [f, c, brillo] of [
      [0, '#b8922e', '#e0c04a'],
      [1, '#e0c04a', '#fff2b0'],
    ]) {
      g.fillStyle = c
      g.beginPath()
      g.arc(f * 8 + 4, 4, 3, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = brillo
      g.fillRect(f * 8 + 3, 2, 1, 2)
    }
  })
  texturaCanvas(escena, 'fx:objeto', 16, 8, (g) => {
    for (const f of [0, 1]) {
      g.fillStyle = '#8a5a2a'
      g.fillRect(f * 8 + 2, 2, 5, 5)
      g.fillStyle = '#b07840'
      g.fillRect(f * 8 + 2, 2, 5, 2)
      if (f) {
        g.fillStyle = '#ffffff'
        g.fillRect(f * 8 + 6, 1, 1, 1)
      }
    }
  })
}

// Sprite del secreto activo; el detalle varía por la semilla de la partida.
export function texturaSecreto(escena, tipo) {
  const clave = `secreto:${tipo}`
  if (escena.textures.exists(clave)) return clave
  return texturaCanvas(escena, clave, 16, 16, (g) => {
    if (tipo === 'cuervo') {
      g.fillStyle = '#181822'
      g.fillRect(5, 5, 6, 6)
      g.fillRect(7, 2, 4, 4)
      g.fillRect(11, 4, 3, 2)
      g.fillRect(3, 7, 4, 4)
      g.fillRect(6, 11, 2, 3)
      g.fillStyle = partida.semilla === 42 ? '#ffffff' : '#e0c04a'
      g.fillRect(9, 3, 1, 1)
    } else if (tipo === 'abejas') {
      g.fillStyle = partida.semilla === 20 ? '#ffe080' : '#d8a020'
      g.fillRect(5, 6, 6, 5)
      g.fillStyle = '#111111'
      g.fillRect(7, 6, 2, 5)
      g.fillStyle = '#e8f0ff'
      g.fillRect(4, 3, 4, 3)
      g.fillRect(8, 3, 4, 3)
    } else if (tipo === 'gaviota') {
      g.fillStyle = '#f0f4f8'
      g.fillRect(4, 5, 8, 5)
      g.fillRect(8, 2, 4, 4)
      g.fillStyle = '#708090'
      g.fillRect(2, 7, 5, 3)
      g.fillStyle = '#e0a020'
      g.fillRect(12, 4, 3, 2)
      g.fillStyle = partida.semilla === 40 ? '#00e0ff' : '#111111'
      g.fillRect(10, 3, 1, 1)
    } else if (tipo === 'campanilla') {
      g.fillStyle = partida.semilla === 100 ? '#f0d060' : '#a87830'
      g.fillRect(6, 4, 4, 3)
      g.fillRect(4, 7, 8, 6)
      g.fillRect(3, 12, 10, 2)
      g.fillStyle = '#4a2a10'
      g.fillRect(7, 13, 2, 2)
    }
  })
}
