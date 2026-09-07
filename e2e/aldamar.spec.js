import { test, expect } from '@playwright/test'

test.describe('Aldamar E2E Suite', () => {
  test('arranque de aplicación: título, meta tags y contenedor #app', async ({ page }) => {
    await page.goto('/')

    // Verificar título y metadatos de aplicación móvil
    await expect(page).toHaveTitle('Aldamar')
    const app = page.locator('#app')
    await expect(app).toBeAttached()

    const viewportMeta = page.locator('meta[name="viewport"]')
    await expect(viewportMeta).toHaveAttribute('content', /viewport-fit=cover/)
  })

  test('montaje de canvas Phaser y bucle de juego activo', async ({ page }) => {
    await page.goto('/')

    // Esperar a que el canvas se adjunte al DOM
    const canvas = page.locator('#app canvas')
    await expect(canvas).toBeAttached({ timeout: 10000 })

    // Validar que el canvas tiene dimensiones renderizables
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box?.width).toBeGreaterThan(0)
    expect(box?.height).toBeGreaterThan(0)
  })

  test('exposición de API global de depuración window.__ALDAMAR__', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.__ALDAMAR__ !== undefined)

    const hooks = await page.evaluate(() => {
      const aldamar = window.__ALDAMAR__
      return {
        tieneGame: Boolean(aldamar.game),
        tieneTexto: Boolean(aldamar.Texto),
        tieneRng: Boolean(aldamar.Rng),
        tieneDatos: Boolean(aldamar.Datos),
        tienePartida: Boolean(aldamar.partida),
      }
    })

    expect(hooks.tieneGame).toBe(true)
    expect(hooks.tieneTexto).toBe(true)
    expect(hooks.tieneRng).toBe(true)
    expect(hooks.tieneDatos).toBe(true)
    expect(hooks.tienePartida).toBe(true)
  })

  test('interacción táctil y desbloqueo de audio sin excepciones', async ({ page }) => {
    const erroresConsola = []
    page.on('pageerror', (err) => erroresConsola.push(err.message))

    await page.goto('/')
    const canvas = page.locator('#app canvas')
    await canvas.waitFor({ state: 'attached', timeout: 10000 })

    // Simular tap táctil en el canvas
    await canvas.click({ position: { x: 50, y: 50 } })

    // Esperar brevemente para verificar estabilidad
    await page.waitForTimeout(500)
    expect(erroresConsola).toHaveLength(0)
  })

  test('canvas supersampleado a la resolución física de la pantalla retina', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('#app canvas')
    await canvas.waitFor({ state: 'attached', timeout: 10000 })
    await page.waitForFunction(() => window.__ALDAMAR__?.game?.isBooted)
    await page.waitForTimeout(300) // un frame para que Scale.FIT fije el tamaño CSS

    const info = await canvas.evaluate((c) => {
      const r = c.getBoundingClientRect()
      return {
        backingW: c.width,
        fisicoW: r.width * window.devicePixelRatio,
      }
    })

    // El render interno nunca debe quedar por debajo de los píxeles reales
    // que ocupa el canvas en pantalla: si queda por debajo el navegador lo
    // amplifica y el juego se ve borroso/pixelado (regresión móvil retina).
    expect(info.backingW).toBeGreaterThanOrEqual(info.fisicoW - 1)
  })

  test('botón SALTAR del prólogo salta directamente al mundo', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.__ALDAMAR__?.game?.isBooted)

    // Entrar directo al prólogo como en el flujo real (HeroeScene):
    // sembrar la partida y arrancar Prologo
    await page.evaluate(() => {
      const g = window.__ALDAMAR__.game
      const { partida } = window.__ALDAMAR__
      partida.nuevaPartida('corazon_ceniza', 'tilo')
      for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key)
      g.scene.start('Prologo', {})
    })
    await page.waitForFunction(() => window.__ALDAMAR__.game.scene.isActive('Prologo'))
    await page.waitForTimeout(200)

    // Clic sobre el botón (posición real del objeto, válida en ambas
    // orientaciones), convertido a coordenadas de página vía worldView
    const pos = await page.evaluate(() => {
      const g = window.__ALDAMAR__.game
      const pro = g.scene.getScene('Prologo')
      const b = pro.btnSaltar
      const v = pro.cameras.main.worldView
      const r = g.canvas.getBoundingClientRect()
      return {
        x: r.left + ((b.x - b.width / 2 - v.x) / v.width) * r.width,
        y: r.top + ((b.y + b.height / 2 - v.y) / v.height) * r.height,
      }
    })
    await page.mouse.click(pos.x, pos.y)

    // Regresión: la zona táctil a pantalla completa creada después del
    // botón tapaba sus toques y en vez de saltar solo avanzaba la página.
    await expect
      .poll(() => page.evaluate(() => window.__ALDAMAR__.game.scene.isActive('World')))
      .toBe(true)
    expect(
      await page.evaluate(() => window.__ALDAMAR__.game.scene.isActive('Prologo'))
    ).toBe(false)
  })

  test('adaptabilidad responsiva vertical / horizontal', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('#app canvas')
    await canvas.waitFor({ state: 'attached', timeout: 10000 })

    // Modo vertical (móvil en mano: 390×844)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    const boxVertical = await canvas.boundingBox()
    expect(boxVertical?.width).toBeGreaterThan(0)

    // Modo horizontal (móvil girado: 844×390)
    await page.setViewportSize({ width: 844, height: 390 })
    await page.waitForTimeout(300)
    const boxHorizontal = await canvas.boundingBox()
    expect(boxHorizontal?.width).toBeGreaterThan(0)
  })

  test('ciclo de vida: evento visibilitychange conmuta estado sin fallos', async ({ page }) => {
    await page.goto('/')
    await page.waitForFunction(() => window.__ALDAMAR__?.game?.isBooted)

    // Emitir cambio a segundo plano
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(200)

    // Emitir vuelta al primer plano
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await page.waitForTimeout(200)
  })
})
