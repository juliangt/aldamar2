// Combate — motor de turnos puro (Fase D). Sin Phaser: recibe un GameState
// y la lista de enemigos del lugar, mantiene un estado serializable y
// devuelve «eventos» (texto, daño, curación, fase…) que la BattleScene
// traduce en animaciones. Fórmulas según §5.2 y fase-d-combate.md
// (interpretaciones marcadas en la spec).

import Datos from './Datos.js'
import Balance from './Balance.js'
import { Rng } from './Rng.js'

// Rasgos con efecto en combate (docs/rasgos.json).
function rasgosCombate(aventura, heroeId) {
  return (Datos.aventura(aventura).personajes[heroeId]?.rasgos || []).filter((r) =>
    ['ojo_halcon', 'piel_piedra'].includes(r)
  )
}

function pct(actor) {
  return (actor.vida / actor.vidaMax) * 100
}

export class Combate {
  // `enemigosIds` son ids de `aventura.enemigos` (los del lugar, en orden).
  // `rng` inyectable para tests.
  constructor(estadoPartida, enemigosIds, rng) {
    this.p = estadoPartida
    this.rng = rng || new Rng((estadoPartida.semilla ^ Date.now()) >>> 0)
    this.aventura = estadoPartida.aventura
    this.dificultad = estadoPartida.dificultad

    const rasgos = rasgosCombate(this.aventura, estadoPartida.heroe)
    this.heroes = [
      {
        tipo: 'heroe',
        id: 'heroe',
        nombre: estadoPartida.nombre || 'Héroe',
        vida: estadoPartida.stats.vida,
        vidaMax: estadoPartida.stats.vidaMax,
        ataque: estadoPartida.ataqueEfectivo(),
        defensa: estadoPartida.defensa(),
        ojoHalcon: rasgos.includes('ojo_halcon'),
        pielPiedra: rasgos.includes('piel_piedra'),
        veneno: null,
      },
    ]
    for (const id of estadoPartida.companeros) {
      const r = Datos.recluta(this.aventura, id)
      if (!r) continue
      const max = Balance.statJugador(r.vida, 'vida_jugador', this.dificultad)
      const salud = estadoPartida.companerosSalud?.[id] || { vida: max, vidaMax: max }
      this.heroes.push({
        tipo: 'aliado',
        id,
        nombre: r.nombre,
        vida: Math.min(salud.vida, max),
        vidaMax: max,
        ataque: r.ataque,
        defensa: r.defensa || 0,
        veneno: null,
      })
    }

    this.enemigos = enemigosIds.map((id) => this.crearEnemigo(id))
    this.refuerzosHechos = {}
    this.turno = 0 // rondas completas (para depurar/serializar)
    this.estado = 'intro' // intro | menu | objetivo | fin
    this.resultado = null // victoria | huida | derrota | caida
    this.xpGanada = 0
  }

  crearEnemigo(id, esRefuerzo = false) {
    const dato = Datos.enemigo(this.aventura, id)
    return {
      tipo: 'enemigo',
      id,
      esRefuerzo,
      nombre: dato.nombre,
      vida: Balance.statEnemigo(dato.vida, 'vida_enemigos', this.dificultad),
      vidaMax: Balance.statEnemigo(dato.vida, 'vida_enemigos', this.dificultad),
      ataque: Balance.statEnemigo(dato.ataque, 'ataque_enemigos', this.dificultad),
      defensa: dato.defensa || 0,
      sinHuida: !!dato.sin_huida,
      experiencia: dato.experiencia || 0,
      fases: dato.fases || [],
      faseAplicada: -1,
      habilidades: dato.habilidades || [],
      telegraph: 0, // dano_extra pendiente tras golpe_fuerte
      turnosPropios: 0,
      veneno: null,
      vivo: true,
    }
  }

  // ------------------------------------------------------------ consultas

  heroesVivos() {
    return this.heroes.filter((h) => h.vida > 0)
  }

  enemigosVivos() {
    return this.enemigos.filter((e) => e.vivo && e.vida > 0)
  }

  heroe() {
    return this.heroes[0]
  }

  puedeHuir() {
    return !this.enemigosVivos().some((e) => e.sinHuida)
  }

