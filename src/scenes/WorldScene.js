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
import { nombreCorto, posicionCartel, posicionPoste, ordenarTablas, flechaDe } from '../core/Carteles.js'
import heroePng from '../assets/heroe.png'
import { crearTexturaHeroe, crearTexturaEnemigo, crearTexturaNpc } from '../core/Sprites.js'
import { audio8, obtenerBioma } from '../core/Audio8.js'

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
    this.crearTexturasCarteles()
    this.crearSalidas(mapa)
    this.crearCarteles(mapa)
    this.crearNpcs(mapa, lugar)
    this.crearPickups(mapa, lugar)
    this.crearEnemigos(mapa, lugar)
    this.crearGatillos(mapa, lugar)
    this.crearDescanso(mapa, lugar)
    this.crearCuervoExterior(mapa)
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

  // ------------------------------------------------------ carteles de destino

  // Carteles con el destino de cada salida: en bifurcaciones (3+) un poste
  // central con una tabla por camino; si no, un cartel junto a cada borde.
  // Decorativos (sin cuerpo físico), como los marcadores de eventos.
  crearCarteles(mapa) {
    const salidas = (this.datosSalidas || []).filter((s) => s.props.hacia)
    if (!salidas.length) return
    const mapaPx = { width: mapa.widthInPixels, height: mapa.heightInPixels }
    if (salidas.length >= 3) {
      const esLibre = (x, y) => {
        const tile = this.capaObstaculos.getTileAtWorldXY(x, y)
        return !tile || !tile.properties?.colision
      }
      this.crearPosteBifurcacion(salidas, mapaPx, esLibre)
    } else {
      for (const s of salidas) this.crearCartelSimple(s, mapaPx)
    }
  }

  crearCartelSimple(s, mapaPx) {
    const { x, y } = posicionCartel(s, mapaPx)
    const flecha = flechaDe(s.dir)
    this.add.image(x, y, 'cartel:poste').setOrigin(0.5, 1).setDepth(y)
    const dx = flecha === 'izquierda' ? -6 : flecha === 'derecha' ? 6 : 0
    this.pintarTabla(x + dx, y - 12, flecha, s.props.hacia, y)
  }

  crearPosteBifurcacion(salidas, mapaPx, esLibre) {
    const filas = ordenarTablas(salidas)
    const n = filas.length
    const alto = 14 * n + 8
    const clave = this.texturaCanvas(`cartel:poste:${n}`, 8, alto, (g) =>
      this.dibujarPosteCartel(g, alto)
    )
    const { x, y } = posicionPoste(mapaPx, esLibre)
    this.add.image(x, y, clave).setOrigin(0.5, 1).setDepth(y)
    filas.forEach((s, i) => {
      const flecha = flechaDe(s.dir)
      const dx = flecha === 'izquierda' ? -10 : flecha === 'derecha' ? 10 : 0
      this.pintarTabla(x + dx, y - alto + 10 + i * 14, flecha, s.props.hacia, y)
    })
  }

  // Tabla con el nombre corto del destino; el candado (✕ gris) y el color
  // apagado avisan de puertas con `requiere` aún sin cumplir.
  pintarTabla(x, y, flecha, hacia, prof) {
    const destino = Datos.lugar(this.aventura, hacia)
    const cerrada = this.salidaBloqueada(destino)
    const forma = flecha === 'arriba' || flecha === 'abajo' ? 'plana' : flecha
    const tex = `cartel:tabla:${forma}${cerrada ? ':cerrada' : ''}`
    this.add.image(x, y, tex).setDepth(prof)
    // Los triángulos de las tablas planas (N/S) se desplazan a un lado para
    // no perderse contra la columna del poste, del mismo color.
    if (flecha === 'arriba' || flecha === 'abajo')
      this.add
        .image(x - 12, y + (flecha === 'arriba' ? -8 : 8), `cartel:tri:${flecha}`)
        .setDepth(prof)
    if (cerrada)
      this.add
        .image(x + (forma === 'plana' ? 12 : 0), y + (flecha === 'arriba' ? 8 : -8), 'cartel:cruz')
        .setDepth(prof)
    // El texto se centra sobre el cuerpo del listón, no sobre la textura
    // completa (la punta desplaza el centro óptico).
    const dxTexto = forma === 'derecha' ? -4 : forma === 'izquierda' ? 4 : 0
    this.add
      .text(x + dxTexto, y + 1, nombreCorto(destino) || hacia, {
        fontFamily: FUENTE,
        fontSize: '6px',
        color: cerrada ? '#8a8a8a' : '#e8d8a8',
      })
      .setOrigin(0.5)
      .setDepth(prof + 1)
  }

  salidaBloqueada(destino) {
    if (!destino?.requiere) return false
    return (
      !partida.inventario.includes(destino.requiere) && !partida.tieneFlag(destino.requiere)
    )
  }

  crearTexturasCarteles() {
    this.texturaCanvas('cartel:poste', 8, 16, (g) => this.dibujarPosteCartel(g, 16))
    for (const forma of ['izquierda', 'derecha', 'plana']) {
      const ancho = forma === 'plana' ? 58 : 66
      this.texturaCanvas(`cartel:tabla:${forma}`, ancho, 12, (g) =>
        this.dibujarTablaCartel(g, forma, false)
      )
      this.texturaCanvas(`cartel:tabla:${forma}:cerrada`, ancho, 12, (g) =>
        this.dibujarTablaCartel(g, forma, true)
      )
    }
    this.texturaCanvas('cartel:tri:arriba', 7, 5, (g) => {
      g.fillStyle = '#3a2410'
      g.fillRect(3, 0, 1, 1)
      g.fillRect(2, 1, 3, 1)
      g.fillRect(1, 2, 5, 1)
      g.fillRect(0, 3, 7, 2)
    })
    this.texturaCanvas('cartel:tri:abajo', 7, 5, (g) => {
      g.fillStyle = '#3a2410'
      g.fillRect(0, 0, 7, 2)
      g.fillRect(1, 2, 5, 1)
      g.fillRect(2, 3, 3, 1)
      g.fillRect(3, 4, 1, 1)
    })
    this.texturaCanvas('cartel:cruz', 7, 7, (g) => {
      g.fillStyle = '#9a9a9a'
      for (let i = 0; i < 7; i++) {
        g.fillRect(i, i, 1, 1)
        g.fillRect(6 - i, i, 1, 1)
      }
    })
  }

  dibujarPosteCartel(g, alto) {
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
  dibujarTablaCartel(g, forma, cerrada) {
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
    return crearTexturaNpc(this, id)
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
    audio8.sfx('moneda')
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
    return crearTexturaEnemigo(this, id)
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
    const ahora = this.game?.loop?.time || Date.now()
    const vivos = (this.enemigosMapa || []).filter((e) => !e.derrotado)
    if (!vivos.length) return

    if (
      this.transicionando ||
      this.pausado ||
      this.ui?.modal ||
      this.graciaHuida > ahora ||
      this.scene.isActive('Battle')
    )
      return
    this.transicionando = true

    // En aguja_cima el combate es estrictamente secuencial: eco_voz → capitan_rehecho → morvath
    const esSecuencial = this.lugarId === 'aguja_cima'
    const enemigosBatalla = esSecuencial ? [vivos[0].id] : vivos.map((e) => e.id)
    this.enemigoEnCurso = esSecuencial ? vivos[0] : null

    audio8.detenerAmbiente(true)

    this.scene.sleep('Ui')
    this.scene.sleep('World')
    this.scene.launch('Battle', {
      enemigos: enemigosBatalla,
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
      caida: () => {
        this.scene.stop('Ui')
        this.scene.stop('World')
        this.scene.start('Epilogo', { tipo: 'caida' })
      },
      final: (elegida, evento) => {
        const res = EventEngine.resolverFinal(partida, evento, elegida)
        this.scene.stop('Ui')
        this.scene.stop('World')
        this.scene.start('Epilogo', res)
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

  // ---------------------------------------------------- Secretos (Fase G)
  crearCuervoExterior(mapa) {
    return this.crearSecretoExterior(mapa)
  }

  crearSecretoExterior(mapa) {
    this.cuervo = null
    const secretos = Datos.aventura(this.aventura)?.secretos
    if (!secretos) return
    const [tipoSecreto, sec] = Object.entries(secretos)[0] || []
    if (!sec) return

    const lugaresPorSecreto = {
      cuervo: ['vegaverde', 'molino', 'puente', 'bosque', 'cienagas', 'yerma'],
      abejas: ['colmenar', 'ejido', 'lavadero'],
      gaviota: ['vado', 'calzada', 'faro', 'esteros', 'cauce', 'salinas'],
      campanilla: ['refugio', 'aguja_pies', 'aguja_cima'],
    }

    const permitidos = lugaresPorSecreto[tipoSecreto] || []
    if (!permitidos.includes(this.lugarId)) return

    if (tipoSecreto === 'campanilla' && !partida.tieneFlag('campanilla') && !partida.inventario.includes('campanilla')) {
      return
    }

    const x = Math.min(mapa.widthInPixels - 48, Math.max(48, Math.round(mapa.widthInPixels / 2 + 32)))
    const y = 48

    const tex = this.texturaSecreto(tipoSecreto)
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

  texturaSecreto(tipo) {
    const clave = `secreto:${tipo}`
    if (this.textures.exists(clave)) return clave
    return this.texturaCanvas(clave, 16, 16, (g) => {
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

  texturaCuervo() {
    return this.texturaSecreto('cuervo')
  }

  async interactuarSecreto() {
    if (!this.cuervo) return
    audio8.sfx('secreto')
    const { tipo, sec } = this.cuervo
    let texto = ''
    const semKey = String(partida.semilla)
    if (sec.semillas?.[semKey]) {
      texto = sec.semillas[semKey]
    } else {
      partida.npcVistos = partida.npcVistos || {}
      const keyVisto = `secreto:${tipo}`
      const idx = (partida.npcVistos[keyVisto] || 0) % sec.textos.length
      texto = sec.textos[idx]
      partida.npcVistos[keyVisto] = idx + 1
      partida.guardar()
    }
    await this.ui.decir(texto)
  }

  interactuarCuervo() {
    return this.interactuarSecreto()
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
    else if (it.tipo === 'cuervo') this.interactuarCuervo()
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
