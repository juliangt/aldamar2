# Fase F — Meta-juego: menús, finales, legado y guardado

> **Objetivo:** cerrar el bucle completo: selección de aventura/héroe/
> dificultad, prólogos, los 6 finales de la campaña 1 con sus epílogos,
> guardado/continuar y el **legado persistente** entre aventuras.
> **Hito vertical:** *El Corazón de Ceniza* completo en móvil.
> **Depende de:** Fase E. **Spec maestra:** [../spec_desarrollo.md](../spec_desarrollo.md)

## Alcance

- `MenuScene` real (aventuras, continuar, legado visible).
- `HeroeScene`: tarjeta de héroe, nombre opcional, dificultad.
- `PrologoScene` con `prologo_base` + `prologo_extra` + `texto_fama` (legado).
- `EpilogoScene`: resolución de `final` (§5.6 de la maestra), `muerte`,
  `caida`, sello + jingle de cierre, exportación de legado.
- `Legacy.js` y guardado/continuar completos.

## Tareas

- [ ] `MenuScene`: título + sello pequeño; tarjetas de las 4 aventuras en
      `orden` con `titulo`, `descripcion` y estado (**nueva / continuar /
      completada + nombre del final**). Todas jugables desde el inicio (el
      hilo es de continuidad, no de prerrequisito); el orden recomendado se
      indica visualmente. Panel «Legado» con las banderas activas
      (juramento/grieta) y héroes que ya pasaron.
- [ ] `HeroeScene`: para la aventura elegida, una tarjeta por `personajes`:
      `nombre`, `titulo`, `presentacion` (rasgo incluido), PV/ataque/monedas/
      inventario inicial. Confirmar → **dificultad** (3 tarjetas con
      `nombre` + `descripcion`). Sin teclado: nombre por defecto = `nombre`;
      botón opcional «Cambiar nombre» con rejilla táctil A–Z (máx. 12).
      El prompt `texto_nombre` se muestra como sabor sobre el campo.
- [ ] Sembrar `Rng` al empezar partida (aleatoria; mostrada en pausa).
- [ ] `PrologoScene`: `prologo_base` de la aventura + `prologo_extra` del
      héroe, typewriter, tap avanzar; si hay legado **y** la aventura
      `importa`, añadir `legado.texto_fama`. Al final, `presentacion` del
      héroe y arranque en `lugar_inicial`.
- [ ] `EpilogoScene(tipo)`:
      - `final`: opciones del evento `final` filtradas por `requiere_flag`;
        la base resuelve por grieta vs `umbral_tentado` (puro/tentado), las
        especiales usan su `epilogo` y nombre propio; añade
        `texto_companeros` con `{nombres}`; estilo `epico` (dorado) o
        `aviso` (gris) según la opción.
      - `muerte`: `epilogos.muerte` interpolando `{quien}` del héroe.
      - `caida`: `epilogos.caida`.
      - Cierre: sello + jingle → volver a `MenuScene`.
- [ ] `Legacy.js`: al terminar sin muerte/caída, escribir
      `legado.exporta` (mapear flag→bandera), añadir héroe/nombre a
      `heroes[]` y registrar `finales[aventura] = nombreFinal`
      *(interpretación: también con finales oscuros como la Sombra nueva —
      Apéndice A)*.
- [ ] Importar legado al empezar aventura con `importa`: activa los eventos
      de cadena ya soportados por el `EventEngine` (`casa_llena`,
      `agua_que_cuenta`, `cadena_en_el_vado`, `hilo_gris`,
      `cadena_en_el_molino`, `hilos_en_el_agua`) y el `texto_fama` del prólogo.
- [ ] Guardado: autosave ya existente + «Continuar» operativo (restaurar
      `WorldScene` en `lugar`+`entrada` con todo el `GameState`); al terminar
      una aventura, borrar su save y refrescar el menú.
- [ ] Secretos v1: sprite tocable del **cuervo** en exteriores de la campaña 1
      (`textos` rotatorios + `texto_combate` en batalla; semilla 42 especial).

## Resolución de `final` (algoritmo)

```
al tocar el gatillo final (lugar limpio de enemigos):
  opciones = final.opciones filtradas por requiere_flag (si lo tienen)
  elegir →
    si opción tiene epilogo propio (brindis / reclamar / cera / farera / alianza):
       → epilogo = opción.epilogo ; final = opción.final ; estilo = opción.estilo
    si no (opción base: destruir / agua / salmuera / quebrar):
       → grieta < umbral_tentado ? (epilogo_puro, final_puro)
                                 : (epilogo_tentado, final_tentado)
  añadir texto_companeros({nombres: compañeros vivos})
  exportar legado → borrar save → sello + jingle → menú
```

## Mapeo de datos (los 6 finales de la campaña 1)

| Final | Cómo se alcanza |
|-------|-----------------|
| **Victoria pura** | Destruir el Corazón con grieta < 60. |
| **Victoria compartida** | `promesa` (encargo de Dorotea) + opción «brindis» (requiere flag `promesa`). |
| **Victoria con cicatriz** | Destruir con grieta ≥ 60. |
| **La Sombra nueva** | Opción «reclamar el Corazón» (estilo `aviso`). |
| **La caída** | Grieta 100 en cualquier momento (epílogo `caida`). |
| **La muerte** | PV a 0 en combate (epílogo `muerte`). |

## Entregable jugable (hito vertical)

Desde el menú: elegir *El Corazón de Ceniza* → héroe (p. ej. Ithel) →
dificultad → prólogo → jugar la campaña entera (mapas greybox decorados al
mínimo) → llegar a la Forja → cada una de las 6 rutas de final; después,
empezar *La Brasa de Vegaverde* (datos dev) y ver el `texto_fama` y los
eventos de cadena activos por el legado.

## Criterios de aceptación

- [ ] Los 6 finales alcanzables y con su epílogo correcto (texto, estilo,
      `{nombres}` de compañeros, `{quien}` en muerte).
- [ ] Legado: victoria con `alianza`+`coronado` enciende exactamente esas
      banderas; una partida de Brasa posterior muestra fama y `casa_llena`.
- [ ] Continuar restaura la partida exactamente (lugar, posición, grieta,
      inventario, flags, compañeros) tras cerrar el navegador.
- [ ] Cambiar nombre funciona sin teclado del sistema y se interpola en todos
      los textos (`{nombre}`).
- [ ] Sello + jingle al abrir y en cada cierre de aventura.

## Fuera de alcance (van en...)

Las otras 3 aventuras completas y decorado final de mapas (Fase G) · sus
prólogos/epílogos ya se prueban con sus datos reales en G.