  // ---------------------------------------------------------------- inicio
  // El veneno hace tick al principio del turno del envenenado
  // *(interpretación)*: héroes antes de su menú, enemigos antes de actuar.
  eventosVeneno(lado, actor) {
    const ev = []
    if (!actor.veneno || actor.vida <= 0) return ev
    actor.veneno.turnos--
    actor.vida = Math.max(0, actor.vida - actor.veneno.dano)
    ev.push({
      tipo: 'dano',
      lado,
      idx: this.indiceDe(lado, actor),
      cantidad: actor.veneno.dano,
      texto: `El veneno muerde: −${actor.veneno.dano} PV a ${actor.nombre}.`,
    })
    if (actor.veneno.turnos <= 0) actor.veneno = null
    return ev
  }

  indiceDe(lado, actor) {
    return (lado === 'heroes' ? this.heroes : this.enemigos).indexOf(actor)
  }

  // Arranca la ronda del jugador: ticks de veneno de héroes y chequeo de fin.
  iniciarRonda() {
    const ev = []
    this.turno++
    for (const h of this.heroes) ev.push(...this.eventosVeneno('heroes', h))
    ev.push(...this.chequearFinHeroes())
    if (this.estado !== 'fin') {
      this.estado = this.enemigosVivos().length > 1 ? 'objetivo' : 'menu'
      ev.push({ tipo: 'ronda', numero: this.turno })
    }
    return ev
  }

  // ------------------------------------------------------------- acciones
  // Daño físico determinista: ataque − defensas (mín. 1). Ojo de halcón
  // suma +1 si el objetivo conserva >50% de PV; Piel de piedra resta 1 a
  // cada golpe que recibe el héroe (§5.2).
  danoHeroeSobre(enemigo) {
    const h = this.heroe()
    let dano = h.ataque - enemigo.defensa
    if (h.ojoHalcon && pct(enemigo) > 50) dano += 1
    return Math.max(1, dano)
  }

  danoEnemigoSobre(objetivo, extra = 0) {
    const e = this.accionanteEnemigo
    let dano = e.ataque + extra - objetivo.defensa
    if (objetivo.tipo === 'heroe' && objetivo.pielPiedra) dano -= 1
    return Math.max(1, dano)
  }

  accionHeroe(accion, { objetivoIdx = 0, itemId = null } = {}) {
    if (this.estado === 'fin') return []
    if (accion === 'atacar') return this.ataqueHeroe(objetivoIdx)
    const esp = Datos.aventura(this.aventura)?.comando_especial
    if (accion === 'corazon' || accion === 'especial' || (esp && accion === esp.comando)) return this.comandoEspecial(objetivoIdx)
    if (accion === 'cuerno') return this.usarCuerno()
    if (accion === 'huida') return this.intentarHuida()
    if (accion === 'objeto') return this.usarObjeto(itemId)
    return []
  }

