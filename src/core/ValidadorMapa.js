// ValidadorMapa — verifica la coherencia bidireccional entre el JSON de lugar
// y las capas de objetos del mapa Tiled (Fase E).
// Funciona tanto sobre un mapa Phaser como sobre el JSON crudo de Tiled.

import Datos from './Datos.js'

const DIRS_PRIMARIAS = {
  norte: 'N',
  sur: 'S',
  este: 'E',
  oeste: 'O',
}

export const ValidadorMapa = {
  leerObjetos(mapa, nombreCapa) {
    if (typeof mapa.getObjectLayer === 'function') {
      const capa = mapa.getObjectLayer(nombreCapa)
      return capa ? capa.objects || [] : null
    }
    const capa = (mapa.layers || []).find(
      (l) => l.name === nombreCapa && l.type === 'objectgroup'
    )
    return capa ? capa.objects || [] : null
  },

  leerProps(obj) {
    const props = {}
    for (const p of obj.properties || []) props[p.name] = p.value
    return props
  },

  _validarCapasObligatorias(mapa, avisos) {
    const capasObligatorias = [
      'suelo',
      'obstaculos',
      'decoracion',
      'frente',
      'spawns',
      'salidas',
      'npcs',
      'enemigos',
      'objetos',
      'monedas',
      'eventos',
    ]
    for (const nombre of capasObligatorias) {
      if (typeof mapa.getObjectLayer === 'function') {
        if (!mapa.getObjectLayer(nombre) && !mapa.getLayer(nombre))
          avisos.push(`falta la capa «${nombre}»`)
      } else {
        const existe = (mapa.layers || []).some((l) => l.name === nombre)
        if (!existe) avisos.push(`falta la capa «${nombre}»`)
      }
    }
  },

  _validarNpcs(lugarDato, mapa, avisos) {
    const npcsDeclarados = Object.keys(lugarDato.npcs || {})
    const npcsPintados = (this.leerObjetos(mapa, 'npcs') || []).map((o) => o.name)
    for (const id of npcsDeclarados) {
      if (!npcsPintados.includes(id))
        avisos.push(`NPC declarado sin pintar en el mapa: ${id}`)
    }
    for (const id of npcsPintados) {
      if (!npcsDeclarados.includes(id))
        avisos.push(`NPC en el mapa sin declarar en JSON: ${id}`)
    }
  },

  _validarEnemigos(lugarDato, mapa, avisos) {
    const eneDeclarados = lugarDato.enemigos || []
    const enePintados = (this.leerObjetos(mapa, 'enemigos') || []).map((o) => o.name)
    const contar = (lista) =>
      lista.reduce((acc, x) => {
        acc[x] = (acc[x] || 0) + 1
        return acc
      }, {})
    const cDeclarados = contar(eneDeclarados)
    const cPintados = contar(enePintados)
    const todosEnemigos = new Set([
      ...Object.keys(cDeclarados),
      ...Object.keys(cPintados),
    ])
    for (const id of todosEnemigos) {
      const dec = cDeclarados[id] || 0
      const pin = cPintados[id] || 0
      if (pin < dec)
        avisos.push(
          `enemigo declarado sin pintar en el mapa: ${id} (${dec} declarados, ${pin} en mapa)`
        )
      else if (pin > dec)
        avisos.push(
          `enemigo en el mapa sin declarar en JSON: ${id} (${pin} en mapa, ${dec} declarados)`
        )
    }
  },

  _validarObjetos(lugarDato, mapa, avisos) {
    const objDeclarados = lugarDato.objetos || []
    const objPintados = (this.leerObjetos(mapa, 'objetos') || []).map((o) => o.name)
    for (const id of objDeclarados) {
      if (!objPintados.includes(id))
        avisos.push(`objeto declarado sin pintar en el mapa: ${id}`)
    }
    for (const id of objPintados) {
      if (!objDeclarados.includes(id))
        avisos.push(`objeto en el mapa sin declarar en JSON: ${id}`)
    }
  },

  _validarMonedas(lugarDato, mapa, avisos) {
    const monDeclaradas = lugarDato.monedas || 0
    const monPintadas = this.leerObjetos(mapa, 'monedas') || []
    if (monDeclaradas > 0 && !monPintadas.length)
      avisos.push(`monedas declaradas (${monDeclaradas}) sin pintar en el mapa`)
    else if (monDeclaradas === 0 && monPintadas.length > 0)
      avisos.push(`monedas en el mapa sin declarar en JSON (${monPintadas.length})`)
  },

  _validarEventos(lugarDato, mapa, aventura, avisos) {
    const gatillosDeclarados = (lugarDato.eventos || []).filter((eId) => {
      const ev = Datos.evento(aventura, eId)
      return ev && (ev.tipo === 'decision' || ev.tipo === 'final')
    })
    const gatillosPintados = (this.leerObjetos(mapa, 'eventos') || []).map(
      (o) => this.leerProps(o).evento || o.name
    )
    for (const id of gatillosDeclarados) {
      if (!gatillosPintados.includes(id))
        avisos.push(`gatillo de evento declarado sin pintar en el mapa: ${id}`)
    }
    for (const id of gatillosPintados) {
      if (!gatillosDeclarados.includes(id))
        avisos.push(`evento en el mapa sin declarar en JSON: ${id}`)
    }
  },

  _validarSalidas(lugarDato, mapa, aventura, avisos) {
    const salidasPintadas = this.leerObjetos(mapa, 'salidas') || []
    for (const s of salidasPintadas) {
      const props = this.leerProps(s)
      const hacia = props.hacia
      const dir = props.dir
      if (!hacia) avisos.push('salida sin destino «hacia» definido')
      else if (!Datos.lugar(aventura, hacia))
        avisos.push(`la salida «${dir}» apunta a un lugar desconocido: ${hacia}`)
    }
    for (const [dirNom, dirCod] of Object.entries(DIRS_PRIMARIAS)) {
      const destino = (lugarDato.salidas || {})[dirNom]
      if (destino) {
        const encontrada = salidasPintadas.some((s) => {
          const p = this.leerProps(s)
          return p.hacia === destino && (!p.dir || p.dir === dirCod)
        })
        if (!encontrada)
          avisos.push(
            `salida declarada «${dirNom}» hacia ${destino} sin zona en el mapa`
          )
      }
    }
  },

  _validarDescanso(lugarDato, mapa, avisos) {
    if (lugarDato.descanso) {
      const puntos = this.leerObjetos(mapa, 'descanso') || []
      if (!puntos.length)
        avisos.push('lugar con descanso:true sin punto «descanso»')
    }
  },

  validar(lugarId, lugarDato, mapa, aventura = 'corazon_ceniza') {
    const avisos = []
    if (!lugarDato || !mapa) return avisos

    this._validarCapasObligatorias(mapa, avisos)
    this._validarNpcs(lugarDato, mapa, avisos)
    this._validarEnemigos(lugarDato, mapa, avisos)
    this._validarObjetos(lugarDato, mapa, avisos)
    this._validarMonedas(lugarDato, mapa, avisos)
    this._validarEventos(lugarDato, mapa, aventura, avisos)
    this._validarSalidas(lugarDato, mapa, aventura, avisos)
    this._validarDescanso(lugarDato, mapa, avisos)

    return avisos
  },
}

export default ValidadorMapa
