// GameState — estado vivo de la partida actual (§8 de la spec maestra).
// Serializable a localStorage: aldamar:save:<aventura>.

import Datos from './Datos.js'
import Balance from './Balance.js'
import Rng from './Rng.js'
import Legacy from './Legacy.js'

const CLAVE_SAVE = (aventuraId) => `aldamar:save:${aventuraId}`

export class GameState {
  constructor(estado = {}) {
    Object.assign(this, {
      aventura: null,
      heroe: null,
      nombre: '',
      dificultad: Datos.dificultadPorDefecto,
      stats: { vida: 0, vidaMax: 0, ataque: 0 },
      nivel: 1,
      xp: 0,
      grieta: 0,
      monedas: 0,
      inventario: [],
      equipo: {},
      companeros: [],
      companerosSalud: {},
      flags: {},
      vistos: {},
      npcVistos: {},
      recogidos: {},
      lugar: null,
      entrada: null,
      semilla: 0,
      ...estado,
    })
  }

  // Crea una partida nueva a partir de un héroe de la aventura.
  nuevaPartida(aventuraId, heroeId, dificultad = Datos.dificultadPorDefecto, semilla) {
    const av = Datos.aventura(aventuraId)
    const pj = av.personajes[heroeId]
    if (!pj) throw new Error(`Héroe desconocido: ${heroeId}`)

    this.aventura = aventuraId
    this.heroe = heroeId
    this.nombre = pj.nombre || ''
    this.dificultad = dificultad
    this.stats = {
      vidaMax: Balance.statJugador(pj.vida, 'vida_jugador', dificultad),
      vida: Balance.statJugador(pj.vida, 'vida_jugador', dificultad),
      ataque: Balance.statJugador(pj.ataque, 'ataque_jugador', dificultad),
    }
    this.nivel = 1
    this.xp = 0
    this.grieta = 0
    this.monedas = Balance.statJugador(pj.monedas || 0, 'monedas', dificultad)
    this.inventario = (pj.inventario || []).slice()
    this.equipo = {}
    this.companeros = []
    this.flags = {}
    this.vistos = {}
    this.npcVistos = {}
    this.recogidos = {}
    this.lugar = av.lugar_inicial
    this.entrada = null
    this.semilla =
      semilla !== undefined ? Rng.semillaDe(semilla) : (Date.now() >>> 0)
    Legacy.importar(this)
    return this
  }

  // ------------------------------------------------------------ inventario

  // Aplíca apilado: los consumibles cuentan por duplicado en la lista plana;
  // el resto se muestra una vez. Devuelve [{id, n}] en orden de llegada.
  itemsApilados() {
    const orden = []
    const cuenta = {}
    for (const id of this.inventario) {
      if (!(id in cuenta)) orden.push(id)
      cuenta[id] = (cuenta[id] || 0) + 1
    }
    return orden.map((id) => ({ id, n: cuenta[id] }))
  }

  cantidad(id) {
    return this.inventario.filter((i) => i === id).length
  }

  // Quita una unidad del ítem (los apilables restan 1; el resto desaparece).
  quitarItem(id) {
    const i = this.inventario.indexOf(id)
    if (i !== -1) this.inventario.splice(i, 1)
    return i !== -1
  }

  // Usar consumible: cura `curacion × Balance.curacion` (cap a PV máx).
  // Devuelve {curacion} o null si no era consumible / no quedan.
  usarItem(id) {
    const dato = Datos.item(this.aventura, id)
    if (!dato || dato.tipo !== 'consumible' || !this.quitarItem(id)) return null
    const cura = Math.min(
      Balance.curacion(dato.curacion, this.dificultad),
      this.stats.vidaMax - this.stats.vida
    )
    this.stats.vida += cura
    this.guardar()
    return { cura, texto: dato.texto_uso || null, dato }
  }

  // ------------------------------------------------------------ equipo

  bonusEquipo(ranura) {
    const id = this.equipo[ranura]
    if (!id) return 0
    return Datos.item(this.aventura, id)?.bonus || 0
  }

  ataqueEfectivo() {
    return this.stats.ataque + this.bonusEquipo('arma')
  }

  defensa() {
    return this.bonusEquipo('armadura')
  }

