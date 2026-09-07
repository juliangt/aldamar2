// WorldScene — escena genérica de lugar top-down (Fase A): carga el mapa
// Tiled del lugar activo, colisiones, jugador con cámara, transiciones
// entre lugares validando `requiere`. La interfaz (HUD, táctil, pausa)
// vive en UiScene, lanzada en paralelo con cámara a zoom 1.
// La construcción del mundo delega en los módulos de scenes/mundo/
// (texturas, carteles, npcs, pickups, enemigos) y los secretos en
// scenes/secretos.js; aquí queda el ciclo de vida, el jugador, las
// salidas y el flujo de combate/eventos.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import EventEngine from '../core/EventEngine.js'
import ValidadorMapa from '../core/ValidadorMapa.js'
import { aplicarRes } from '../core/resolucion.js'
import { partida } from '../core/partida.js'
import { crearTexturaHeroe } from '../core/Sprites.js'
import { audio8, obtenerBioma } from '../core/Audio8.js'
import { secretoEnLugar, resolverTextoSecreto } from './secretos.js'
import { crearTexturasCarteles, crearTexturasFx, texturaSecreto } from './mundo/texturas.js'
import { crearCarteles } from './mundo/carteles.js'
import { crearNpcs, hablar as hablarNpc, ctxDialogo as ctxDialogoNpc } from './mundo/npcs.js'
import { crearPickups, recoger as recogerPickup } from './mundo/pickups.js'
import { crearEnemigos, puedeIniciarCombate, enemigosDeBatalla } from './mundo/enemigos.js'
import { cargarHeroe, salirDelMundo } from './navegacion.js'
import { FUENTE } from '../ui/tema.js'

const VELOCIDAD = 110
const LADO_OPUESTO = { N: 'S', S: 'N', E: 'O', O: 'E' }
const RADIO_INTERACCION = 28

export class WorldScene extends Phaser.Scene {
  constructor() {
    super('World')
  }

  init(data) {
    this.aventura = data.aventura || partida.aventura
    this.lugarId = data.lugar || partida.lugar
    this.entrada = data.entrada ?? partida.entrada // N/S/E/O o null (centro)
    this.transicionando = false
    this.pausado = false
    this.graciaHuida = 0
  }

  preload() {
    this.load.tilemapTiledJSON(
      `mapa:${this.lugarId}`,
      `maps/${this.aventura}/${this.lugarId}.json`
    )
    if (!this.textures.exists('tiny_dungeon'))
      this.load.image('tiny_dungeon', 'tilesets/tiny_dungeon.png')
    cargarHeroe(this)
  }

  create() {
    const lugar = Datos.lugar(this.aventura, this.lugarId)
    this.lugar = lugar

    const mapa = this.make.tilemap({ key: `mapa:${this.lugarId}` })
    const tiles = mapa.addTilesetImage('tiny_dungeon', 'tiny_dungeon')

    mapa.createLayer('suelo', tiles).setDepth(0)
    this.capaObstaculos = mapa.createLayer('obstaculos', tiles).setDepth(10)
    this.capaObstaculos.setCollisionByProperty({ colision: true })
    mapa.createLayer('decoracion', tiles).setDepth(20)
    // «frente» tapa al jugador: depth muy alto dentro del orden por fila.
    mapa.createLayer('frente', tiles).setDepth(5000)

    this.physics.world.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels)

    this.crearJugador(mapa)
    crearTexturasFx(this)
    crearTexturasCarteles(this)
    this.crearSalidas(mapa)
    crearCarteles(this, mapa, this.datosSalidas, this.capaObstaculos)
    crearNpcs(this, mapa, lugar)
    crearPickups(this, mapa)
    crearEnemigos(this, mapa, lugar)
    this.crearGatillos(mapa, lugar)
    this.crearDescanso(mapa, lugar)
    this.crearSecretoExterior(mapa)
    this.validarObjetos(mapa, lugar)

    const cam = this.cameras.main
    cam.setBounds(0, 0, mapa.widthInPixels, mapa.heightInPixels)
    aplicarRes(this, 2)
    cam.startFollow(this.jugador, true, 0.5, 0.5)
    cam.fadeIn(250)

