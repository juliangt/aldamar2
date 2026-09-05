// Config — Phaser móvil-first: 480×270 lógicos, FIT + CENTER_BOTH.

import Phaser from 'phaser'
import BootScene from './scenes/BootScene.js'
import SelloScene from './scenes/SelloScene.js'
import MenuScene from './scenes/MenuScene.js'
import WorldScene from './scenes/WorldScene.js'
import UiScene from './scenes/UiScene.js'
import BattleScene from './scenes/BattleScene.js'
import ArenaScene from './scenes/ArenaScene.js'
import EpilogoScene from './scenes/EpilogoScene.js'

export const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 480,
  height: 270,
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
  scene: [BootScene, SelloScene, MenuScene, WorldScene, UiScene, BattleScene, ArenaScene, EpilogoScene],
}

export default config
