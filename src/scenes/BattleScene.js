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
import { VISTA, aplicarRes, alRelayout, esVistaVertical } from '../core/resolucion.js'
import { crearTexturaHeroe, crearTexturaEnemigo } from '../core/Sprites.js'
import { audio8 } from '../core/Audio8.js'
import { secretoActivo, secretoDisponible } from './secretos.js'
import LogBatalla from './batalla/LogBatalla.js'
import Botonera from './batalla/Botonera.js'
import { dibujarFondo as dibujarFondoBioma, texturaSpriteCompanero } from './batalla/escenario.js'
import { cargarHeroe, salirDelMundo } from './navegacion.js'

import { FUENTE } from '../ui/tema.js'

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle')
  }

  init(data) {
    this.datosEntrada = data
    this.origen = data.origen || 'World'
  }

  preload() {
    cargarHeroe(this)
  }

  create() {
    aplicarRes(this)

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

    // Giro de dispositivo: re-encuadre del combate sin perder su estado
    // (el flujo async y las Promises pendientes siguen vivas).
    alRelayout(this, () => this.relayout())

    this.cameras.main.fadeIn(250)
    this.flow()
  }

  // ------------------------------------------------------- layout adaptativo
  // Horizontal (480×270): héroes a la izquierda, enemigos a la derecha.
  // Vertical (270×480): enemigos arriba, héroes debajo; el log y los
  // botones ocupan la franja inferior.

  posHeroe(i) {
    if (esVistaVertical()) return { x: 72 + i * 22, y: VISTA.height - 170 - i * 22 }
    return { x: 84 - i * 26, y: 96 - i * 12 }
  }

  posEnemigo(i) {
    if (esVistaVertical()) {
      return { x: 168 + (i % 2) * 56, y: 150 + Math.floor(i / 2) * 64 }
    }
    return { x: 356 + i * 30, y: 96 + i * 10 }
  }

  // Re-encuadre completo al cambiar la orientación.
  relayout() {
    this.dibujarFondo(this.datosEntrada.lugar)
    this.spritesHeroes?.forEach((s, i) => {
      const p = this.posHeroe(i)
      s.setPosition(p.x, p.y)
    })
    this.spritesEnemigos?.forEach((s, i) => {
      if (!s) return
      const p = this.posEnemigo(i)
      s.setPosition(p.x, p.y)
    })
    this.reposicionarBarras()
    this.relayoutLog()
    this.relayoutBotones()
    this.btnSecreto?.setPosition(VISTA.width - 20, 16)
    // Transitorios: se vuelven a crear al vuelo si hacen falta.
    this.cursorObjetivo?.destroy()
    this.cursorObjetivo = null
    this.panelFinalGrupo?.forEach((o) => o.destroy())
    this.panelFinalGrupo = null
    if (this.selectorObjeto) {
      const resolver = this.selectorObjetoResolver
      this.selectorObjeto.destroy()
      this.selectorObjeto = null
      this.selectorObjetoResolver = null
      // Vuelve al menú de acciones sin gastar turno.
      resolver && resolver(null)
    }
  }

  reposicionarBarras() {
    for (const actor of [...this.combate.heroes, ...this.combate.enemigos]) {
      if (!actor._sprite) continue
      actor._barra?.setPosition(actor._sprite.x, actor._sprite.y - actor._sprite.displayHeight - 12)
      actor._nombre?.setPosition(actor._sprite.x, actor._sprite.y + 4)
    }
  }

  crearSecretoBatalla() {
    const activo = secretoActivo(this.combate.aventura)
    if (!activo || !activo.sec.texto_combate) return
    if (!secretoDisponible(partida, activo.tipo)) return

    const iconos = {
      cuervo: '𓅃',
      abejas: '𓆤',
      gaviota: '𓅪',
      campanilla: '𓏢',
    }
    const icono = iconos[activo.tipo] || '✧'
    const { width } = VISTA
    this.btnSecreto = this.add
      .text(width - 20, 16, icono, {
        fontSize: '11px',
        color: '#888899',
      })
      .setOrigin(0.5)
      .setDepth(3100)
      .setInteractive({ useHandCursor: true })

    this.btnSecreto.on('pointerdown', () => this.mostrarSecreto(activo.sec.texto_combate))
  }

  // El texto del secreto va en un recuadro propio: nunca pasa por linea()
  // para no pisar una línea en curso del flujo de combate.
  mostrarSecreto(texto) {
    this.avisoSecreto?.destroy()
    const { width } = VISTA
    const fondo = this.add
      .rectangle(width / 2, 36, width - 72, 40, 0x000000, 0.85)
      .setStrokeStyle(1, 0x8a8a9a, 0.8)
      .setDepth(3300)
      .setInteractive({ useHandCursor: true })
    const txt = this.add
      .text(width / 2, 36, Texto.tpl(texto), {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#c8c8d8',
        wordWrap: { width: width - 90 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(3301)
    const aviso = {
      destroy: () => {
        fondo.destroy()
        txt.destroy()
      },
    }
    this.avisoSecreto = aviso
    fondo.on('pointerdown', () => {
      if (this.avisoSecreto === aviso) this.avisoSecreto.destroy()
    })
    this.time.delayedCall(3600, () => {
      if (this.avisoSecreto === aviso) this.avisoSecreto.destroy()
    })
  }

  // ------------------------------------------------------------ fondo/sprites

  // Banda de suelo por bioma (batalla/escenario.js), redibujable al girar.
  dibujarFondo(lugarId) {
    dibujarFondoBioma(this, lugarId)
  }

  crearSprites() {
    // Héroes: héroe delante con su paleta propia, compañeros detrás en diagonal.
    this.spritesHeroes = this.combate.heroes.map((h, i) => {
      const tex = h.tipo === 'heroe' ? crearTexturaHeroe(this, partida.heroe || 'tilo') : texturaSpriteCompanero(this, h.id)
      const p = this.posHeroe(i)
      const s = this.add
        .sprite(p.x, p.y, tex, h.tipo === 'heroe' ? 0 : undefined)
        .setOrigin(0.5, 1)
        .setDepth(100 - i)
        .setFlipX(false)
      this.crearBarra(s, h, 'izq')
      return s
    })
    // Enemigos al lado opuesto; jefes (sin_huida o con fases) a doble escala.
    this.spritesEnemigos = this.combate.enemigos.map((e, i) => {
      const escala = this.esJefe(e) ? 2 : 1
      const p = this.posEnemigo(i)
      const s = this.add
        .sprite(p.x, p.y, this.texturaSpriteEnemigo(e.id))
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
      if (actor.vida <= 0)
        actor._sprite.setTint(0x3a3a3a).setTintMode(Phaser.TintModes.FILL).setAlpha(0.6)
      else if (actor._sprite.tintTopLeft !== 0xffffff) actor._sprite.clearTint().setAlpha(1)
    }
  }

  // ----------------------------------------------------------------- log

  crearLog() {
    this.log = new LogBatalla(this)
    this.logY = this.log.logY
  }

  relayoutLog() {
    this.log?.relayout()
    if (this.log) this.logY = this.log.logY
  }

  // Delegaciones finas sobre batalla/LogBatalla.js (el flujo las usa).
  linea(texto, ctx) {
    return this.log.linea(texto, ctx)
  }

  acelerarLog() {
    this.log?.acelerar()
  }

  // ---------------------------------------------------------------- botones

  crearBotones() {
    this.botonera = new Botonera(this, { onAccion: (id) => this.accion(id) })
  }

  // Delegaciones finas sobre batalla/Botonera.js (flujo y tests las usan).
  relayoutBotones() {
    this.botonera?.relayout()
  }

  refrescarBotones() {
    this.botonera?.refrescar()
  }

  setBotonesActivos(activos) {
    this.botonera?.setActivos(activos)
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
      this.selectorObjetoResolver = resolve
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
    try {
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
    } catch (err) {
      console.error('Error en BattleScene.flow:', err)
      await this.acabar('victoria')
    }
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
    if (this.combate.estado === 'fin') return

    // Si estamos en selección de objetivo y se pulsa una acción, seleccionar primer enemigo vivo por defecto.
    if (this.modoObjetivo && this.resolveObjetivo) {
      this.tapEnemigo(0)
    }

    if (!this.esperandoAccion) return
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
    // Con varios enemigos el objetivo ya se eligió con el tap (flujo) o se resolvió por defecto.
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
    const p = this.posEnemigo(idx)
    const s = this.add
      .sprite(p.x, p.y, crearTexturaEnemigo(this, e.id))
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
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL)
    this.time.delayedCall(140, () => s.clearTint())
    this.cameras.main.flash(160, 255, 255, 255)
  }

  // -------------------------------------------------------------- final

  async finalizar() {
    const c = this.combate
    if (c.resultado === 'victoria') {
      const res = c.aplicarResultado()
      audio8.sfx('victoria')
      this.cameras?.main?.flash?.(200, 255, 255, 255)
      const lineas = []
      if (res?.xp) lineas.push(`Ganas ${res.xp} de experiencia.`)
      for (let i = 0; i < (res?.subidasNivel || 0); i++) {
        audio8.sfx('nivel')
        lineas.push('¡Subes de nivel! +5 PV maximos' + (partida.nivel % 2 === 0 ? ' y +1 ataque.' : '.'))
      }
      await this.panelFinal('¡VICTORIA!', lineas, '#e0c04a')
      await this.acabar('victoria')
    } else if (c.resultado === 'huida') {
      c.aplicarResultado()
      await this.panelFinal('ESCAPAS', ['Retrocedes hasta perder el ruido del combate.'], '#9a9aa8')
      await this.acabar('huida')
    } else if (c.resultado === 'derrota') {
      c.aplicarResultado()
      audio8.sfx('derrota')
      await this.panelFinal('DERROTA', ['La vista se llena de ceniza…'], '#e05050')
      await this.acabar('derrota')
    } else if (c.resultado === 'caida') {
      c.aplicarResultado()
      audio8.sfx('derrota')
      await this.panelFinal('LA GRIETA SE ABRE', ['La luz se parte en dos.'], '#b07a9a')
      await this.acabar('caida')
    } else {
      c.aplicarResultado?.()
      await this.acabar(c.resultado || 'victoria')
    }
  }

  // Panel de cierre de combate: título grande + líneas de resultado. Avanza
  // con tap en cualquier parte (o solo tras un tiempo) para que el final se
  // lea como un cierre y no como una línea de log cualquiera.
  async panelFinal(titulo, lineas, color) {
    if (!this.add) return
    const { width, height } = VISTA
    const alto = 58 + lineas.length * 12
    const cy = height / 2 - 18
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color
    const velo = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45).setDepth(3300)
    const caja = this.add
      .rectangle(width / 2, cy, width - 56, alto, 0x000000, 0.92)
      .setStrokeStyle(2, colorNum, 1)
      .setDepth(3301)
    const txt = this.add
      .text(width / 2, cy - alto / 2 + 16, titulo, { fontFamily: FUENTE, fontSize: '14px', color })
      .setOrigin(0.5)
      .setDepth(3302)
    const detalle = this.add
      .text(width / 2, cy + 6, lineas.join('\n'), {
        fontFamily: FUENTE,
        fontSize: '7px',
        color: '#e8e8e8',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(3302)
    const hint = this.add
      .text(width / 2, cy + alto / 2 - 9, 'toca para continuar', { fontFamily: FUENTE, fontSize: '6px', color: '#888899' })
      .setOrigin(0.5)
      .setDepth(3302)
    const zona = this.add.zone(width / 2, height / 2, width, height).setInteractive().setDepth(3399)
    this.tweens?.add({ targets: txt, scale: { from: 1.6, to: 1 }, alpha: { from: 0, to: 1 }, duration: 220, ease: 'Back.out' })
    this.tweens?.add({ targets: hint, alpha: 0.3, duration: 480, yoyo: true, repeat: -1 })

    this.panelFinalGrupo = [velo, caja, txt, detalle, hint, zona]
    const ms = lineas.length ? 3400 : 2200
    await new Promise((resolve) => {
      let fired = false
      const done = () => {
        if (!fired) {
          fired = true
          resolve()
        }
      }
      zona.once('pointerdown', done)
      this.time.delayedCall(ms, done)
      setTimeout(done, ms + 100)
    })
    this.panelFinalGrupo?.forEach((o) => o.destroy())
    this.panelFinalGrupo = null
  }

  async acabar(resultado) {
    try {
      await new Promise((r) => {
        let fired = false
        const done = () => {
          if (!fired) {
            fired = true
            r()
          }
        }
        this.time.delayedCall(300, done)
        setTimeout(done, 350)
      })

      this.cameras.main.fadeOut(300, 0, 0, 0)
      await new Promise((r) => {
        let fired = false
        const done = () => {
          if (!fired) {
            fired = true
            r()
          }
        }
        this.cameras.main.once('camerafadeoutcomplete', done)
        this.time.delayedCall(350, done)
        setTimeout(done, 400)
      })

      if (resultado === 'derrota' || resultado === 'caida') {
        salirDelMundo(this, 'Epilogo', { tipo: resultado === 'caida' ? 'caida' : 'muerte' })
        this.scene.stop('Battle')
        return
      }
      if (this.origen === 'Arena') {
        this.scene.stop('Arena')
        this.scene.start('Arena', { resultado })
        this.scene.stop('Battle')
        return
      }

      this.scene.wake('World', { resultado, idx: this.datosEntrada?.idx })
      this.scene.stop('Battle')
    } catch (err) {
      console.error('Error en BattleScene.acabar:', err)
      try {
        this.scene.wake('World', { resultado, idx: this.datosEntrada?.idx })
      } catch (e) {}
      try {
        this.scene.stop('Battle')
      } catch (e) {}
    }
  }
}

export default BattleScene
