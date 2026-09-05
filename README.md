# Aldamar 2

[![CI](https://github.com/juliangt/aldamar2/actions/workflows/ci.yml/badge.svg)](https://github.com/juliangt/aldamar2/actions/workflows/ci.yml)

**Aldamar 2** es un RPG táctil 8-bit por turnos para navegador móvil y escritorio, secuela directa de [Aldamar](https://github.com/juliangt/aldamar). Presenta exploración top-down en 39 mapas Tiled, diálogos interactivos, economía y tiendas, compañeros reclutables, combate táctico por turnos con jefes por fases, sistema de corrupción de la Grieta (0–100), audio sintetizado en tiempo real y un meta-sistema de legado persistente entre sus cuatro aventuras.

- **Motor:** [Phaser 4](https://phaser.io) + [Vite](https://vitejs.dev)
- **Audio:** Sintetizador WebAudio procedural 8-bit (cero archivos externos)
- **Arte:** Kenney Tiny Dungeon (CC0 1.0 Universal)
- **Idioma:** Español
- **Enfoque:** Móvil-first (táctil con botones ≥ 48 px, PWA instalable)

---

## Cómo jugar

### Orientación y pantalla
- **Móvil en vertical (agarre natural):** la vista lógica es 270×480; todo el juego (menús, mundo, combate, paneles) se re-organiza para el formato vertical.
- **Móvil en horizontal:** al girar el dispositivo la vista pasa a 480×270 en caliente, sin recargar ni perder la partida (un combate en curso se re-encuadra y continúa).
- **Ordenador:** pantalla completa automática al primer clic (tecla `F` o el botón del menú de pausa para alternarla en cualquier momento).

### En móvil / táctil
- **D-Pad (abajo-izquierda):** Mueve al héroe en 8 direcciones.
- **Botón A (abajo-derecha):** Acción contextual inteligente según la proximidad (Hablar, Coger, Entrar, Atacar).
- **Botón ≡ (arriba-derecha):** Abre el panel de Inventario y Equipo.
- **Botón ⏸ (arriba-derecha):** Menú de Pausa y Opciones de Audio (Silenciar, Control de Volumen, Pantalla completa, Salir guardando).
- **Toque en pantalla:** Avanza diálogos rápidamente y selecciona opciones de menú.

### En ordenador / teclado
- **Moverse:** `W`, `A`, `S`, `D` o `Flechas de dirección`.
- **Acción / Confirmar:** `E`, `Espacio` o `Enter`.
- **Pausa / Cancelar:** `Escape (ESC)`.
- **Pantalla completa:** `F`.

---

## Las Cuatro Aventuras (Sin spoilers)

El juego contiene cuatro aventuras independientes pero encadenadas por el **legado** (las decisiones, finales y juramentos de los héroes trascienden entre partidas):

1. **El Corazón de Ceniza (Campaña I):**
   El viejo mago Belthar confía una reliquia humeante a un héroe de Vegaverde para llevarla al volcán de Umbak antes de que la ceniza consuma los valles.
2. **La Brasa de Vegaverde (Misión I):**
   Una intrusión ahumada en los huertos falros amenaza la cosecha; el guardián Enebro debe investigar la tejera y el colmenar.
3. **La Sal y la Ceniza (Campaña II):**
   En la costa de las salinas, las mareas retroceden ante una sombra ancestral. Las guardianas de la sal deben defender el faro de la Viuda.
4. **La Aguja sin Sombra (Saga III):**
   La ascensión definitiva a la aguja que corona el mundo para encarar a Morvath, tejido de humo, resolviendo el destino de Aldamar.

---

## Características Principales

- **Identidad sonora 8-bit sintetizada:** Jingle del sello al inicio y en cada cierre de aventura, set completo de 10 SFX (diálogo, monedas, golpes, daño, curación, nivel, victoria, derrota, secretos) y pads armónicos atmosféricos por bioma sin assets externos de audio.
- **La Grieta y el Comando Especial:** Cada aventura dispone de un comando único (`corazon`, `marea`, `eco`) que inflige daño devastador a cambio de abrir la grieta. Alcanzar 100 puntos precipita la caída irreversible del héroe.
- **Dificultades Calibradas:**
  - *Paseo por el huerto:* Más vida y monedas, enemigos dóciles, pensada para sumergirse en la historia.
  - *El camino:* El equilibrio clásico con el que fue concebida la aventura.
  - *Yermos de Ceniza:* Enemigos brutales, corrupción despiadada y penalización de curación para veteranos.
- **Ciclo de vida móvil y accesibilidad:** Pausa automática al pasar a segundo plano (`visibilitychange`) eliminando ruidos fantasma, botones táctiles con áreas de interacción ≥ 48 px e interfaz optimizada a 60 fps.
- **Orientación adaptativa:** vista vertical (270×480) u horizontal (480×270) detectada de forma nativa; al girar el dispositivo todas las escenas se re-encuadran en caliente (el combate re-organiza héroes/enemigos/botones, los diálogos re-paginan su texto pendiente) y en escritorio el juego pide pantalla completa al primer gesto.

---

## Créditos y Licencias

- **Diseño de juego, narrativa y programación:** Secuela y expansión del universo de [Aldamar](https://github.com/juliangt/aldamar).
- **Sprites y Tileset:** Kenney ([Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)), bajo licencia de Dominio Público [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- **Tipografía:** *Press Start 2P* por CodeMan38, bajo licencia [SIL Open Font License](http://scripts.sil.org/OFL).
- **Música y Efectos Sonoros:** Generados proceduralmente en el cliente con WebAudio API.

---

## Desarrollo e Instalación

```bash
# Clonar el repositorio
git clone git@github.com:juliangt/aldamar2.git
cd aldamar2

# Instalar dependencias
npm install

# Servidor local de desarrollo
npm run dev

# Ejecutar suite de pruebas unitarias
npm test

# Compilación para producción
npm run build

# Vista preview de producción
npm run preview
```
