// BattleScene — combate por turnos (Fase D): héroes a la izquierda (héroe +
// compañeros en fila), enemigos a la derecha (jefes a doble escala), barra
// inferior con log de combate y botones ATACAR/OBJETO/CORAZÓN/CUERNO/HUIDA.
// El motor puro vive en core/Combate.js; aquí solo se secuencian eventos
// (texto, daño, curación, fases…) con FX mínimos (lunge, shake, números
// flotantes, flash de fase).

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import { partida } from '../core/partida.js'
import Combate from '../core/Combate.js'
import Texto from '../core/Texto.js'
import heroePng from '../assets/heroe.png'
import { VISTA, aplicarRes } from '../core/resolucion.js'
import { BIOMAS_TONOS, crearTexturaHeroe, crearTexturaEnemigo } from '../core/Sprites.js'
import { audio8 } from '../core/Audio8.js'

const FUENTE = '"Press Start 2P", monospace'
const PALETA_ENEMIGO = { lobo: '#5a5a6a', espectro: '#8a9ab0', trasgo: '#7a8a4a', lobero: '#6a5a4a', capitan: '#9a6a5a', custodio: '#b0c0c8' }
const MS_LOG = 1300 // auto-avance del log

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle')
  }

  init(data) {
    this.datosEntrada = data
    this.origen = data.origen || 'World'
  }

  preload() {
    if (!this.textures.exists('heroe'))
      this.load.spritesheet('heroe', heroePng, { frameWidth: 16, frameHeight: 16 })
  }

  create() {
    aplicarRes(this)

    const { width, height } = VISTA
    this.scene.bringToTop() // dibujar sobre Mundo/Ui/Arena
    this.cameras.main.setBackgroundColor('#101418')

    this.combate = new Combate(partida, this.datosEntrada.enemigos)
    this.esJefe = (e) => e.sinHuida || (e.fases && e.fases.length)

    this.dibujarFondo(this.datosEntrada.lugar)
    this.crearSprites()
    this.crearLog()
    this.crearBotones()
    this.crearSecretoBatalla()

    this.input.keyboard.on('keydown-SPACE', () => this.acelerarLog())
    this.input.keyboard.on('keydown-ENTER', () => this.acelerarLog())

    this.cameras.main.fadeIn(250)
    this.flow()
  }

  crearSecretoBatalla() {
    const secretos = Datos.aventura(this.combate.aventura)?.secretos
    if (!secretos) return
    const [clave, sec] = Object.entries(secretos)[0] || []
    if (!sec || !sec.texto_combate) return

    if (clave === 'campanilla' && !partida.tieneFlag('campanilla') && !partida.inventario.includes('campanilla')) {
      return
    }

    const iconos = {
      cuervo: '𓅃',
      abejas: '𓆤',
      gaviota: '𓅪',
      campanilla: '𓏢',
    }
    const icono = iconos[clave] || '✧'
    const { width } = VISTA
    const btn = this.add
      .text(width - 20, 16, icono, {
        fontSize: '11px',
        color: '#888899',
      })
      .setOrigin(0.5)
      .setDepth(3100)
      .setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => {
      this.log(sec.texto_combate)
    })
  }

  crearCuervoBatalla() {
    return this.crearSecretoBatalla()
  }

  // ------------------------------------------------------------ fondo/sprites

  dibujarFondo(lugarId) {
    const g = this.add.graphics().setDepth(0)
    const { width, height } = VISTA
    // Banda de suelo 1-bit por bioma (tono según el lugar).
    const tono = BIOMAS_TONOS[lugarId] ?? 0x14181c
    g.fillStyle(tono, 1).fillRect(0, 0, width, 170)
    g.lineStyle(1, 0x2a3038, 1).lineBetween(0, 148, width, 148)
    // Motivo simple de bioma: línea de horizonte + dientes de sierra.
    g.fillStyle(0x0a0d10, 0.6)
    for (let x = 0; x < width; x += 24) g.fillRect(x, 144, 12, 4)
  }

  texturaSpriteEnemigo(id) {
    return crearTexturaEnemigo(this, id)
  }

  texturaSpriteCompanero(id) {
    const clave = `companero:${id}`
    if (this.textures.exists(clave)) return clave
    const colores = ['#4a7a5a', '#7a6a4a', '#5a6a7a']
    const color = colores[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % colores.length]
    const cv = document.createElement('canvas')
    cv.width = 16
    cv.height = 16
    const g = cv.getContext('2d')
    g.fillStyle = '#c8a06a'
    g.fillRect(5, 2, 6, 5) // cabeza
    g.fillStyle = color
    g.fillRect(4, 8, 8, 6) // cuerpo
    g.fillStyle = '#2a2a2a'
    g.fillRect(5, 14, 2, 2)
    g.fillRect(9, 14, 2, 2)
    this.textures.addCanvas(clave, cv)
    return clave
  }

  crearSprites() {
    const baseY = 96
    // Héroes: héroe delante con su paleta propia, compañeros detrás en diagonal.
    this.spritesHeroes = this.combate.heroes.map((h, i) => {
      const tex = h.tipo === 'heroe' ? crearTexturaHeroe(this, partida.heroe || 'tilo') : this.texturaSpriteCompanero(h.id)
      const s = this.add
        .sprite(84 - i * 26, baseY - i * 12, tex, h.tipo === 'heroe' ? 0 : undefined)
        .setOrigin(0.5, 1)
        .setDepth(100 - i)
        .setFlipX(false)
      this.crearBarra(s, h, 'izq')
      return s
    })
    // Enemigos a la derecha; jefes (sin_huida o con fases) a doble escala.
    this.spritesEnemigos = this.combate.enemigos.map((e, i) => {
      const escala = this.esJefe(e) ? 2 : 1
      const s = this.add
        .sprite(356 + i * 30, baseY + i * 10, this.texturaSpriteEnemigo(e.id))
        .setOrigin(0.5, 1)
        .setDepth(100 + i)
        .setScale(escala)
        .setFlipX(true)
        .setInteractive({ useHandCursor: true })
      s.on('pointerdown', () => this.tapEnemigo(i))
      this.crearBarra(s, e, 'der')
      return s
    })
    this.refrescarBarras()
  }

  // PV en texto sobre cada sprite (mismo ancho, origen centrado).
  crearBarra(sprite, actor, lado) {
    actor._barra = this.add
      .text(sprite.x, sprite.y - sprite.displayHeight - 12, '', {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: lado === 'izq' ? '#9ad09a' : '#e08a8a',
      })
      .setOrigin(0.5)
      .setDepth(200)
    actor._nombre = this.add
      .text(sprite.x, sprite.y + 4, actor.nombre, {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: '#9a9aa8',
      })
      .setOrigin(0.5, 0)
      .setDepth(200)
    actor._sprite = sprite
  }

  refrescarBarras() {
    for (const actor of [...this.combate.heroes, ...this.combate.enemigos]) {
      if (!actor._barra) continue
      actor._barra.setText(`${Math.max(0, actor.vida)}/${actor.vidaMax}`)
      actor._nombre.setText(actor.nombre)
      if (actor.vida <= 0) actor._sprite.setTintFill(0x3a3a3a).setAlpha(0.6)
      else if (actor._sprite.tintTopLeft !== 0xffffff) actor._sprite.clearTint().setAlpha(1)
    }
  }

  // ----------------------------------------------------------------- log

  crearLog() {
    const { width, height } = VISTA
    this.logY = height - 66
    this.logFondo = this.add
      .rectangle(width / 2, this.logY + 26, width - 12, 52, 0x000000, 0.8)
      .setStrokeStyle(1, 0xe8e8e8, 0.8)
      .setDepth(3000)
    this.logTexto = this.add
      .text(12, this.logY + 6, '', { fontFamily: FUENTE, fontSize: '7px', color: '#e8e8e8', wordWrap: { width: width - 40 }, lineSpacing: 3 })
      .setDepth(3001)
    // Zona de acelerado (tap sobre el log).
    this.add
      .zone(width / 2, this.logY + 26, width, 60)
      .setInteractive()
      .on('pointerdown', () => this.acelerarLog())
      .setDepth(3002)
    this.logResolver = null
  }

  // Muestra una línea; resuelve sola a los MS_LOG o antes con tap.
  linea(texto, ctx = {}) {
    const final = Texto.tpl(texto, ctx)
    this.logTexto.setText(final)
    return new Promise((resolve) => {
      this.logResolver = resolve
      this.tiempoLog?.remove()
      this.tiempoLog = this.time.delayedCall(
        Math.min(4000, MS_LOG + final.length * 18),
        () => {
          this.logResolver = null
          resolve()
        }
      )
    })
  }

  acelerarLog() {
    if (this.logResolver) {
      this.tiempoLog?.remove()
      const r = this.logResolver
      this.logResolver = null
      r()
    }
  }

  // ---------------------------------------------------------------- botones

  crearBotones() {
    const { width } = VISTA
    this.botones = {}
    const c = this.combate
    const esp = Datos.aventura(c.aventura).comando_especial
    const cmdEsp = esp?.comando || 'especial'
    const etiquetaEsp = esp?.comando ? esp.comando.toUpperCase() : 'ESPECIAL'
    const acciones = [
      ['atacar', 'ATACAR'],
      ['objeto', 'OBJETO'],
      ['especial', etiquetaEsp],
      ['cuerno', 'CUERNO'],
      ['huida', 'HUIDA'],
    ]
    acciones.forEach(([id, etiqueta], i) => {
      const bx = 12 + i * ((width - 24) / acciones.length) + (width - 24) / acciones.length / 2 - 6
      const zona = this.add.zone(bx, this.logY - 12, 82, 18).setInteractive().setDepth(3100)
      const caja = this.add
        .rectangle(bx, this.logY - 12, 82, 16, 0x000000, 0.6)
        .setStrokeStyle(1, 0xe0c04a, 0.8)
        .setDepth(3100)
      const texto = this.add
        .text(bx, this.logY - 12, etiqueta, { fontFamily: FUENTE, fontSize: '7px', color: '#e0c04a' })
        .setOrigin(0.5)
        .setDepth(3101)
      zona.on('pointerdown', () => this.accion(id === 'especial' ? cmdEsp : id))
      this.botones[id] = { zona, caja, texto }
    })
    this.refrescarBotones()
  }

  refrescarBotones() {
    const c = this.combate
    const esp = Datos.aventura(c.aventura).comando_especial
    const tieneEspecial = !!(esp && esp.comando) // corazon, marea, eco (Brasa null)
    const tieneCuerno = partida.cantidad('cuerno_valoria') > 0
    const visibles = {
      atacar: true,
      objeto: partida.itemsApilados().some(({ id }) => Datos.item(c.aventura, id)?.tipo === 'consumible'),
      especial: tieneEspecial,
      cuerno: tieneCuerno,
      huida: true,
    }
    for (const [id, b] of Object.entries(this.botones)) {
      const v = visibles[id] && c.estado !== 'fin'
      b.zona.setVisible(v).setInteractive(v)
      b.caja.setVisible(v)
      b.texto.setVisible(v)
    }
  }

  setBotonesActivos(activos) {
    for (const b of Object.values(this.botones)) {
      b.caja.setStrokeStyle(1, activos ? 0xe0c04a : 0x555555, activos ? 0.9 : 0.5)
      b.texto.setColor(activos ? '#e0c04a' : '#777777')
      b.zona.input.enabled = activos
    }
  }

  // Selector de consumibles (botón OBJETO).
  async elegirObjeto() {
    const c = this.combate
    const opciones = partida
      .itemsApilados()
      .filter(({ id }) => Datos.item(c.aventura, id)?.tipo === 'consumible')
      .map(({ id, n }) => ({ id, etiqueta: `${Datos.item(c.aventura, id).nombre} ×${n}` }))
    if (!opciones.length) return null
    return new Promise((resolve) => {
      const { width } = VISTA
      this.selectorObjeto = this.add.container(0, 0).setDepth(3200)
      const velo = this.add.rectangle(width / 2, VISTA.height / 2, width, VISTA.height, 0, 0.6).setInteractive()
      this.selectorObjeto.add(velo)
      opciones.forEach((op, i) => {
        const y = 60 + i * 22
        const zona = this.add.zone(width / 2, y, 200, 18).setInteractive()
        const caja = this.add.rectangle(width / 2, y, 200, 16, 0x000000, 0.8).setStrokeStyle(1, 0xe0c04a, 0.8)
        const texto = this.add.text(width / 2, y, op.etiqueta, { fontFamily: FUENTE, fontSize: '7px', color: '#e8e8e8' }).setOrigin(0.5)
        zona.on('pointerdown', () => {
          this.selectorObjeto.destroy()
          this.selectorObjeto = null
          resolve(op.id)
        })
        this.selectorObjeto.add([zona, caja, texto])
      })
      const yCancel = 60 + opciones.length * 22
      const zonaC = this.add.zone(width / 2, yCancel, 200, 18).setInteractive()
      const cajaC = this.add.rectangle(width / 2, yCancel, 200, 16, 0x000000, 0.8)
      const textoC = this.add.text(width / 2, yCancel, 'volver', { fontFamily: FUENTE, fontSize: '7px', color: '#888888' }).setOrigin(0.5)
      zonaC.on('pointerdown', () => {
        this.selectorObjeto.destroy()
        this.selectorObjeto = null
        resolve(null)
      })
      this.selectorObjeto.add([zonaC, cajaC, textoC])
    })
  }

  // ---------------------------------------------------------------- flujo

  async flow() {
    const c = this.combate
    await this.linea(
      `${c.enemigos.map((e) => e.nombre).join(' y ')} ${c.enemigos.length > 1 ? 'se cruzan' : 'se cruza'} en tu camino.`
    )
    this.setBotonesActivos(false)
    await this.reproducir(c.iniciarRonda())
    while (c.estado !== 'fin') {
      this.objetivoElegido = null
      this.cursorObjetivo?.destroy()
      this.cursorObjetivo = null
      this.setBotonesActivos(true)
      this.refrescarBotones()
      this.modoObjetivo = c.estado === 'objetivo'
      if (this.modoObjetivo) {
        await this.linea('¿A quién atacas? (toca al enemigo)')
        await this.esperarObjetivo()
      }
      this.esperandoAccion = true
      this.accionPendiente = null
      await new Promise((resolve) => (this.resolveAccion = resolve))
      this.esperandoAccion = false
      this.setBotonesActivos(false)
      await this.resolverAccionJugador()
      if (c.estado === 'fin') break
      if (!this.huidaFallida) {
        await this.reproducir(c.turnoAliados(this.objetivoElegido || 0))
        if (c.estado === 'fin') break
        await this.reproducir(c.turnoEnemigos())
        if (c.estado === 'fin') break
        await this.reproducir(c.iniciarRonda())
      } else {
        this.huidaFallida = false
        await this.reproducir(c.iniciarRonda())
      }
    }
    this.setBotonesActivos(false)
    this.refrescarBotones()
    await this.finalizar()
  }

  esperarObjetivo() {
    if (!this.modoObjetivo) return Promise.resolve(0)
    return new Promise((resolve) => (this.resolveObjetivo = resolve))
  }

  tapEnemigo(idx) {
    if (this.modoObjetivo && this.resolveObjetivo) {
      const vivos = this.combate.enemigosVivos()
      const enemigo = this.combate.enemigos[idx]
      if (!enemigo || enemigo.vida <= 0) return
      const r = this.resolveObjetivo
      this.resolveObjetivo = null
      this.modoObjetivo = false
      this.objetivoElegido = vivos.indexOf(enemigo)
      this.cursorObjetivo?.destroy()
      const s = enemigo._sprite
      this.cursorObjetivo = this.add
        .text(s.x, s.y - s.displayHeight - 22, '▼', { fontFamily: FUENTE, fontSize: '8px', color: '#e0c04a' })
        .setOrigin(0.5)
        .setDepth(250)
      r(this.objetivoElegido)
    }
  }

  accion(id) {
    if (!this.esperandoAccion || this.combate.estado === 'fin') return
    if (id === 'objeto') {
      this.esperandoAccion = false
      this.elegirObjeto().then((itemId) => {
        if (!itemId) {
          // Volver al menú sin gastar turno.
          this.esperandoAccion = true
          return
        }
        this.accionPendiente = { accion: 'objeto', itemId }
        this.resolveAccion && this.resolveAccion()
      })
      return
    }
    // Con varios enemigos el objetivo ya se eligió con el tap (flujo).
    this.accionPendiente = { accion: id }
    this.resolveAccion && this.resolveAccion()
  }

  async resolverAccionJugador() {
    const c = this.combate
    const pend = this.accionPendiente
    this.accionPendiente = null
    if (!pend) return
    const idx = this.objetivoElegido || 0
    if (pend.accion === 'huida') {
      const { huida, eventos } = c.intentarHuida()
      await this.reproducir(eventos)
      if (!huida) {
        this.huidaFallida = true
        await this.reproducir(c.turnoEnemigos())
        if (c.estado === 'fin') return
        await this.reproducir(c.iniciarRonda())
      }
      return
    }
    const eventos = c.accionHeroe(pend.accion, { objetivoIdx: idx, itemId: pend.itemId })
    await this.reproducir(eventos)
  }

  // Traduce eventos del motor a animaciones + líneas de log.
  async reproducir(eventos) {
    for (const ev of eventos) {
      switch (ev.tipo) {
        case 'ronda':
          await this.linea(`— ronda ${ev.numero} —`)
          break
        case 'dano': {
          const actor = ev.lado === 'heroes' ? this.combate.heroes[ev.idx] : this.combate.enemigos[ev.idx]
          if (!actor) break
          this.fxGolpe(actor, ev.cantidad)
          if (ev.texto) await this.linea(ev.texto)
          else if (ev.autor) await this.linea(`${ev.autor} golpea: −${ev.cantidad} PV a ${actor.nombre}.`)
          else await this.linea(`Golpeas a ${actor.nombre} por ${ev.cantidad}.`)
          this.refrescarBarras()
          break
        }
        case 'curar': {
          const a = ev.lado === 'heroes' ? this.combate.heroes[ev.idx] : this.combate.enemigos[ev.idx]
          this.fxCura(a, ev.cantidad)
          this.refrescarBarras()
          break
        }
        case 'muerte':
          await this.linea(`${ev.nombre} cae.`)
          this.refrescarBarras()
          break
        case 'caido':
          await this.linea(`${ev.nombre} se queda atras, caido.`)
          this.refrescarBarras()
          break
        case 'fase': {
          const e = this.combate.enemigos[ev.idx]
          this.fxCambioFase(e)
          await this.linea(ev.texto)
          this.refrescarBarras()
          break
        }
        case 'aviso':
          await this.linea(ev.texto)
          break
        case 'grieta':
          await this.linea(`La grieta se abre un poco mas: ${ev.valor}/100 (+${ev.subida}).`)
          break
        case 'texto':
          await this.linea(ev.texto, ev.ctx)
          break
        case 'refuerzo':
          await this.linea(ev.texto)
          this.agregarSpriteRefuerzo(ev.idx)
          break
        case 'fin':
        case 'caida':
        case 'derrota':
          break
        default:
          break
      }
    }
  }

  agregarSpriteRefuerzo(idx) {
    const e = this.combate.enemigos[idx]
    const escala = this.esJefe(e) ? 2 : 1
    const s = this.add
      .sprite(300 + idx * 30, 96 + idx * 10, this.texturaSpriteEnemigo(e.id))
      .setOrigin(0.5, 1)
      .setDepth(100 + idx)
      .setScale(escala)
      .setFlipX(true)
      .setInteractive({ useHandCursor: true })
    s.on('pointerdown', () => this.tapEnemigo(idx))
    this.spritesEnemigos[idx] = s
    this.crearBarra(s, e, 'der')
    this.refrescarBarras()
  }

  // -------------------------------------------------------------------- FX

  fxGolpe(actor, cantidad) {
    const s = actor._sprite
    if (!s) return
    if (actor.tipo === 'heroe') {
      audio8.sfx('dano')
    } else {
      audio8.sfx('golpe')
    }
    // Lunge del atacante lo maneja el llamador; aquí shake + número flotante.
    this.cameras.main.shake(90, 0.004)
    const n = this.add
      .text(s.x, s.y - s.displayHeight - 4, `-${cantidad}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e05050',
      })
      .setOrigin(0.5)
      .setDepth(400)
    this.tweens.add({ targets: n, y: n.y - 16, alpha: 0, duration: 700, onComplete: () => n.destroy() })
    this.tweens.add({ targets: s, x: s.x + 4, duration: 50, yoyo: true, repeat: 2 })
  }

  fxCura(actor, cantidad) {
    const s = actor._sprite
    if (!s) return
    audio8.sfx('curacion')
    const n = this.add
      .text(s.x, s.y - s.displayHeight - 4, `+${cantidad}`, {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#9ad09a',
      })
      .setOrigin(0.5)
      .setDepth(400)
    this.tweens.add({ targets: n, y: n.y - 16, alpha: 0, duration: 700, onComplete: () => n.destroy() })
  }

  fxCambioFase(enemigo) {
    const s = enemigo._sprite
    if (!s) return
    s.setTintFill(0xffffff)
    this.time.delayedCall(140, () => s.clearTint())
    this.cameras.main.flash(160, 255, 255, 255)
  }

  // -------------------------------------------------------------- final

  async finalizar() {
    const c = this.combate
    if (c.resultado === 'victoria') {
      const res = c.aplicarResultado()
      audio8.sfx('victoria')
      await this.linea('Has vencido.')
      if (res.xp) await this.linea(`Ganas ${res.xp} de experiencia.`)
      for (let i = 0; i < res.subidasNivel; i++) {
        audio8.sfx('nivel')
        await this.linea('¡Subes de nivel! +5 PV maximos' + (partida.nivel % 2 === 0 ? ' y +1 ataque.' : '.'))
      }
      await this.acabar('victoria')
    } else if (c.resultado === 'huida') {
      c.aplicarResultado()
      await this.acabar('huida')
    } else if (c.resultado === 'derrota') {
      c.aplicarResultado()
      audio8.sfx('derrota')
      await this.linea('La vista se llena de ceniza…')
      await this.acabar('derrota')
    } else if (c.resultado === 'caida') {
      c.aplicarResultado()
      audio8.sfx('derrota')
      await this.linea('La grieta se abre del todo.')
      await this.acabar('caida')
    }
  }

  async acabar(resultado) {
    await new Promise((r) => this.time.delayedCall(600, r))
    this.cameras.main.fadeOut(300, 0, 0, 0)
    await new Promise((r) => this.cameras.main.once('camerafadeoutcomplete', r))
    this.scene.stop('Battle')
    if (resultado === 'derrota' || resultado === 'caida') {
      this.scene.stop('Ui')
      this.scene.stop('World')
      this.scene.start('Epilogo', { tipo: resultado === 'caida' ? 'caida' : 'muerte' })
      return
    }
    if (this.origen === 'Arena') {
      this.scene.stop('Arena')
      this.scene.start('Arena', { resultado })
      return
    }
    this.scene.wake('World', { resultado, idx: this.datosEntrada.idx })
  }
}

export default BattleScene
