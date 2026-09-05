# Fase 0 — Cimientos

> **Objetivo:** convertir la plantilla Vite en el esqueleto del juego: arranque
> de Phaser configurado para móvil, datos de `docs/` cargados, clases core
> operativas y la presentación de marca (sello + jingle).
> **Depende de:** nada. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- Limpiar la plantilla Vite y crear la estructura de carpetas (§3.1 de la maestra).
- Config de Phaser móvil-first + escenas mínimas: `Boot → Sello → Menú (stub)`.
- Clases core: `Datos`, `Texto`, `Rng`, `Balance` (esqueleto), `GameState` (esqueleto).
- Jingle 8-bit sintetizado y sello ASCII (versión provisional).

## Tareas

- [ ] `index.html`: título «Aldamar», `viewport-fit=cover`, `theme-color`,
      `touch-action: none`, `user-select: none`; eliminar restos de plantilla.
- [ ] Borrar `src/counter.js`, vaciar `src/main.js` y `src/style.css`
      (quedan solo fondo negro y centrado del canvas).
- [ ] `src/config.js`: `Phaser.Game` con `type: Phaser.AUTO`,
      `width: 480, height: 270`, `pixelArt: true`, `roundPixels: true`,
      `scale: { mode: Phaser.Scale.FIT, autoCenter: CENTER_BOTH }`,
      `input: { activePointers: 3 }`, `fps: { target: 60 }`, lista de escenas.
- [ ] `src/main.js`: `new Phaser.Game(config)` + desbloqueo de AudioContext
      en el primer toque (política de autoplay móvil).
- [ ] `src/core/Datos.js`: importa los 4 JSON de aventuras, `rasgos.json` y
      `dificultades.json` desde `docs/`; expone `aventura(id)`, `lugar(av, id)`,
      `enemigo(av, id)`, `item(av, id)`, `evento(av, id)`, `dialogo(av, key)`,
      `recluta(av, id)`, `rasgo(id)`, `dificultad(id)`, y el listado ordenado
      de aventuras (`orden`).
- [ ] `src/core/Texto.js`: `tpl(texto, ctx)` para `{trato} {nombre} {efectivo}
      {nombres}`; `paginar(texto, ancho, alto)` para la DialogBox;
      `extraerReclutar(texto)` que detecta `(Escribe  reclutar X …)` y devuelve
      `{limpio, reclutaId}` (se usa en la Fase B).
- [ ] `src/core/Rng.js`: mulberry32 (o similar) sembrado; API: `rng.next()`,
      `rng.int(n)`, `rng.chance(p)`, `rng.pick(arr)`, `rng.seed` (getter).
- [ ] `src/core/Balance.js`: carga `dificultades.json`; funciones
      `statJugador(valor, clave, dificultad)`, `statEnemigo(...)`,
      `corrupcion(puntos, dificultad)`, `curacion(puntos, dificultad)`,
      `xp(puntos, dificultad)` con redondeo entero (mín. 1). «camino» = identidad.
- [ ] `src/core/GameState.js`: esqueleto serializable (campos de §8 de la
      maestra) + `nuevaPartida(aventuraId, heroeId, dificultad, semilla)` y
      `serializar()/restaurar()`.
- [ ] `src/scenes/BootScene.js`: carga la fuente pixel y el mínimo imprescindible;
      pasa a `SelloScene`.
- [ ] `src/scenes/SelloScene.js`: dibuja el **sello de Aldamar** en ASCII (héroe
      con el Corazón al pecho y la espada clavada al costado), suena el jingle
      (~2 s, onda cuadrada, composición provisional), tap para saltar; luego
      `MenuScene`.
- [ ] `src/scenes/MenuScene.js` (stub): fondo + título «ALDAMAR» + «Próximamente»;
      valida multitouch y escala en móvil.
- [ ] Fuente: incluir webfont pixel libre (local, sin CDN) y registrarla en
      `BootScene` (`this.load.font` o CSS + `fontFamily`).

## Detalle técnico

- **Carga de datos**: Vite sirve los JSON de `docs/` con `import` estático
  (`import corazon from '../../docs/aventuras/corazon_ceniza.json'`). Verificar
  en la consola que `Datos` ve: 4 aventuras, 39 lugares, 23 enemigos, 3
  dificultades, 3 rasgos.
- **Jingle sintetizado**: clase mínima `Audio8` (oscilador + gain envelope);
  secuencia provisional de 6–8 notas cuadradas. La composición definitiva se
  cierra en la Fase H.
- **Sello ASCII**: `this.add.text` monoespaciado centrado; que quepa en 480×270
  sin recortarse (probado con fuente pixel real, no con la del sistema).

## Mapeo de datos

| Origen | Uso en esta fase |
|--------|------------------|
| `docs/aventuras/*.json` | Solo carga y validación (conteos por consola). |
| `docs/dificultades.json` | `Balance` (funciones, aún sin aplicar). |
| `docs/rasgos.json` | Carga (se aplican en C/D). |

## Entregable jugable

La app abre en un navegador móvil (dev server por LAN): sello ASCII + jingle,
tap → menú stub. Sin errores de consola.

## Criterios de aceptación

- [ ] `npm run dev` accesible desde el móvil; canvas ajustado sin scroll/zoom
      del navegador; safe area respetada.
- [ ] El sello se ve completo y el jingle suena tras el primer toque.
- [ ] Log de datos: 4 aventuras / 39 lugares / 23 enemigos / 3 dificultades.
- [ ] `Texto.tpl('…{trato}…', {trato:'jardinero'})` y `Rng` determinista
      cubiertos por un pequeño script de prueba manual (`npm run dev` + consola).
- [ ] 60 fps estables en el móvil de prueba.

## Fuera de alcance (van en...)

Mapas y jugador (Fase A) · diálogos reales (Fase B) · audio final y SFX (Fase H).
