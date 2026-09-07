// Navegación — helpers de transición entre escenas compartidos por
// World, Battle y Ui: precarga del spritesheet del héroe y salida del
// mundo (corta Ui+World y arranca la escena de destino).

import heroePng from '../assets/heroe.png'

// El spritesheet del héroe lo precargan WorldScene y BattleScene.
export function cargarHeroe(escena) {
  if (!escena.textures.exists('heroe'))
    escena.load.spritesheet('heroe', heroePng, {
      frameWidth: 16,
      frameHeight: 16,
    })
}

// Salir del mundo hacia otra escena (Epílogo, Menu…): corta las capas
// paralelas Ui/World y arranca el destino con su payload.
export function salirDelMundo(escena, clave, datos = {}) {
  escena.scene.stop('Ui')
  escena.scene.stop('World')
  escena.scene.start(clave, datos)
}
