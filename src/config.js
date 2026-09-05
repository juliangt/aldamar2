// Config — Phaser móvil-first con vista adaptativa: 270×480 lógicos en
// vertical (móvil en mano) u 480×270 en horizontal (móvil girado/escritorio).
// El canvas se supersamplea ×RES (resolucion.js) para verse nítido en
// pantalla completa; las escenas posicionan contra VISTA (dinámica).

import Phaser from 'phaser'
import { VISTA, RES } from './core/resolucion.js'
import BootScene from './scenes/BootScene.js'
import SelloScene from './scenes/SelloScene.js'
import MenuScene from './scenes/MenuScene.js'
import WorldScene from './scenes/WorldScene.js'
import UiScene from './scenes/UiScene.js'
import BattleScene from './scenes/BattleScene.js'
import ArenaScene from './scenes/ArenaScene.js'
import EpilogoScene from './scenes/EpilogoScene.js'
import HeroeScene from './scenes/HeroeScene.js'
import PrologoScene from './scenes/PrologoScene.js'

export const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: VISTA.width * RES,
  height: VISTA.height * RES,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  fps: {
    target: 60,
  },
  scene: [
    BootScene,
    SelloScene,
    MenuScene,
    HeroeScene,
    PrologoScene,
    WorldScene,
    UiScene,
    BattleScene,
    ...(import.meta.env.DEV ? [ArenaScene] : []),
    EpilogoScene,
  ],
}

export default config
