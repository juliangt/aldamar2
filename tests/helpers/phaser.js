// Helper compartido de test: stub mínimo de Phaser y fábrica de escenas mock.
// Centraliza lo que antes se duplicaba en cada archivo de test de UI/escenas.
//
// Uso:
//   vi.mock('phaser', async () => (await import('./helpers/phaser.js')).phaserStub)
//   import { crearMockEscena } from './helpers/phaser.js'
//
// El stub de elemento colecta los callbacks de `on` en `_handlers` (por evento)
// y `_onClick` (último registrado) para que los tests puedan dispararlos.

import { vi } from 'vitest'

class SceneStub {
  constructor(key) {
    this.key = key
  }
}

export const phaserStub = {
  default: {
    AUTO: 'auto',
    Scene: SceneStub,
    Scale: { FIT: 0, CENTER_BOTH: 0 },
    Scenes: { Events: { WAKE: 'wake', SLEEP: 'sleep' } },
    Input: { Keyboard: { JustDown: vi.fn() } },
    Math: { Clamp: (v, min, max) => Math.min(Math.max(v, min), max) },
    GameObjects: { Text: class Text {}, Container: class Container {} },
  },
  Scene: SceneStub,
}

export function crearElemento(props = {}) {
  return {
    setPosition: vi.fn().mockReturnThis(),
    setSize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn(function (ev, cb) {
      this._handlers = this._handlers || {}
      this._handlers[ev] = cb
      this._onClick = cb
      return this
    }),
    destroy: vi.fn(),
    input: { enabled: true, hitArea: { setSize: vi.fn() } },
    width: 16,
    height: 8,
    list: [],
    add: vi.fn(function (items) {
      if (Array.isArray(items)) this.list.push(...items)
      else this.list.push(items)
      return this
    }),
    ...props,
  }
}

export function crearMockEscena() {
  const keyboardListeners = new Map()
  let timerCb = null

  const elemento = () => crearElemento()

  return {
    add: {
      container: vi.fn(elemento),
      zone: vi.fn(elemento),
      rectangle: vi.fn(elemento),
      circle: vi.fn(elemento),
      text: vi.fn(elemento),
    },
    events: {
      on: vi.fn(),
      emit: vi.fn(),
    },
    input: {
      keyboard: {
        on: vi.fn((ev, cb) => keyboardListeners.set(ev, cb)),
        trigger: (ev) => keyboardListeners.get(ev)?.(),
      },
    },
    time: {
      addEvent: vi.fn((opts) => {
        timerCb = opts.callback
        return { remove: vi.fn() }
      }),
      tick: () => timerCb?.(),
    },
    tweens: {
      add: vi.fn(() => ({ remove: vi.fn() })),
    },
  }
}
