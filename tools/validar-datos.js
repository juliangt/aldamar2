#!/usr/bin/env node
// tools/validar-datos.js — valida sintácticamente y estructuralmente todos los JSON del juego

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const raiz = path.resolve(__dirname, '..')

const directorios = [
  path.join(raiz, 'docs', 'aventuras'),
  path.join(raiz, 'docs'),
]

let archivosValidados = 0
let errores = 0

for (const dir of directorios) {
  if (!fs.existsSync(dir)) continue
  const ficheros = fs.readdirSync(dir)
  for (const f of ficheros) {
    if (!f.endsWith('.json')) continue
    const rutaCompleta = path.join(dir, f)
    try {
      const contenido = fs.readFileSync(rutaCompleta, 'utf8')
      const parsed = JSON.parse(contenido)
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('El contenido raíz debe ser un objeto')
      }
      archivosValidados++
    } catch (err) {
      console.error(`[ERROR] Fallo al validar ${f}: ${err.message}`)
      errores++
    }
  }
}

if (errores > 0) {
  console.error(`[VALIDACION] Se encontraron ${errores} errores en los JSON.`)
  process.exit(1)
} else {
  console.log(`[VALIDACION] Éxito: ${archivosValidados} ficheros JSON válidos.`)
}