    // Interfaz en paralelo (HUD, banner, táctil, pausa).
    this.ui = this.scene.get('Ui')
    this.scene.launch('Ui', { nombre: lugar.nombre })
    this.uiAdaptador = this.crearUiAdaptador()

    cam.once('camerafadeincomplete', () => this.iniciarLugar())

    this.teclas = this.input.keyboard.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER'
    )

    this.registrarWake()

    const bioma = obtenerBioma(this.lugarId)
    audio8.iniciarAmbiente(bioma)
  }

  // ------------------------------------------------------------------ jugador

  crearJugador(mapa) {
    const heroeId = partida.heroe || 'tilo'
    this.texHeroe = crearTexturaHeroe(this, heroeId)
    const spawn = this.resolverSpawn(mapa)
    this.jugador = this.physics.add.sprite(spawn.x, spawn.y, this.texHeroe)
    this.jugador.body.setSize(12, 10)
    this.jugador.body.setOffset(2, 6)
    this.jugador.setCollideWorldBounds(true)
    this.jugador.setDepth(spawn.y)
    this.physics.add.collider(this.jugador, this.capaObstaculos)

    this.crearAnimaciones()
    this.jugador.anims.play(`${this.texHeroe}-abajo`)
    this.mirando = 'abajo'
  }

  resolverSpawn(mapa) {
    const capasSpawns = mapa.getObjectLayer('spawns')
    const objetos = capasSpawns ? capasSpawns.objects : []
    // Convención de spawns: un punto por lado (N/S/E/O) y «centro» para el
    // inicio de aventura; se clasifican por posición dentro del mapa.
    const clasificar = (o) => {
      const esIzq = o.x < 16 * 3
      const esDer = o.x > mapa.widthInPixels - 16 * 3
      const esArr = o.y < 16 * 3
      const esAbj = o.y > mapa.heightInPixels - 16 * 3
      if (esIzq) return 'O'
      if (esDer) return 'E'
      if (esArr) return 'N'
      if (esAbj) return 'S'
      return 'centro'
    }
    const porLado = {}
    for (const o of objetos) porLado[clasificar(o)] = o
    const lado = this.entrada || 'centro'
    const punto = porLado[lado] || porLado.centro || {
      x: mapa.widthInPixels / 2,
      y: mapa.heightInPixels / 2,
    }
    return { x: punto.x, y: punto.y }
  }

  crearAnimaciones() {
    const tex = this.texHeroe || 'heroe'
    if (this.anims.exists(`${tex}-abajo`)) return
    const filas = { abajo: 0, arriba: 1, lado: 2 }
    for (const [nombre, fila] of Object.entries(filas)) {
      this.anims.create({
        key: `${tex}-${nombre}`,
        frames: this.anims.generateFrameNumbers(tex, {
          frames: [fila * 3, fila * 3 + 1, fila * 3, fila * 3 + 2],
        }),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `${tex}-${nombre}-parado`,
        frames: [{ key: tex, frame: fila * 3 }],
        frameRate: 1,
      })
    }
  }

  // ------------------------------------------------------------------ salidas

  crearSalidas(mapa) {
    this.salidas = []
    this.datosSalidas = []
    const capa = mapa.getObjectLayer('salidas')
    if (!capa) return
    for (const o of capa.objects) {
      const props = this.leerProps(o)
      this.datosSalidas.push({
        x: o.x,
        y: o.y,
        width: o.width,
        height: o.height,
        dir: props.dir,
        props,
      })
      const rect = this.add.rectangle(
        o.x + o.width / 2,
        o.y + o.height / 2,
        Math.max(o.width, 8),
        Math.max(o.height, 8)
      )
      this.physics.add.existing(rect, true)
      rect.props = props
      rect.setVisible(false)
      this.salidas.push(rect)
      this.physics.add.overlap(this.jugador, rect, () =>
        this.intentarSalida(rect.props)
      )
    }
  }

  leerProps(objeto) {
    const props = {}
    for (const p of objeto.properties || []) props[p.name] = p.value
    return props
  }

  intentarSalida({ hacia, dir }) {
    if (this.transicionando || this.pausado || !hacia) return

    const destino = Datos.lugar(this.aventura, hacia)
    // Puerta con requisito: ítem o flag no presente → toast + cooldown 1 s.
    const cumple =
      !destino?.requiere ||
      partida.inventario.includes(destino.requiere) ||
      partida.tieneFlag(destino.requiere)
    if (!cumple) {
      if (this.time.now < (this.cooldownToast || 0)) return
      this.cooldownToast = this.time.now + 1000
      this.ui && this.ui.toast(destino.requiere_texto || 'No puedes pasar todavía.')
      return
    }

    this.transicionando = true
    audio8.sfx('confirmar')
    audio8.detenerAmbiente(true)
    partida.lugar = hacia
    partida.entrada = LADO_OPUESTO[dir] || null
    partida.guardar() // autosave (stub de Fase A)
    this.scene.stop('Ui')
    this.cameras.main.fadeOut(200, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.restart({ aventura: this.aventura, lugar: hacia, entrada: partida.entrada })
    )
  }

  // ------------------------------------------------------------------ pausa

  alternarPausa() {
    this.pausado = !this.pausado
    this.ui && this.ui.setPausa(this.pausado)
  }

  // ------------------------------------------------------- Fase D: combate

  tocarEnemigo(enemigo) {
    const ahora = this.game?.loop?.time || Date.now()
    if (!puedeIniciarCombate(this, ahora)) return
    this.transicionando = true

    const { ids, enCurso } = enemigosDeBatalla(this)
    this.enemigoEnCurso = enCurso

    audio8.detenerAmbiente(true)

    this.scene.sleep('Ui')
    this.scene.sleep('World')
    this.scene.launch('Battle', {
      enemigos: ids,
      origen: 'World',
      lugar: this.lugarId,
    })
  }

  // La BattleScene despierta al mundo con {resultado}: victoria retira al
  // grupo; huida reposiciona al jugador fuera de contacto con 1,5 s de gracia.
  registrarWake() {
    this.events.on(Phaser.Scenes.Events.WAKE, (sys, data) => {
      this.transicionando = false
      audio8.iniciarAmbiente(obtenerBioma(this.lugarId))
      this.scene.wake('Ui')
      this.ui?.refrescarHud()
      if (!data || !data.resultado) return

      // Si venía de una emboscada (EventEngine.emboscar), se resuelve la Promise
      // y no se tocan enemigos del mapa (los enemigos del evento no existen en él).
      if (this.resolverBatalla) {
        const resolver = this.resolverBatalla
        this.resolverBatalla = null
        resolver(data.resultado)
        return
      }

      if (data.resultado === 'victoria') {
        if (this.enemigoEnCurso) {
          this.enemigoEnCurso.derrotado = true
          this.enemigoEnCurso.sprite?.destroy()
          this.enemigoEnCurso = null
        } else {
          for (const e of this.enemigosMapa || []) {
            e.derrotado = true
            e.sprite?.destroy()
          }
        }
        this.enemigosMapa = this.enemigosMapa.filter((e) => !e.derrotado)
      } else if (data.resultado === 'huida') {
        // Empujar al jugador lejos del enemigo más cercano + gracia.
        let masCercano = null
        let mejorD = Infinity
        for (const e of this.enemigosMapa || []) {
          if (e.derrotado || !e.sprite) continue
          const d = Math.hypot(e.sprite.x - this.jugador.x, e.sprite.y - this.jugador.y)
          if (d < mejorD) {
            mejorD = d
            masCercano = e
          }
        }
        if (masCercano && masCercano.sprite) {
          const dx = this.jugador.x - masCercano.sprite.x
          const dy = this.jugador.y - masCercano.sprite.y
          const len = Math.hypot(dx, dy) || 1
          this.jugador.x += (dx / len) * 40
          this.jugador.y += (dy / len) * 40
        }
        const ahora = this.game?.loop?.time || Date.now()
        this.graciaHuida = ahora + 1500
        this.ui?.toast('Escapas por los pelos.')
      }
    })
  }

  // ---------------------------------------------------- Fase E: eventos y gatillos

  crearUiAdaptador() {
    return {
      decir: (texto, ctx) => this.ui.decir(texto, ctx || this.ctxDialogo()),
      decidir: (pregunta, opciones, ctx) =>
        this.ui.elegir(pregunta, opciones, ctx || this.ctxDialogo()),
      batalla: (enemigos) => this.iniciarCombateForzado(enemigos),
      toast: (msg) => this.ui?.toast(msg),
      refrescar: () => this.ui?.refrescarHud(),
      caida: () => salirDelMundo(this, 'Epilogo', { tipo: 'caida' }),
      final: (elegida, evento) => {
        const res = EventEngine.resolverFinal(partida, evento, elegida)
        salirDelMundo(this, 'Epilogo', res)
      },
    }
  }

  iniciarCombateForzado(enemigos) {
    return new Promise((resolve) => {
      this.resolverBatalla = resolve
      this.transicionando = true
      this.scene.sleep('Ui')
      this.scene.sleep('World')
      this.scene.launch('Battle', {
        enemigos,
        origen: 'World',
        lugar: this.lugarId,
        esEmboscada: true,
      })
    })
  }

  // Gatillos de la capa «eventos»: objetos punto o rect que activan
  // decisiones o el final al tocarlos o interactuar.
  crearGatillos(mapa, _lugar) {
    this.gatillos = []
    const capa = mapa.getObjectLayer('eventos')
    if (!capa) return
    for (const o of capa.objects) {
      const props = this.leerProps(o)
      const eventoId = props.evento || o.name
      if (!eventoId) continue
      const evento = Datos.evento(this.aventura, eventoId)
      if (!evento) continue

      const x = o.x + (o.width ? o.width / 2 : 0)
      const y = o.y + (o.height ? o.height / 2 : 0)

      let marcador = null
      if (o.point || (!o.width && !o.height)) {
        marcador = this.add
          .text(x, y - 8, '✧', { fontFamily: FUENTE, fontSize: '8px', color: '#e8d8a8' })
          .setOrigin(0.5)
          .setDepth(y + 1)
        this.tweens.add({ targets: marcador, y: y - 12, duration: 600, yoyo: true, repeat: -1 })
      }

      const gatillo = {
        id: o.id,
        eventoId,
        evento,
        x,
        y,
        marcador,
        props,
      }
      this.gatillos.push(gatillo)
    }
  }

  async activarGatillo(gatillo) {
    if (this.transicionando || this.pausado || this.ui?.modal) return
    const vivos = (this.enemigosMapa || []).filter((e) => !e.derrotado)
    const limpio = vivos.length === 0
    const res = await EventEngine.gatillo(
      partida,
      gatillo.eventoId,
      this.uiAdaptador,
      this.ctxDialogo(),
      { limpio }
    )
    if (res === 'pendiente' && !limpio && gatillo.evento?.tipo === 'final') {
      this.ui?.toast('Aún quedan enemigos custodiando el lugar.')
    }
    if (
      gatillo.marcador &&
      EventEngine.consumida(partida, gatillo.evento, gatillo.eventoId, true)
    ) {
      gatillo.marcador.setVisible(false)
    }
  }

  // Cama/fogón pintado en la capa «descanso»: punto interactivo en lugares
  // con `descanso: true`.
  crearDescanso(mapa, lugar) {
    this.descanso = null
    if (!lugar.descanso) return
    const punto = mapa.getObjectLayer('descanso')?.objects?.[0]
    if (!punto) {
      console.warn(`[mapa:${this.lugarId}] lugar con descanso:true sin punto «descanso»`)
      return
    }
    const marca = this.add
      .text(punto.x, punto.y - 8, 'z', { fontFamily: FUENTE, fontSize: '8px', color: '#9ad09a' })
      .setOrigin(0.5)
      .setDepth(punto.y + 1)
    this.tweens.add({ targets: marca, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 })
    this.descanso = { x: punto.x, y: punto.y }
  }

  // Fade a negro, PV al máximo del grupo entero, gratis (va por la casa).
  descansar() {
    if (this.transicionando || this.pausado || this.ui?.modal) return
    this.transicionando = true // reutiliza el bloqueo de update
    const cam = this.cameras.main
    cam.fadeOut(350, 0, 0, 0)
    cam.once('camerafadeoutcomplete', () => {
      partida.descansar()
      this.ui?.refrescarHud()
      this.ui?.toast(this.lugar.descanso_texto || 'Duermes sin sueños. PV al máximo; el descanso va por la casa.')
      cam.fadeIn(350, 0, 0, 0)
      cam.once('camerafadeincomplete', () => (this.transicionando = false))
    })
  }

  // NPC: delegación fina sobre scenes/mundo/npcs.js (la construcción pasa
  // escena.hablar como callback del tap).
  hablar(npc) {
    return hablarNpc(this, npc)
  }

  ctxDialogo() {
    return ctxDialogoNpc(this)
  }

  // Pickup: delegación fina sobre scenes/mundo/pickups.js.
  recoger(pickup) {
    return recogerPickup(this, pickup)
  }

  // ---------------------------------------------------- Secretos (Fase G)
  crearSecretoExterior(mapa) {
    this.cuervo = null
    const activo = secretoEnLugar(partida, this.aventura, this.lugarId)
    if (!activo) return
    const { tipo: tipoSecreto, sec } = activo

    const x = Math.min(mapa.widthInPixels - 48, Math.max(48, Math.round(mapa.widthInPixels / 2 + 32)))
    const y = 48

    const tex = texturaSecreto(this, tipoSecreto)
    const sprite = this.add
      .sprite(x, y, tex)
      .setDepth(25)
      .setInteractive({ useHandCursor: true })

    const burbuja = this.add
      .text(x, y - 10, '!', {
        fontFamily: FUENTE,
        fontSize: '8px',
        color: '#e0c04a',
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setDepth(26)

    this.cuervo = { tipo: tipoSecreto, sprite, burbuja, x, y, sec }
    sprite.on('pointerdown', () => this.interactuarSecreto())
  }

  async interactuarSecreto() {
    if (!this.cuervo) return
    audio8.sfx('secreto')
    const texto = resolverTextoSecreto(partida, this.cuervo.tipo, this.cuervo.sec)
    await this.ui.decir(texto)
  }

  // Entrada al lugar: descripción (primera visita) + eventos de entrada (narrar,
  // corrupcion, curar_grupo, emboscar, otorgar) en el orden de `lugar.eventos[]`.
  async iniciarLugar() {
    if (this.transicionando) return
    if (!partida.vistos[this.lugarId] && this.lugar.descripcion) {
      partida.vistos[this.lugarId] = true
      partida.guardar()
      await this.ui?.decir(this.lugar.descripcion, this.ctxDialogo())
    }
    await this.procesarEventosEntrada()
  }

  async procesarEventosEntrada() {
    if (this.transicionando) return
    await EventEngine.alEntrar(partida, this.lugarId, this.uiAdaptador, this.ctxDialogo())
  }

  // El objetivo más cercano dentro de radio; prioridad NPC > gatillo > objeto > salida.
  actualizarInteractuable() {
    const j = this.jugador
    let mejor = null
    const considerar = (prioridad, d, verbo, tipo, ref) => {
      if (d > RADIO_INTERACCION) return
      if (!mejor || prioridad < mejor.prioridad || (prioridad === mejor.prioridad && d < mejor.d))
        mejor = { prioridad, d, verbo, tipo, ref }
    }
    for (const npc of this.npcs || []) {
      const d = Math.hypot(npc.sprite.x - j.x, npc.sprite.y - j.y)
      npc.burbuja.setVisible(d < 40)
      considerar(0, d, 'Hablar', 'npc', npc)
    }
    if (this.cuervo) {
      const d = Math.hypot(this.cuervo.sprite.x - j.x, this.cuervo.sprite.y - j.y)
      this.cuervo.burbuja.setVisible(d < 40)
      considerar(0, d, 'Caw', 'cuervo', this.cuervo)
    }
    for (const g of this.gatillos || []) {
      const consumido = EventEngine.consumida(partida, g.evento, g.eventoId, true)
      if (g.marcador) g.marcador.setVisible(!consumido)
      if (consumido) continue
      const d = Math.hypot(g.x - j.x, g.y - j.y)
      const verbo = g.props.verbo || (g.evento.tipo === 'final' ? 'Forja' : 'Examinar')
      considerar(0, d, verbo, 'gatillo', g)
    }
    for (const p of this.pickups || [])
      considerar(1, Math.hypot(p.sprite.x - j.x, p.sprite.y - j.y), 'Coger', 'objeto', p)
    if (this.descanso)
      considerar(1, Math.hypot(this.descanso.x - j.x, this.descanso.y - j.y), 'Descansar', 'descanso', this.descanso)
    for (const r of this.salidas || [])
      considerar(2, Math.hypot(r.x - j.x, r.y - j.y), 'Entrar', 'salida', r)

    this.interactuable = mejor
    this.ui?.menuTactil?.setAccionHabilitada(!!mejor, mejor?.verbo)
  }

  ejecutarAccion() {
    const it = this.interactuable
    if (!it || this.transicionando || this.pausado || this.ui?.modal) return
    if (it.tipo === 'npc') this.hablar(it.ref)
    else if (it.tipo === 'cuervo') this.interactuarSecreto()
    else if (it.tipo === 'gatillo') this.activarGatillo(it.ref)
    else if (it.tipo === 'objeto') this.recoger(it.ref)
    else if (it.tipo === 'descanso') this.descansar()
    else if (it.tipo === 'salida') this.intentarSalida(it.ref.props)
  }

  // ------------------------------------------------------------ validación

  // Compara lo que declara el JSON del lugar con lo que pintó el mapa.
  validarObjetos(mapa, lugar) {
    const avisos = ValidadorMapa.validar(this.lugarId, lugar, mapa, this.aventura)
    for (const msg of avisos) {
      console.warn(`[mapa:${this.lugarId}] ${msg}`)
    }
  }

  // ------------------------------------------------------------------ update

  update() {
    if (this.jugador) this.jugador.setDepth(this.jugador.y)

    const bloqueado = !this.jugador || this.transicionando || this.pausado || this.ui?.modal
    // Con la DialogBox abierta el jugador queda parado y el tap no pasa al
    // mundo; se consume la tecla de acción para que no «se cuele» al cerrar.
    if (this.teclas && this.ui?.modal) {
      Phaser.Input.Keyboard.JustDown(this.teclas.E)
      Phaser.Input.Keyboard.JustDown(this.teclas.SPACE)
      Phaser.Input.Keyboard.JustDown(this.teclas.ENTER)
    }
    if (bloqueado) {
      if (this.jugador) this.jugador.body.setVelocity(0)
      return
    }

    if (this.teclas) {
      if (
        Phaser.Input.Keyboard.JustDown(this.teclas.E) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.teclas.ENTER)
      )
        this.ejecutarAccion()
    }

    this.actualizarInteractuable()

    let dx = this.ui?.menuTactil?.direccion.x ?? 0
    let dy = this.ui?.menuTactil?.direccion.y ?? 0
    const k = this.teclas
    if (k) {
      if (k.A.isDown || k.LEFT.isDown) dx = -1
      if (k.D.isDown || k.RIGHT.isDown) dx = 1
      if (k.W.isDown || k.UP.isDown) dy = -1
      if (k.S.isDown || k.DOWN.isDown) dy = 1
    }

    const moviendo = dx !== 0 || dy !== 0
    if (moviendo) {
      const len = Math.hypot(dx, dy)
      this.jugador.body.setVelocity((dx / len) * VELOCIDAD, (dy / len) * VELOCIDAD)
      this.orientar(dx, dy)
    } else {
      this.jugador.body.setVelocity(0)
    }
    const tex = this.texHeroe || 'heroe'
    this.jugador.anims.play(
      moviendo
        ? `${tex}-${this.animDe(this.mirando)}`
        : `${tex}-${this.animDe(this.mirando)}-parado`,
      true
    )
  }

  animDe(mirando) {
    return { abajo: 'abajo', arriba: 'arriba', lado: 'lado' }[mirando]
  }

  orientar(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.mirando = 'lado'
      this.jugador.setFlipX(dx < 0)
    } else {
      this.mirando = dy < 0 ? 'arriba' : 'abajo'
      this.jugador.setFlipX(false)
    }
  }
}

export default WorldScene
