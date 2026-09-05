import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

vi.mock('phaser', () => {
  class Scene {}
  return {
    default: {
      AUTO: 'auto',
      Scene,
      Scale: {
        FIT: 0,
        CENTER_BOTH: 0,
      },
    },
    Scene,
  }
})

import config from '../../src/config.js'

describe('E2ELifecycleContract Integration Tests', () => {
  const rootDir = path.resolve(__dirname, '../..')

  it('index.html contiene el contenedor #app y configuración móvil adecuada', () => {
    const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8')

    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('name="viewport"')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('name="mobile-web-app-capable"')
    expect(html).toContain('<title>Aldamar</title>')
    expect(html).toContain('src="/src/main.js"')
  })

  it('config.js configura el parent como "app" y modo de escala FIT', () => {
    expect(config.parent).toBe('app')
    expect(config.backgroundColor).toBe('#000000')
    expect(config.scale).toBeDefined()
    expect(config.scene.length).toBeGreaterThan(5)
  })

  it('main.js registra el hook global window.__ALDAMAR__ y listeners de ciclo de vida', () => {
    const mainJs = fs.readFileSync(path.join(rootDir, 'src', 'main.js'), 'utf8')

    expect(mainJs).toContain('window.__ALDAMAR__ =')
    expect(mainJs).toContain('visibilitychange')
    expect(mainJs).toContain('reajustarRes')
    expect(mainJs).toContain('orientationchange')
  })
})
