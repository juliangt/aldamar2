# [Feature]: Minimapa translúcido en esquina con indicadores de navegación y toggle en configuraciones

## Resumen
Implementar un mapa miniatura (minimapa) en pantalla durante la exploración de lugares (`WorldScene`), ubicado en una de las esquinas con leve transparencia para facilitar la navegación y orientación del jugador hacia sus objetivos y salidas. El minimapa debe contar con una opción en el menú de pausa/configuraciones para activarse o desactivarse a voluntad, estando **activado por defecto**.

---

## 1. Contexto y Justificación
En *Aldamar 2*, el jugador explora 39 mapas Tiled con una cámara que sigue al protagonista a zoom 2x (`aplicarRes(this, 2)`). Al estar la vista encuadrada en el entorno inmediato del héroe, en mapas grandes o laberínticos (como mazmorras, bosques o cavernas) el jugador puede desorientarse fácilmente respecto a:
- La posición actual dentro del recinto completo.
- La ubicación de las salidas cardinales (N, S, E, O) y transiciones hacia otras zonas.
- Los puntos de interés y personajes con los que interactuar (PNJs, fogatas de descanso, cofres o gatillos).

Un minimapa estilizado y semitransparente resuelve este problema cognitivo sin sobrecargar la pantalla ni romper la estética retro 8-bit.

---

## 2. Requerimientos Funcionales

### RF-01: Visualización y Ubicación
- **Posición en esquina:** El minimapa debe ubicarse en una esquina de la pantalla que no obstaculice el HUD ni los controles táctiles existentes:
  - En modo horizontal (480×270): Esquina superior derecha (debajo o al costado de los botones de Menú/Pausa) o esquina inferior adaptativa.
  - En modo vertical (270×480): Esquina superior derecha despejada debajo del botón de pausa, o cuadrante optimizado según el layout adaptativo.
- **Transparencia sutil:** Fondo semitransparente (ej. `0x0c1017` con opacidad `alpha: 0.7 - 0.8`), con borde de 1 px (`0x556070` o acorde a la paleta del tema). Los elementos de juego que transcurran por debajo deben ser parcialmente visibles.
- **Estética retro:** Representación esquemática a escala proporcional del mapa activo (ancho × alto del `Tilemap`).

### RF-02: Orientación y Navegación ("Hacia dónde dirigirse")
- **Posición del jugador:** Marcador visible y contrastado (punto verde/blanco parpadeante o flecha sutil) que refleje en tiempo real la posición del protagonista `(x, y)`.
- **Salidas y transiciones:** Marcadores destacados (puntos dorados/ámbar `●` o indicadores de puerta) en las coordenadas de las salidas (`datosSalidas`), permitiendo al usuario saber en qué dirección caminar para salir o avanzar.
- **Puntos clave de interacción (opcional / fase 2):** Marcadores para NPCs importantes (azul/cian) y zonas de descanso/fogatas (naranja cálido).

### RF-03: Configuración y Toggle
- **Interruptor en Menú de Pausa (`PausaUI`):**
  - Agregar un botón accesible con hit area ≥ 48 px en el panel de pausa:
    - Estado activo: `MINIMAPA: ACTIVADO`
    - Estado inactivo: `MINIMAPA: DESACTIVADO`
  - Al presionarlo, emitir sonido de confirmación (`audio8.sfx('confirmar')`), conmutar el estado y actualizar el texto del botón.
  - El minimapa debe ocultarse/mostrarse de manera inmediata en la escena de mundo/UI.
- **Activado por defecto:** Al iniciar una nueva partida o abrir el juego por primera vez, el minimapa debe estar **encendido** (`true`).
- **Persistencia:** Guardar la preferencia en `localStorage` bajo la clave `aldamar:opciones:minimapa` (o esquema unificado de configuración) para que se conserve entre sesiones y cambios de escena.

### RF-04: Soporte Multiorientación (`relayout`)
- Compatible con el sistema de resolución dinámica (`VISTA_VERTICAL` 270×480 ⇄ `VISTA_HORIZONTAL` 480×270) vía suscripción a `alRelayout(this, ...)`.
- No deformar el ratio de aspecto del mapa al girar la pantalla.

---

## 3. Requerimientos No Funcionales y UX

