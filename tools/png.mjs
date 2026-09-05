// png.mjs — codificador PNG mínimo (RGBA, sin dependencias) para los
// generadores de assets de tools/.

import zlib from 'node:zlib'
import fs from 'node:fs'

const TABLA_CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, datos) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(datos.length)
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(cuerpo))
  return Buffer.concat([len, cuerpo, crc])
}

// rgba: Uint8Array de ancho*alto*4
export function escribirPng(ruta, ancho, alto, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // profundidad de bit
  ihdr[9] = 6 // color RGBA
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) {
    crudo[y * (ancho * 4 + 1)] = 0 // filtro: none
    Buffer.from(rgba.buffer, y * ancho * 4, ancho * 4).copy(
      crudo,
      y * (ancho * 4 + 1) + 1
    )
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(crudo, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(ruta, png)
  console.log(`png → ${ruta} (${ancho}×${alto})`)
}

// Lienzo relleno con un color hex '#rrggbb' (alfa 255).
export function lienzo(ancho, alto, hex = '#000000', alfa = 255) {
  const buf = new Uint8Array(ancho * alto * 4)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  for (let i = 0; i < ancho * alto; i++) {
    buf[i * 4] = r
    buf[i * 4 + 1] = g
    buf[i * 4 + 2] = b
    buf[i * 4 + 3] = alfa
  }
  return buf
}

export function px(l, ancho, x, y, hex, alfa = 255) {
  if (x < 0 || y < 0 || x >= ancho) return
  const i = (y * ancho + x) * 4
  if (i < 0 || i + 3 >= l.length + 4) return
  l[i] = parseInt(hex.slice(1, 3), 16)
  l[i + 1] = parseInt(hex.slice(3, 5), 16)
  l[i + 2] = parseInt(hex.slice(5, 7), 16)
  l[i + 3] = alfa
}

export function rect(l, ancho, x0, y0, w, h, hex, alfa = 255) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) px(l, ancho, x, y, hex, alfa)
}
