# Dosaldamar

[![CI](https://github.com/juliangt/aldamar2/actions/workflows/ci.yml/badge.svg)](https://github.com/juliangt/aldamar2/actions/workflows/ci.yml)

RPG por turnos estilo retro para navegador, remake del juego de texto original *Dosaldamar*. Exploración top-down, diálogos con reclutamiento de compañeros, inventario y economía, combate por turnos con jefes por fases, y un sistema de corrupción («la grieta») que castiga el abuso del comando especial.

- **Motor:** [Phaser 4](https://phaser.io) + [Vite](https://vitejs.dev)
- **Estado:** en desarrollo por fases (ver [Roadmap](#roadmap))
- **Idioma:** español

## Requisitos

- Node.js >= 20
- npm

## Instalación y ejecución

```bash
git clone git@github.com:juliangt/aldamar2.git
cd aldamar2
npm install
```

| Comando           | Qué hace                                            |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en caliente       |
| `npm run build`   | Build de producción en `dist/`                      |
| `npm run preview` | Sirve el build de producción en local               |
| `npm test`        | Ejecuta la batería de tests (Vitest)                |
| `npm run test:watch` | Vitest en modo watch                             |

## Estructura del proyecto

```
src/
  core/     Núcleo puro del juego, sin Phaser (testeable directamente)
    GameState.js   Estado serializable de la partida (save en localStorage)
    Combate.js     Motor de turnos: emite eventos que la escena anima
    Datos.js       Acceso al contenido JSON (única fuente de verdad)
    Balance.js     Multiplicadores por dificultad
    Rng.js         RNG determinista (mulberry32) sembrado por partida
    Texto.js       Plantillas, paginado y comandos heredados
    Audio8.js      Sonido chiptune
  scenes/   Escenas Phaser (Boot, Menu, World, Ui, Sello…)
  ui/       Componentes de interfaz (DialogBox, InventarioUI, TiendaUI…)
docs/
  aventuras/  Contenido por aventura: lugares, enemigos, ítems, diálogos…
  rasgos.json     Rasgos de personaje con efecto en juego
  dificultades.json  Multiplicadores de balance por dificultad
specs/
  spec_desarrollo.md  Spec maestra del juego
  fases/              Diseño detallado de cada fase (0–H)
tests/     Batería de tests Vitest del núcleo
```

## Arquitectura

- **Núcleo puro / presentación.** Todo en `src/core/` es JavaScript sin Phaser: la lógica de combate, estado e interpolación se puede probar con tests unitarios sin navegador. Las escenas (`src/scenes/`) traducen los «eventos» que emite `Combate` en animaciones y UI.
- **RNG determinista.** Cada partida lleva una semilla (`Rng`) que alimenta todos los sorteos; el combate acepta un RNG inyectado, lo que hace los tests reproducibles.
- **Contenido en JSON.** Aventuras completas (personajes, enemigos, diálogos, tiendas, eventos) viven en `docs/aventuras/*.json` y se resuelven siempre en el ámbito de la aventura activa vía `Datos`.
- **Dificultades.** `paseo`, `camino` (el balance con el que se escribió cada aventura) y `ceniza`, con multiplicadores aplicados en `Balance`.
- **Guardado.** `GameState` se serializa a `localStorage` bajo `aldamar:save:<aventura>`.

## Roadmap

Desarrollo dividido en fases (detalle en `specs/fases/`):

| Fase | Contenido | Estado |
| ---- | --------- | ------ |
| 0 | Cimientos (Vite, Phaser, bucle, fuentes) | ✅ |
| A | Mapa y movimiento top-down | ✅ |
| B | Diálogos e interacción con PNJs | ✅ |
| C | Inventario y economía | ✅ |
| D | Combate por turnos | ✅ |
| E | Eventos y corrupción | 🚧 |
| F | Metajuego | ⬜ |
| G | Contenido completo | ⬜ |
| H | Pulido final | ⬜ |

## Desarrollo

Los tests cubren el núcleo puro (`src/core/`) con Vitest:

```bash
npm test
```

Cada push a `main` y cada PR ejecutan la CI de GitHub Actions (tests, build y validación de los JSON de contenido): ver pestaña *Actions*.

## Licencia

Sin licencia definida por ahora; todo el código y contenido son del autor del repositorio.
