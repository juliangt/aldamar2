import { describe, it, expect } from 'vitest'
import Datos from '../src/core/Datos.js'
import {
  BIOMAS_TONOS,
  PALETAS_HEROES,
  PALETAS_ENEMIGOS,
  PALETAS_NPCS,
  crearTexturaHeroe,
  crearTexturaEnemigo,
  crearTexturaNpc,
} from '../src/core/Sprites.js'

describe('Sprites y paletas de bioma (Fase G)', () => {
  it('los 11 héroes tienen su paleta definida en PALETAS_HEROES', () => {
    const heroesEsperados = [
      // Corazón de Ceniza
      'tilo', 'ithel', 'dagna', 'ruy',
      // Brasa de Vegaverde
      'enebro',
      // Sal y la Ceniza
      'bruna', 'gala', 'tamara',
      // Aguja sin Sombra
      'renco', 'vela', 'bram',
    ]

    expect(Object.keys(PALETAS_HEROES)).toHaveLength(11)
    for (const hId of heroesEsperados) {
      expect(PALETAS_HEROES[hId], `Falta paleta para héroe ${hId}`).toBeDefined()
      expect(PALETAS_HEROES[hId].piel).toBeDefined()
      expect(PALETAS_HEROES[hId].pelo).toBeDefined()
      expect(PALETAS_HEROES[hId].tunica).toBeDefined()
      expect(PALETAS_HEROES[hId].tunicaOsc).toBeDefined()
      expect(PALETAS_HEROES[hId].pantalon).toBeDefined()
    }
  })

  it('los 39 lugares de las 4 aventuras tienen un tono de bioma en BIOMAS_TONOS', () => {
    for (const av of Datos.orden) {
      for (const lugarId of Object.keys(av.lugares)) {
        expect(
          BIOMAS_TONOS[lugarId],
          `Falta tono de bioma para el lugar «${lugarId}» en ${av.id}`
        ).toBeDefined()
        expect(typeof BIOMAS_TONOS[lugarId]).toBe('number')
      }
    }
  })

  it('todos los enemigos declarados en las 4 aventuras tienen paleta en PALETAS_ENEMIGOS', () => {
    for (const av of Datos.orden) {
      for (const enemigoId of Object.keys(av.enemigos)) {
        expect(
          PALETAS_ENEMIGOS[enemigoId],
          `Falta paleta de enemigo para «${enemigoId}» en ${av.id}`
        ).toBeDefined()
        expect(PALETAS_ENEMIGOS[enemigoId].principal).toBeDefined()
        expect(PALETAS_ENEMIGOS[enemigoId].ojos).toBeDefined()
      }
    }
  })

  it('los NPCs clave de las 4 aventuras tienen paleta en PALETAS_NPCS', () => {
    const npcsClave = [
      'oldo', 'perpetua', 'iseo', 'maruxa', 'heraldo', 'bruna',
      'belthar', 'dorotea', 'torkan', 'aldric', 'sylvana', 'enebro', 'tilo',
    ]
    for (const id of npcsClave) {
      expect(PALETAS_NPCS[id], `Falta paleta para NPC «${id}»`).toBeDefined()
      expect(PALETAS_NPCS[id].piel).toBeDefined()
      expect(PALETAS_NPCS[id].tunica).toBeDefined()
    }
  })

  it('los generadores de textura crean claves sin lanzar errores', () => {
    // Simular objeto de escena Phaser mínimo con textures
    const texturasCargadas = {}
    const mockScene = {
      textures: {
        exists: (key) => !!texturasCargadas[key],
        addCanvas: (key, canvas) => {
          texturasCargadas[key] = canvas
        },
        addSpriteSheet: (key, canvas) => {
          texturasCargadas[key] = canvas
        },
      },
    }

    const texHeroe = crearTexturaHeroe(mockScene, 'enebro')
    expect(texHeroe).toBe('heroe:enebro')
    expect(mockScene.textures.exists('heroe:enebro')).toBe(true)

    const texEnemigo = crearTexturaEnemigo(mockScene, 'cangrejo')
    expect(texEnemigo).toBe('enemigo:cangrejo')
    expect(mockScene.textures.exists('enemigo:cangrejo')).toBe(true)

    const texNpc = crearTexturaNpc(mockScene, 'perpetua')
    expect(texNpc).toBe('npc:perpetua')
    expect(mockScene.textures.exists('npc:perpetua')).toBe(true)
  })
})