  // Equipar arma/armadura: sale del inventario; la anterior vuelve a él.
  equipar(id) {
    const dato = Datos.item(this.aventura, id)
    if (!dato || (dato.tipo !== 'arma' && dato.tipo !== 'armadura')) return false
    const ranura = dato.tipo
    const anterior = this.equipo[ranura]
    if (!this.quitarItem(id)) return false
    this.equipo[ranura] = id
    if (anterior) this.inventario.push(anterior)
    this.guardar()
    return true
  }

  desequipar(ranura) {
    const id = this.equipo[ranura]
    if (!id) return false
    delete this.equipo[ranura]
    this.inventario.push(id)
    this.guardar()
    return true
  }

  tieneFlag(flag) {
    return !!(this.flags && this.flags[flag])
  }

  // ------------------------------------------------------------ economía

  tieneLenguaMercado() {
    const pj = Datos.aventura(this.aventura).personajes[this.heroe] || {}
    return (pj.rasgos || []).includes('lengua_mercado')
  }

  // Precio efectivo en tienda: Lengua de mercado resta 1 (mín. 0).
  precioEfectivo(id) {
    const precio = Datos.item(this.aventura, id)?.precio ?? 0
    return Math.max(0, precio - (this.tieneLenguaMercado() ? 1 : 0))
  }

  comprar(id) {
    const precio = this.precioEfectivo(id)
    if (this.monedas < precio) return false
    this.monedas -= precio
    this.inventario.push(id)
    this.guardar()
    return true
  }

  // ------------------------------------------------------------ descanso

  // Cura al grupo entero; el descanso va por la casa (gratis).
  // La salud de los compañeros se inicializa la primera vez.
  descansar() {
    this.stats.vida = this.stats.vidaMax
    this.companerosSalud = this.companerosSalud || {}
    for (const id of this.companeros) {
      const r = Datos.recluta(this.aventura, id)
      const max = Balance.statJugador(r?.vida || 0, 'vida_jugador', this.dificultad)
      this.companerosSalud[id] = { vida: max, vidaMax: max }
    }
    this.guardar()
  }

  // ------------------------------------------------------------ grieta (Fase E)

  // Suma corrupción × Balance (la resta usa el multiplicador de la misma
  // forma, en negativo). Devuelve {delta, grieta, caida} — caída a true
  // cuando la grieta alcanza 100 por cualquier vía.
  sumarGrieta(puntos) {
    const delta =
      puntos >= 0
        ? Balance.corrupcion(puntos, this.dificultad)
        : -Balance.corrupcion(-puntos, this.dificultad)
    const antes = this.grieta
    this.grieta = Math.max(0, Math.min(100, this.grieta + delta))
    this.guardar()
    return { delta: this.grieta - antes, grieta: this.grieta, caida: this.grieta >= 100 }
  }

  // Cura total del grupo (ritual, curar_grupo): vida al máximo y corrupción
  // negativa × Balance si se pasa.
  curarGrupo(corrupcion = 0) {
    this.stats.vida = this.stats.vidaMax
    this.companerosSalud = this.companerosSalud || {}
    for (const id of this.companeros) {
      const r = Datos.recluta(this.aventura, id)
      const max = Balance.statJugador(r?.vida || 0, 'vida_jugador', this.dificultad)
      this.companerosSalud[id] = { vida: max, vidaMax: max }
    }
    return corrupcion ? this.sumarGrieta(corrupcion) : { delta: 0, grieta: this.grieta, caida: false }
  }

  // Daño de prueba (dev, Fase C): sin combate aún, para probar consumibles.
  danarDev(n = 5) {
    this.stats.vida = Math.max(1, this.stats.vida - n)
    return this.stats.vida
  }

  serializar() {
    return JSON.stringify(this)
  }

  guardar() {
    if (this.aventura) {
      localStorage.setItem(CLAVE_SAVE(this.aventura), this.serializar())
    }
    return this
  }

  static restaurar(aventuraId) {
    const crudo = localStorage.getItem(CLAVE_SAVE(aventuraId))
    if (!crudo) return null
    try {
      return new GameState(JSON.parse(crudo))
    } catch {
      return null
    }
  }

  static borrar(aventuraId) {
    localStorage.removeItem(CLAVE_SAVE(aventuraId))
  }
}

export default GameState