  ataqueHeroe(objetivoIdx) {
    const ev = []
    const enemigo = this.enemigosVivos()[objetivoIdx] || this.enemigosVivos()[0]
    const dano = this.danoHeroeSobre(enemigo)
    enemigo.vida = Math.max(0, enemigo.vida - dano)
    ev.push({ tipo: 'dano', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), cantidad: dano })
    if (enemigo.vida <= 0) {
      enemigo.vivo = false
      ev.push({ tipo: 'muerte', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), nombre: enemigo.nombre })
    }
    ev.push(...this.chequearVictoria())
    return ev
  }

  // Comando especial dinámico (§5.3): dano_base + dano_por_corrupcion ×
  // ⌊grieta/10⌋; cada uso sube la grieta corrupcion_coste × Balance.
  // Soporta corazon (Corazón), marea (Sal), eco (Aguja) o null (Brasa).
  comandoEspecial(objetivoIdx) {
    const ev = []
    const esp = Datos.aventura(this.aventura).comando_especial
    const efecto = esp?.efecto
    if (!efecto) return []
    const p = this.p
    const dano =
      efecto.dano_base + efecto.dano_por_corrupcion * Math.floor(p.grieta / 10)
    const enemigo = this.enemigosVivos()[objetivoIdx] || this.enemigosVivos()[0]
    enemigo.vida = Math.max(0, enemigo.vida - dano)
    ev.push({ tipo: 'dano', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), cantidad: dano })
    ev.push({ tipo: 'texto', texto: efecto.mensaje, ctx: { efectivo: dano } })
    const subida = Balance.corrupcion(efecto.corrupcion_coste, this.dificultad)
    p.grieta = Math.min(100, p.grieta + subida)
    ev.push({ tipo: 'grieta', valor: p.grieta, subida })
    if (p.grieta >= 100) {
      this.estado = 'fin'
      this.resultado = 'caida'
      ev.push({ tipo: 'caida' })
      return ev
    }
    if (enemigo.vida <= 0) {
      enemigo.vivo = false
      ev.push({ tipo: 'muerte', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), nombre: enemigo.nombre })
    }
    ev.push(...this.chequearVictoria())
    return ev
  }

  comandoCorazon(objetivoIdx) {
    return this.comandoEspecial(objetivoIdx)
  }

  // Cuerno de Valoria: victoria inmediata si TODOS los vivos son menores
  // (sin sin_huida); contra jefe no hace nada y no se consume.
  usarCuerno() {
    const ev = []
    if (!this.p.cantidad('cuerno_valoria')) return [{ tipo: 'texto', texto: 'No llevas cuerno alguno.' }]
    if (this.enemigosVivos().some((e) => e.sinHuida)) {
      ev.push({ tipo: 'texto', texto: 'El cuerno suena, largo y limpio… y aquello que tienes delante ni parpadea. No es criatura menor: el cuerno se queda en tu bolsa.' })
      return ev
    }
    this.p.quitarItem('cuerno_valoria')
    ev.push({ tipo: 'texto', texto: 'El cuerno de Valoria resuella su nota única. Las criaturas menores se dispersan como hojas al viento.' })
    for (const e of this.enemigosVivos()) {
      e.vida = 0
      e.vivo = false
      ev.push({ tipo: 'muerte', lado: 'enemigos', idx: this.indiceDe('enemigos', e), nombre: e.nombre })
    }
    ev.push(...this.chequearVictoria())
    return ev
  }

  usarObjeto(itemId) {
    const ev = []
    const res = this.p.usarItem(itemId)
    if (!res) return [{ tipo: 'texto', texto: 'No queda nada de eso.' }]
    const h = this.heroe()
    h.vida = this.p.stats.vida
    h.vidaMax = this.p.stats.vidaMax
    ev.push({ tipo: 'curar', lado: 'heroes', idx: 0, cantidad: res.cura })
    if (res.texto) ev.push({ tipo: 'texto', texto: res.texto })
    else ev.push({ tipo: 'texto', texto: `Recuperas ${res.cura} PV.` })
    return ev
  }

  // Huida: 0.5 solo si ningún enemigo tiene sin_huida; al fallar, el turno
  // pasa a los enemigos *(interpretación §5.2)*.
  intentarHuida() {
    const ev = []
    if (!this.puedeHuir()) {
      ev.push({ tipo: 'texto', texto: 'No hay manera: esto no va a apartarse de tu camino.' })
      return { huida: false, eventos: ev }
    }
    const logra = this.rng.chance(0.5)
    if (logra) {
      this.estado = 'fin'
      this.resultado = 'huida'
      ev.push({ tipo: 'texto', texto: 'Retrocedes hasta que el aire deja de oler a peligro. Escapas.' })
      ev.push({ tipo: 'fin', resultado: 'huida' })
    } else {
      ev.push({ tipo: 'texto', texto: 'Intentas irte y el suelo parece alargarse: no escaparas esta vez.' })
    }
    return { huida: logra, eventos: ev }
  }

  // Los compañeros atacan automáticamente tras el héroe, al mismo objetivo
  // si vive o a cualquiera *(interpretación)*.
  turnoAliados(objetivoIdx = 0) {
    const ev = []
    for (let i = 1; i < this.heroes.length; i++) {
      const aliado = this.heroes[i]
      if (aliado.vida <= 0 || this.estado === 'fin') continue
      const vivos = this.enemigosVivos()
      if (!vivos.length) break
      const enemigo = vivos[Math.min(objetivoIdx, vivos.length - 1)]
      const dano = Math.max(1, aliado.ataque - enemigo.defensa)
      enemigo.vida = Math.max(0, enemigo.vida - dano)
      ev.push({ tipo: 'dano', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), cantidad: dano, autor: aliado.nombre })
      if (enemigo.vida <= 0) {
        enemigo.vivo = false
        ev.push({ tipo: 'muerte', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), nombre: enemigo.nombre })
      }
      ev.push(...this.chequearVictoria())
    }
    return ev
  }

  // --------------------------------------------------------------- IA

  // Un turno completo de enemigos (uno a uno). La escena reproduce los
  // eventos en orden; cada enemigo actúa según su IA.
  turnoEnemigos() {
    const ev = []
    const initialLen = this.enemigos.length
    for (let i = 0; i < initialLen; i++) {
      const enemigo = this.enemigos[i]
      if (this.estado === 'fin') break
      if (!enemigo.vivo || enemigo.vida <= 0) continue
      ev.push(...this.eventosVeneno('enemigos', enemigo))
      ev.push(...this.chequearVictoria())
      if (this.estado === 'fin') break
      this.accionanteEnemigo = enemigo
      ev.push(...this.actuarEnemigo(enemigo))
      this.accionanteEnemigo = null
      ev.push(...this.chequearFinHeroes())
    }
    return ev
  }

  actuarEnemigo(enemigo) {
    const ev = []
    enemigo.turnosPropios++

    // 1. ¿Cambio de fase de jefe?
    const fase = enemigo.fases[enemigo.faseAplicada + 1]
    if (fase && pct(enemigo) < fase.vida_menor_que) {
      enemigo.faseAplicada++
      enemigo.nombre = fase.nombre
      enemigo.ataque = Balance.statEnemigo(fase.ataque, 'ataque_enemigos', this.dificultad)
      enemigo.habilidades = fase.habilidades || []
      enemigo.telegraph = 0
      ev.push({ tipo: 'fase', lado: 'enemigos', idx: this.indiceDe('enemigos', enemigo), texto: fase.texto })
    }

    // 2. Habilidad elegible por condición + cadencia, sorteada por peso.
    const habilidad = this.elegirHabilidad(enemigo)
    if (habilidad) {
      ev.push(...this.ejecutarHabilidad(enemigo, habilidad))
      return ev
    }

    // 3. Ataque normal (con telegraph pendiente si lo hay).
    const objetivo = this.objetivoAleatorio()
    if (!objetivo) return ev
    let extra = 0
    if (enemigo.telegraph) {
      extra = enemigo.telegraph
      enemigo.telegraph = 0
    }
    const dano = this.danoEnemigoSobre(objetivo, extra)
    objetivo.vida = Math.max(0, objetivo.vida - dano)
    ev.push({
      tipo: 'dano',
      lado: objetivo.tipo === 'heroe' ? 'heroes' : 'heroes',
      idx: this.indiceDe('heroes', objetivo),
      cantidad: dano,
      autor: enemigo.nombre,
      texto: `${enemigo.nombre} golpea a ${objetivo.nombre}: −${dano} PV.`,
    })
    ev.push(...this.eventoCaida(objetivo))
    return ev
  }

  elegirHabilidad(enemigo) {
    if (enemigo.telegraph) return null // el golpe cargado va sí o sí
    const elegibles = enemigo.habilidades.filter((h) => {
      if (h.condicion?.cada_n_turnos && enemigo.turnosPropios % h.condicion.cada_n_turnos !== 0)
        return false
      if (h.condicion?.vida_menor_que && pct(enemigo) >= h.condicion.vida_menor_que) return false
      if (h.tipo === 'curarse' && enemigo.vida >= enemigo.vidaMax) return false
      return true
    })
    if (!elegibles.length) return null
    const total = elegibles.reduce((a, h) => a + (h.peso || 1), 0)
    let dado = this.rng.next() * total
    for (const h of elegibles) {
      dado -= h.peso || 1
      if (dado <= 0) return h
    }
    return elegibles[elegibles.length - 1]
  }

  ejecutarHabilidad(enemigo, h) {
    const ev = []
    const idx = this.indiceDe('enemigos', enemigo)
    if (h.tipo === 'veneno') {
      const objetivo = this.objetivoAleatorio()
      objetivo.veneno = { dano: h.dano, turnos: h.turnos }
      ev.push({ tipo: 'texto', texto: `${h.texto} (${objetivo.nombre} sufrira ${h.dano} de dano durante ${h.turnos} turnos).` })
    } else if (h.tipo === 'golpe_fuerte') {
      enemigo.telegraph = h.dano_extra
      ev.push({ tipo: 'aviso', lado: 'enemigos', idx, texto: h.texto_aviso })
    } else if (h.tipo === 'curarse') {
      const puntos = Math.min(h.puntos, enemigo.vidaMax - enemigo.vida)
      enemigo.vida += puntos
      ev.push({ tipo: 'curar', lado: 'enemigos', idx, cantidad: puntos })
      ev.push({ tipo: 'texto', texto: `${h.texto} (+${puntos} PV).` })
    } else if (h.tipo === 'refuerzo') {
      const hechos = this.refuerzosHechos[enemigo.id] || 0
      if (hechos < (h.veces || 1) && this.enemigos.length < 3) {
        this.refuerzosHechos[enemigo.id] = hechos + 1
        const nuevo = this.crearEnemigo(h.enemigo, true)
        this.enemigos.push(nuevo)
        ev.push({ tipo: 'refuerzo', idx: this.enemigos.length - 1, texto: h.texto || `¡${nuevo.nombre} se une al combate!` })
      }
    }
    return ev
  }

  // Objetivo enemigo: aleatorio entre héroe y compañeros vivos
  // *(interpretación)*.
  objetivoAleatorio() {
    const vivos = this.heroesVivos()
    return vivos.length ? vivos[Math.floor(this.rng.next() * vivos.length) % vivos.length] : null
  }

  eventoCaida(objetivo) {
    if (objetivo.vida > 0) return []
    const ev = [
      {
        tipo: objetivo.tipo === 'heroe' ? 'derrota' : 'caido',
        lado: 'heroes',
        idx: this.indiceDe('heroes', objetivo),
        nombre: objetivo.nombre,
      },
    ]
    if (objetivo.tipo === 'heroe') {
      this.estado = 'fin'
      this.resultado = 'derrota'
      ev.push({ tipo: 'fin', resultado: 'derrota' })
    }
    return ev
  }

  // ------------------------------------------------------------- finales

  chequearVictoria() {
    if (this.estado === 'fin') return []
    if (this.enemigosVivos().length) return []
    this.estado = 'fin'
    this.resultado = 'victoria'
    this.xpGanada = this.enemigos.reduce(
      (a, e) => a + Balance.xp(e.experiencia, this.dificultad),
      0
    )
    return [{ tipo: 'fin', resultado: 'victoria' }]
  }

  chequearFinHeroes() {
    const ev = []
    for (const h of this.heroes) {
      if (h.vida <= 0 && !(h.tipo === 'heroe' ? this.resultado === 'derrota' : h._caido)) {
        if (h.tipo !== 'heroe') {
          h._caido = true
          ev.push({ tipo: 'caido', lado: 'heroes', idx: this.indiceDe('heroes', h), nombre: h.nombre })
        }
      }
    }
    if (this.heroe().vida <= 0 && this.estado !== 'fin') {
      this.estado = 'fin'
      this.resultado = 'derrota'
      ev.push({ tipo: 'fin', resultado: 'derrota' })
    }
    return ev
  }

  // Sincroniza el GameState al terminar: PV del héroe, salud de compañeros
  // (los caídos se levantan con 1 PV al ganar) y XP/nivel. Devuelve
  // {resultado, subidasNivel} para los toasts de la escena.
  aplicarResultado() {
    const p = this.p
    p.stats.vida = Math.max(this.heroe().vida, this.resultado === 'victoria' ? 1 : 0)
    p.companerosSalud = p.companerosSalud || {}
    for (let i = 1; i < this.heroes.length; i++) {
      const h = this.heroes[i]
      const vida = h.vida > 0 ? h.vida : this.resultado === 'victoria' ? 1 : 0
      p.companerosSalud[h.id] = { vida, vidaMax: h.vidaMax }
    }
    let subidas = 0
    if (this.resultado === 'victoria') {
      subidas = this.ganarXp(this.xpGanada)
    }
    p.guardar()
    return { resultado: this.resultado, subidasNivel: subidas, xp: this.xpGanada }
  }

  // Nivel n → n+1 a los 30×n XP acumulables; +5 PV máx/actuales y +1 ataque
  // en niveles pares (§5.5). Devuelve el número de subidas del tirón.
  ganarXp(xp) {
    const p = this.p
    p.xp += xp
    let subidas = 0
    while (p.xp >= 30 * p.nivel) {
      p.xp -= 30 * p.nivel
      p.nivel++
      subidas++
      p.stats.vidaMax += 5
      p.stats.vida += 5
      if (p.nivel % 2 === 0) p.stats.ataque += 1
    }
    return subidas
  }
}

export default Combate
