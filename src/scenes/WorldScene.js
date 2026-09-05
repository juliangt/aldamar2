// WorldScene — escena genérica de lugar top-down (Fase A): carga el mapa
// Tiled del lugar activo, colisiones, jugador con cámara, transiciones
// entre lugares validando `requiere`. La interfaz (HUD, táctil, pausa)
// vive en UiScene, lanzada en paralelo con cámara a zoom 1.

import Phaser from 'phaser'
import Datos from '../core/Datos.js'
import EventEngine from '../core/EventEngine.js'
import ValidadorMapa from '../core/ValidadorMapa.js'
import { aplicarRes } from '../core/resolucion.js'
import { partida } from '../core/partida.js'
import { extraerReclutar, extraerComprar } from '../core/Texto.js'
import heroePng from '../assets/heroe.png'

const VELOCIDAD = 110
const LADO_OPUESTO = { N: 'S', S: 'N', E: 'O', O: 'E' }
const FUENTE = '"Press Start 2P", monospace'
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
    if (!this.textures.exists('heroe'))
      this.load.spritesheet('heroe', heroePng, {
        frameWidth: 16,
        frameHeight: 16,
      })
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
    this.crearTexturasFx()
    this.crearSalidas(mapa)
    this.crearNpcs(mapa, lugar)
    this.crearPickups(mapa, lugar)
    this.crearEnemigos(mapa, lugar)
    this.crearGatillos(mapa, lugar)
    this.crearDescanso(mapa, lugar)
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
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER,K,J'
    )

    // Ayudas dev de Fase C (sin combate aún): K daña 5 PV para probar
    // consumibles/descanso; J mete los 12 ítems para probar inventario/tienda.
    this.input.keyboard.on('keydown-K', () => {
      if (this.ui?.modal || this.pausado) return
      this.ui.toast(`(dev: -5 PV → ${partida.danarDev()})`)
      this.ui.refrescarHud()
    })
    this.input.keyboard.on('keydown-J', () => {
      if (this.ui?.modal || this.pausado) return
      for (const id of Object.keys(Datos.aventura(this.aventura).items))
        partida.inventario.push(id)
      partida.guardar()
      this.ui.toast('(dev: inventario de prueba)')
    })

    this.registrarWake()
  }

  // ------------------------------------------------------------------ jugador

  crearJugador(mapa) {
    const spawn = this.resolverSpawn(mapa)
    this.jugador = this.physics.add.sprite(spawn.x, spawn.y, 'heroe')
    this.jugador.body.setSize(12, 10)
    this.jugador.body.setOffset(2, 6)
    this.jugador.setCollideWorldBounds(true)
    this.jugador.setDepth(spawn.y)
    this.physics.add.collider(this.jugador, this.capaObstaculos)

    this.crearAnimaciones()
    this.jugador.anims.play('heroe-abajo')
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
    if (this.anims.exists('heroe-abajo')) return
    const filas = { abajo: 0, arriba: 1, lado: 2 }
    for (const [nombre, fila] of Object.entries(filas)) {
      this.anims.create({
        key: `heroe-${nombre}`,
        frames: this.anims.generateFrameNumbers('heroe', {
          frames: [fila * 3, fila * 3 + 1, fila * 3, fila * 3 + 2],
        }),
        frameRate: 8,
        repeat: -1,
      })
      this.anims.create({
        key: `heroe-${nombre}-parado`,
        frames: [{ key: 'heroe', frame: fila * 3 }],
        frameRate: 1,
      })
    }
  }

  // ------------------------------------------------------------------ salidas

  crearSalidas(mapa) {
    this.salidas = []
    const capa = mapa.getObjectLayer('salidas')
    if (!capa) return
    for (const o of capa.objects) {
      const props = this.leerProps(o)
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
    // Puerta con requisito: ítem no presente → toast + cooldown 1 s.
    if (destino?.requiere && !partida.inventario.includes(destino.requiere)) {
      if (this.time.now < (this.cooldownToast || 0)) return
      this.cooldownToast = this.time.now + 1000
      this.ui && this.ui.toast(destino.requiere_texto || 'No puedes pasar todavía.')
      return
    }

    this.transicionando = true
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

  // ------------------------------------------------------- Fase B: mundo vivo

  // Texturas pixel generadas (2 frames): NPC con paleta propia por id y
  // brillos de objetos/monedas. Evita depender de sprites aún inexistentes.
  texturaCanvas(clave, ancho, alto, dibujar) {
    if (this.textures.exists(clave)) return clave
    const cv = document.createElement('canvas')
    cv.width = ancho
    cv.height = alto
    dibujar(cv.getContext('2d'))
    this.textures.addCanvas(clave, cv)
    return clave
  }

  texturaNpc(id) {
    const paletas = [
      ['#c8a06a', '#5a3a20', '#3e5a3e', '#8a8a8a'], // piel, pelo, túnica, bastón
      ['#c8a06a', '#d8d0b0', '#5a4a7a', '#7a5a3a'],
      ['#b08858', '#222222', '#7a3030', '#5a5a3a'],
      ['#c8a06a', '#888888', '#3a5a7a', '#6a6a6a'],
    ]
    const p =
      paletas[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % paletas.length]
    return this.texturaCanvas(`npc:${id}`, 32, 16, (g) => {
      const px = (x, y, w, h, c) => {
        g.fillStyle = c
        g.fillRect(x, y, w, h)
      }
      for (const f of [0, 1]) {
        const ox = f * 16
        px(ox + 5, 2, 6, 5, p[0]) // cabeza
        px(ox + 5, 1, 6, 2, p[1]) // pelo
        px(ox + 4, 7, 8, 6, p[2]) // túnica
        px(ox + 5 + f, 13, 2, 3, '#2a2a2a') // piernas (alternan)
        px(ox + 9 - f, 13, 2, 3, '#2a2a2a')
        px(ox + 12, 4 + f, 2, 11, p[3]) // bastón
      }
    })
  }

  crearTexturasFx() {
    this.texturaCanvas('fx:moneda', 16, 8, (g) => {
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
    this.texturaCanvas('fx:objeto', 16, 8, (g) => {
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

  crearNpcs(mapa, lugar) {
    this.npcs = []
    const capa = mapa.getObjectLayer('npcs')
    if (!capa) return
    for (const o of capa.objects) {
      const npcId = o.name
      const clave = lugar.npcs?.[npcId] || npcId // «lugar.npcs» → clave en `dialogos`
      const tex = this.texturaNpc(npcId)
      const sprite = this.add.sprite(o.x, o.y, tex, 0)
      sprite.setDepth(o.y)
      const anim = `npc:${npcId}:idle`
      if (!this.anims.exists(anim))
        this.anims.create({
          key: anim,
          frames: [
            { key: tex, frame: 0 },
            { key: tex, frame: 1 },
          ],
          frameRate: 2,
          repeat: -1,
        })
      sprite.anims.play(anim)

      const burbuja = this.add
        .text(o.x, o.y - 20, '!', { fontFamily: FUENTE, fontSize: '8px', color: '#e0c04a' })
        .setOrigin(0.5)
        .setDepth(o.y + 1)
        .setVisible(false)
      this.tweens.add({ targets: burbuja, y: o.y - 24, duration: 500, yoyo: true, repeat: -1 })

      const npc = { id: npcId, clave, sprite, burbuja }
      // Tap directo sobre el NPC, además del botón de acción.
      sprite.setInteractive().on('pointerdown', () => this.hablar(npc))
      this.npcs.push(npc)
    }
  }

  crearPickups(mapa, lugar) {
    this.pickups = []
    for (const [nombreCapa, tipo] of [['objetos', 'objeto'], ['monedas', 'moneda']]) {
      const capa = mapa.getObjectLayer(nombreCapa)
      if (!capa) continue
      capa.objects.forEach((o, i) => {
        const claveRecogido = `${this.lugarId}:${nombreCapa}:${o.name || 'obj'}:${i}`
        if (partida.recogidos[claveRecogido]) return // una vez por partida
        const sprite = this.add.sprite(o.x, o.y, tipo === 'moneda' ? 'fx:moneda' : 'fx:objeto', 0)
        sprite.setDepth(o.y)
        this.physics.add.existing(sprite, true)
        this.tweens.add({ targets: sprite, scale: { from: 0.8, to: 1 }, duration: 600, yoyo: true, repeat: -1 })
        const pickup = {
          tipo,
          id: o.name,
          valor: this.leerProps(o).valor || 1,
          sprite,
          claveRecogido,
        }
        this.physics.add.overlap(this.jugador, sprite, () => this.recoger(pickup))
        this.pickups.push(pickup)
      })
    }
  }

  recoger(pickup) {
    if (pickup.recogido || this.ui?.modal) return
    pickup.recogido = true
    partida.recogidos[pickup.claveRecogido] = true
    if (pickup.tipo === 'moneda') {
      partida.monedas += pickup.valor
      this.ui.toast(`(+${pickup.valor} monedas)`)
    } else {
      partida.inventario.push(pickup.id)
      this.ui.toast(`(Recibes: ${Datos.item(this.aventura, pickup.id)?.nombre || pickup.id}.)`)
    }
    partida.guardar()
    this.ui.refrescarHud()
    pickup.sprite.destroy()
    this.pickups = this.pickups.filter((p) => p !== pickup)
  }

  ctxDialogo() {
    const pj = Datos.aventura(this.aventura).personajes[partida.heroe] || {}
    return { trato: pj.trato, nombre: pj.nombre }
  }

  // ------------------------------------------------------ Fase D: combate

  // Textura de enemigo en el mundo (misma clave que usa BattleScene).
  texturaEnemigo(id) {
    const clave = `enemigo:${id}`
    if (this.textures.exists(clave)) return clave
    const colores = {
      lobo: '#5a5a6a', espectro: '#8a9ab0', trasgo: '#7a8a4a',
      lobero: '#6a5a4a', capitan: '#9a6a5a', custodio: '#b0c0c8',
    }
    const cv = document.createElement('canvas')
    cv.width = 16
    cv.height = 16
    const g = cv.getContext('2d')
    const color = colores[id] || '#7a7a8a'
    g.fillStyle = color
    g.fillRect(4, 2, 8, 6)
    g.fillStyle = '#c03030'
    g.fillRect(5, 4, 2, 2)
    g.fillRect(9, 4, 2, 2)
    g.fillStyle = color
    g.fillRect(3, 8, 10, 6)
    g.fillStyle = '#0a0a0a'
    g.fillRect(4, 14, 3, 2)
    g.fillRect(9, 14, 3, 2)
    this.textures.addCanvas(clave, cv)
    return clave
  }

  // Los enemigos del lugar son un grupo: tocar cualquiera inicia un combate
  // contra todos los vivos (trasgo ×2 en minas = multi-enemigo).
  crearEnemigos(mapa, lugar) {
    this.enemigosMapa = []
    const capa = mapa.getObjectLayer('enemigos')
    if (!capa) return
    for (const o of capa.objects) {
      const id = o.name
      if (!Datos.enemigo(this.aventura, id)) continue
      const dato = Datos.enemigo(this.aventura, id)
      const escala = dato.sin_huida || (dato.fases && dato.fases.length) ? 1.5 : 1
      const sprite = this.add.sprite(o.x, o.y, this.texturaEnemigo(id)).setOrigin(0.5, 1)
      sprite.setDepth(o.y)
      sprite.setScale(escala)
      this.tweens.add({
        targets: sprite,
        x: o.x + 3,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      })
      this.physics.add.existing(sprite, true)
      sprite.body.setSize(12, 10).setOffset(2, 6)
      const enemigo = { id, sprite, x: o.x, y: o.y }
      this.physics.add.overlap(this.jugador, sprite, () => this.tocarEnemigo(enemigo))
      this.enemigosMapa.push(enemigo)
    }
  }

  tocarEnemigo(enemigo) {
    if (
      this.transicionando ||
      this.pausado ||
      this.ui?.modal ||
      this.graciaHuida > this.time.now ||
      this.scene.isSleeping('Battle')
    )
      return
    this.transicionando = true
    const vivos = this.enemigosMapa.filter((e) => !e.derrotado)
    if (!vivos.length) return
    this.scene.sleep('Ui')
    this.scene.sleep('World')
    this.scene.launch('Battle', {
      enemigos: vivos.map((e) => e.id),
      origen: 'World',
      lugar: this.lugarId,
    })
  }

  // La BattleScene despierta al mundo con {resultado}: victoria retira al
  // grupo; huida reposiciona al jugador fuera de contacto con 1,5 s de gracia.
  registrarWake() {
    this.events.on(Phaser.Scenes.Events.WAKE, (sys, data) => {
      this.transicionando = false
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
        for (const e of this.enemigosMapa || []) {
          e.derrotado = true
          e.sprite.destroy()
        }
        this.enemigosMapa = this.enemigosMapa.filter((e) => !e.derrotado)
      } else if (data.resultado === 'huida') {
        // Empujar al jugador lejos del enemigo más cercano + gracia.
        let masCercano = null
        let mejorD = Infinity
        for (const e of this.enemigosMapa || []) {
          const d = Math.hypot(e.sprite.x - this.jugador.x, e.sprite.y - this.jugador.y)
          if (d < mejorD) {
            mejorD = d
            masCercano = e
          }
        }
        if (masCercano) {
          const dx = this.jugador.x - masCercano.sprite.x
          const dy = this.jugador.y - masCercano.sprite.y
          const len = Math.hypot(dx, dy) || 1
          this.jugador.x += (dx / len) * 40
          this.jugador.y += (dy / len) * 40
        }
        this.graciaHuida = this.time.now + 1500
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
      caida: () => {
        this.scene.stop('Ui')
        this.scene.stop('World')
        this.scene.start('Epilogo', { tipo: 'caida' })
      },
      final: (_elegida, _evento) => {
        // Fase F: resolución completa de finales
        this.ui?.toast('(Fase F: final alcanzado)')
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

  // Resuelve la clave de `dialogos`: array (secuencia por visita, la última
  // se repite) o cadena única. Contador persistente en `npcVistos`.
  async hablar(npc) {
    if (this.transicionando || this.pausado || this.ui?.modal) return

    // Si el NPC tiene una decisión asociada pendiente (p. ej. Dorotea en Ríoclaro)
    if (npc.id === 'dorotea' && this.lugar.eventos?.includes('encargo')) {
      const ev = Datos.evento(this.aventura, 'encargo')
      if (ev && !EventEngine.consumida(partida, ev, 'encargo', true)) {
        await EventEngine.gatillo(partida, 'encargo', this.uiAdaptador, this.ctxDialogo())
        return
      }
    }

    const dato = Datos.dialogo(this.aventura, npc.clave)
    if (!dato) return
    const lista = Array.isArray(dato) ? dato : [dato]
    const n = partida.npcVistos[npc.clave] || 0
    const bruto = lista[Math.min(n, lista.length - 1)]
    const { limpio: sinReclutar, reclutaId } = extraerReclutar(bruto)
    const { limpio, esTienda } = extraerComprar(sinReclutar)

    await this.ui.decir(limpio, this.ctxDialogo())

    partida.npcVistos[npc.clave] = n + 1
    partida.guardar()

    // Tendero: la línea «Escribe comprar…» ya se ocultó; tras el saludo se
    // abre la tienda del lugar (si el lugar la tiene).
    if (esTienda && this.lugar.tienda) this.ui.abrirTienda(this.lugarId)

    if (reclutaId && !partida.companeros.includes(reclutaId)) {
      const eleccion = await this.ui.pregunta(['Reclutar', 'Seguir solo'])
      if (eleccion === 0) {
        partida.companeros.push(reclutaId)
        partida.guardar()
        this.ui.toast(`${Datos.recluta(this.aventura, reclutaId)?.nombre || reclutaId} se une al grupo`)
      }
    }
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
    this.jugador.anims.play(
      moviendo
        ? `heroe-${this.animDe(this.mirando)}`
        : `heroe-${this.animDe(this.mirando)}-parado`,
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
