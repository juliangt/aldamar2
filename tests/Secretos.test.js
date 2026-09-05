import { describe, it, expect, beforeEach } from 'vitest'
import Datos from '../src/core/Datos.js'
import { GameState } from '../src/core/GameState.js'

describe('Secretos completos por aventura (Fase G)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('1. Corazón de Ceniza: Cuervo (semilla 42)', () => {
    const av = Datos.aventura('corazon_ceniza')
    const sec = av.secretos?.cuervo

    it('define el secreto del cuervo', () => {
      expect(sec).toBeDefined()
      expect(sec.comando).toBe('cuervo')
      expect(sec.textos.length).toBe(3)
      expect(sec.texto_combate).toContain('Un cuervo planea sobre el combate')
      expect(sec.semillas?.['42']).toContain('pluma plateada')
    })

    it('los textos del cuervo rotan secuencialmente y ciclan', () => {
      const gs = new GameState()
      gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino')
      gs.npcVistos = {}

      const idx0 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
      expect(idx0).toBe(0)
      gs.npcVistos['secreto:cuervo'] = idx0 + 1

      const idx1 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
      expect(idx1).toBe(1)
      gs.npcVistos['secreto:cuervo'] = idx1 + 1

      const idx2 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
      expect(idx2).toBe(2)
      gs.npcVistos['secreto:cuervo'] = idx2 + 1

      const idx3 = (gs.npcVistos['secreto:cuervo'] || 0) % sec.textos.length
      expect(idx3).toBe(0)
    })

    it('semilla 42 activa el texto de la pluma plateada', () => {
      const gs = new GameState()
      gs.nuevaPartida('corazon_ceniza', 'tilo', 'camino', 42)
      expect(sec.semillas?.['42']).toContain('pluma plateada')
    })
  })

  describe('2. La Brasa de Vegaverde: Abejas (semilla 20)', () => {
    const av = Datos.aventura('brasa_vegaverde')
    const sec = av.secretos?.abejas

    it('define el secreto de las abejas', () => {
      expect(sec).toBeDefined()
      expect(sec.comando).toBe('abejas')
      expect(sec.textos.length).toBe(3)
      expect(sec.texto_combate).toContain('Un zumbido furioso')
      expect(sec.semillas?.['20']).toContain('abeja reina')
      expect(sec.semillas?.['20']).toContain('cera virgen')
    })

    it('los textos de abejas rotan y ciclan', () => {
      const gs = new GameState()
      gs.nuevaPartida('brasa_vegaverde', 'enebro', 'camino')
      gs.npcVistos = {}

      const idx0 = (gs.npcVistos['secreto:abejas'] || 0) % sec.textos.length
      expect(idx0).toBe(0)
      expect(sec.textos[idx0]).toContain('rumor dorado')
      gs.npcVistos['secreto:abejas'] = idx0 + 1

      const idx1 = (gs.npcVistos['secreto:abejas'] || 0) % sec.textos.length
      expect(idx1).toBe(1)
      expect(sec.textos[idx1]).toContain('colmenar viejo')
    })

    it('semilla 20 activa el texto especial del ámbar y cera', () => {
      const gs = new GameState()
      gs.nuevaPartida('brasa_vegaverde', 'enebro', 'camino', 20)
      expect(sec.semillas?.['20']).toContain('veinte primaveras')
    })
  })

  describe('3. La Sal y la Ceniza: Gaviota (semilla 40)', () => {
    const av = Datos.aventura('sal_y_ceniza')
    const sec = av.secretos?.gaviota

    it('define el secreto de la gaviota', () => {
      expect(sec).toBeDefined()
      expect(sec.comando).toBe('gaviota')
      expect(sec.textos.length).toBe(3)
      expect(sec.texto_combate).toContain('Una gaviota sobrevuela la pelea')
      expect(sec.semillas?.['40']).toContain('concha marina')
    })

    it('los textos de gaviota rotan y ciclan', () => {
      const gs = new GameState()
      gs.nuevaPartida('sal_y_ceniza', 'bruna', 'camino')
      gs.npcVistos = {}

      const idx0 = (gs.npcVistos['secreto:gaviota'] || 0) % sec.textos.length
      expect(idx0).toBe(0)
      expect(sec.textos[idx0]).toContain('gaviota de ojos claros')
    })

    it('semilla 40 activa el texto de cuarenta inviernos', () => {
      const gs = new GameState()
      gs.nuevaPartida('sal_y_ceniza', 'bruna', 'camino', 40)
      expect(sec.semillas?.['40']).toContain('cuarenta inviernos')
    })
  })

  describe('4. La Aguja sin Sombra: Campanilla (semilla 100)', () => {
    const av = Datos.aventura('aguja_sin_sombra')
    const sec = av.secretos?.campanilla

    it('define el secreto de la campanilla', () => {
      expect(sec).toBeDefined()
      expect(sec.comando).toBe('campanilla')
      expect(sec.textos.length).toBe(3)
      expect(sec.texto_combate).toContain('Haces sonar la campanilla')
      expect(sec.semillas?.['100']).toContain('cien campanadas')
    })

    it('los textos de campanilla rotan y ciclan', () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'renco', 'camino')
      gs.npcVistos = {}

      const idx0 = (gs.npcVistos['secreto:campanilla'] || 0) % sec.textos.length
      expect(idx0).toBe(0)
      expect(sec.textos[idx0]).toContain('tañido puro y hondo')
    })

    it('semilla 100 activa el texto de cien campanadas', () => {
      const gs = new GameState()
      gs.nuevaPartida('aguja_sin_sombra', 'renco', 'camino', 100)
      expect(sec.semillas?.['100']).toContain('cien campanadas')
    })
  })
})