- **Rendimiento móvil:** No recalcular capas completas en cada frame. Cachear la silueta estática del mapa (paredes/obstáculos) en una textura previa o `RenderTexture` al cargar la escena, actualizando únicamente los marcadores dinámicos (jugador y eventos).
- **Accesibilidad táctil:** El minimapa no debe capturar clics o eventos de puntero (`input.enabled = false` / `setInteractive(false)`), para que cualquier tap debajo de él continúe interactuando con el juego.
- **Sin colisión con controles:** Respetar los espacios reservados para:
  - HUD superior izquierdo: PV, Ataque/Defensa, Monedas, Barra de Grieta (y=8 a 60).
  - D-Pad táctil inferior izquierdo: radio 56 px.
  - Botón de Acción inferior derecho: radio 44 px.
  - Botones de Pausa y Menú superiores derechos: y=28 px.

---

## 4. Propuesta Técnica y Arquitectura

### Archivos a crear / modificar:

1. **Nuevo componente UI:** `src/ui/MinimapaUI.js`
   - Recibe la referencia de la escena (`UiScene` o `WorldScene`) y los límites del mapa (`mapa.widthInPixels`, `mapa.heightInPixels`).
   - Genera el contenedor gráfico con fondo, borde y marcadores.
   - Provee métodos `actualizar(jugadorX, jugadorY)`, `setVisible(visible)`, `relayout()` y `destruir()`.

2. **Gestión de Configuración:** `src/core/configuracion.js` (o integración en `PausaUI.js`)
   - Métodos para leer y escribir `minimapaHabilitado`:
     ```js
     const CLAVE_MINIMAPA = 'aldamar:opciones:minimapa'
     export function obtenerMinimapaHabilitado() {
       if (typeof localStorage === 'undefined') return true
       const v = localStorage.getItem(CLAVE_MINIMAPA)
       return v === null ? true : v === '1'
     }
     export function guardarMinimapaHabilitado(valor) {
       if (typeof localStorage !== 'undefined') {
         localStorage.setItem(CLAVE_MINIMAPA, valor ? '1' : '0')
       }
     }
     ```

3. **Modificación de `src/ui/PausaUI.js`:**
   - Incorporar `btnMinimapa` en el panel de pausa entre las opciones de configuración (junto al botón de Audio y Pantalla Completa).
   - Conectar callback `onMinimapaToggle(nuevoEstado)` hacia `UiScene`.
   - Reajustar alturas en `relayout()` del panel de pausa para acomodar la nueva opción manteniendo hit areas de 48 px.

4. **Modificación de `src/scenes/UiScene.js` & `src/scenes/WorldScene.js`:**
   - Instanciar `MinimapaUI` durante el arranque de la UI si la escena actual es de exploración.
   - En el loop de actualización (`update`), actualizar la coordenada del jugador en el minimapa.
   - Conectar el evento de cambio de configuración para mostrar/ocultar el minimapa.

---

## 5. Criterios de Aceptación (Definition of Done)

- [ ] **Visibilidad inicial:** Al cargar cualquier lugar de una aventura (ej. Vegaverde, Monte Umbak), el minimapa aparece visible en la esquina designada por defecto.
- [ ] **Transparencia:** El fondo del minimapa tiene opacidad reducida permitiendo ver la acción o terreno de fondo.
- [ ] **Navegación:**
  - [ ] El punto del jugador se desplaza fielmente en proporción a la posición real en el mapa.
  - [ ] Las salidas del mapa están claramente señaladas en sus respectivas ubicaciones cardinales/puertas.
- [ ] **Menú de pausa:**
  - [ ] El menú de pausa contiene el botón para alternar el minimapa (`MINIMAPA: ACTIVADO` / `MINIMAPA: DESACTIVADO`).
  - [ ] Al desactivarlo, el minimapa desaparece de inmediato de la pantalla de juego.
  - [ ] Al reactivarlo, reaparece en su posición correcta sin artefactos gráficos.
- [ ] **Persistencia:** Al recargar la página o cambiar de lugar/escena, se respeta la última preferencia guardada en `localStorage`.
- [ ] **Adaptabilidad:** Al cambiar la orientación de la ventana (horizontal ⇄ vertical), el minimapa se reposiciona correctamente sin solaparse con botones táctiles ni salirse de pantalla.
- [ ] **Tests:** Cobertura de tests unitarios agregada en `tests/unit/MinimapaUI.test.js` y `tests/unit/PausaUI.test.js`.
