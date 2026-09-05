# Fase H — Pulido, audio, rendimiento y balance

> **Objetivo:** de «jugable» a «publicable»: identidad sonora completa,
> rendimiento móvil verificado, dificultades calibradas, protocolo de
> playtesting documentado y build de producción.
> **Depende de:** Fase G. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- Audio final: jingle, SFX set, (opcional) ambientes mínimos por bioma.
- Calibración: XP/niveles (§5.5), fórmulas del comando especial, huida,
  precios/enemigos por dificultad.
- Rendimiento y accesibilidad táctil en dispositivos reales.
- `docs/playtesting.md` (protocolo) y reportes de balance.
- Build de producción y despliegue estático.

## Tareas

### Audio
- [x] Cerrar la composición del **jingle** (~2 s, 8-bit) del sello (aparece
      al abrir y en cada cierre, victoria o desgracia).
- [x] Set de SFX sintetizados: texto de diálogo (tick suave), confirmar,
      moneda, golpe, daño recibido, curación, nivel, victoria, derrota,
      secreto. Volumen maestro + toggle en opciones (desde el menú pausa).
- [x] (Opcional, si el presupuesto de tiempo lo permite) ambiente mínimo por
      bioma: un pad de 2–3 notas en loop muy bajo. Nada de assets externos.

### Calibración (cierra el Apéndice A de la maestra)
- [x] Validar contra el Python original: fórmula del comando especial,
      `cada_n_turnos`, ticks de veneno, huida, cuerno, respawn de enemigos,
      precio mínimo con Lengua de mercado. Documentar divergencias decididas.
- [x] Pasada de XP: con las XP totales disponibles de cada aventura (sumando
      respawns razonables), ajustar la curva de niveles (30×n) y los +PV/+ataque.
- [x] Pasada por dificultad: «paseo» debe permitir ver la historia con
      comodidad; «ceniza» debe doler en los jefes (Custodio, Viuda, Morvath).
- [x] Crear **`docs/playtesting.md`**: protocolo (rutas de prueba por
      aventura, decisiones a cubrir, semillas de secretos, qué medir:
      muertes, grieta final, nivel alcanzado, monedas sobrantes) y plantilla
      de reporte.

### Rendimiento y móvil
- [x] Perfilado en dispositivo real gama media: 60 fps con 3 enemigos +
      compañeros; cargar mapas sin saltos (precarga en fade).
- [x] Atlas único de sprites si hay muchos frames sueltos; texto del HUD sin
      re-render por frame (solo al cambiar).
- [x] Accesibilidad táctil: botones ≥ 48 px, nada bajo safe areas, d-pad
      cómodo en pantallas pequeñas; probar con una mano.
- [x] Ciclo de vida móvil: pausa al pasar a segundo plano
      (`visibilitychange`), sin audio fantasma, reanudar sin perder estado.

### Build y entrega
- [x] `vite build` limpio; tamaño total razonable (< ~2 MB sin contar mapas).
- [x] Despliegue estático ( cualquier hosting de ficheros) + prueba en el
      móvil desde el URL final, con manifesto/PWA básico si se desea
      «instalable» (opcional).
- [x] Quitar la `ArenaScene` y el botón dev del build de producción
      (tras cerrar el balance).
- [x] README de jugador: cómo jugar, créditos de assets (Kenney CC0),
      aviso de lore sin spoilers.

## Criterios de aceptación (RC)

- [x] Build de producción jugable en un móvil real, de sello a sello, sin
      errores de consola ni caídas de fps visibles.
- [x] Jingle y SFX presentes con toggle de volumen; el audio arranca tras el
      primer toque en iOS/Android.
- [x] Tres partidas de playtesting completas registradas (una por
      dificultad) en `docs/playtesting.md` con los ajustes derivados
      aplicados o descartados por escrito.
- [x] Todos los puntos del Apéndice A de la spec maestra cerrados
      (validados o decididos explícitamente).
- [x] Las 4 aventuras y los 6 finales de la campaña 1 verificados en el
      build final.

## Definición de terminado (recordatorio de la maestra)

Las 4 aventuras jugables de prólogo a epílogo en móvil real · eventos,
finales, legado y secretos según spec · dificultadas distinguibles en
playtesting · sello + jingle al abrir y cerrar · guardado/continuar · build
estática desplegable.
